//! Spike #990 harness: how a per-client message rate cap behaves on simulator-like traffic.
//!
//! `cargo test --release socket_rate_cap::bench -- --ignored --nocapture --test-threads=1`
//!
//! * `cap_staleness`: feeds ~2,900 msgs/s across 900 topics with skewed per-topic rates
//!   through each policy in virtual time and reports msgs/s delivered, per-topic
//!   worst-case staleness and topics starved. One client is simulated: every client
//!   gets the same stream today, so their buckets make the same decisions once they
//!   have all saturated (see `buckets_of_clients_synchronize`).
//! * `emit_cost`: wall-clock cost of one live message to 15 dummy sockets, broadcast
//!   vs the capped path vs one emit per socket.

use super::{BURST_SECS, ClientRateCap, TokenBucket};
use std::time::{Duration, Instant};

/// Simulated seconds; the first `WARM` are not measured.
const END: f64 = 125.0;
const WARM: f64 = 5.0;

struct Class {
    name: &'static str,
    count: usize,
    hz: f64,
    /// Topics published back to back as one frame in the bursty arrival pattern.
    frame: usize,
}

/// 900 topics, ~2,894 msgs/s. The 255 BMS per-cell topics (510 msgs/s) stand in for
/// what the BMS page reads.
const CLASSES: [Class; 6] = [
    Class {
        name: "fast 100Hz",
        count: 10,
        hz: 100.0,
        frame: 10,
    },
    Class {
        name: "med 20Hz",
        count: 30,
        hz: 20.0,
        frame: 10,
    },
    Class {
        name: "BMS cells 2Hz",
        count: 255,
        hz: 2.0,
        frame: 255,
    },
    Class {
        name: "5Hz",
        count: 120,
        hz: 5.0,
        frame: 10,
    },
    Class {
        name: "1Hz",
        count: 150,
        hz: 1.0,
        frame: 10,
    },
    Class {
        name: "slow 0.1Hz",
        count: 335,
        hz: 0.1,
        frame: 10,
    },
];
const BMS_CLASS: usize = 2;

/// splitmix64, so runs are reproducible without a `rand` dependency.
struct Rng(u64);
impl Rng {
    fn next_f64(&mut self) -> f64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^= z >> 31;
        (z >> 11) as f64 / (1u64 << 53) as f64
    }
    /// Uniform in [-1, 1).
    fn sym(&mut self) -> f64 {
        self.next_f64() * 2.0 - 1.0
    }
}

#[derive(Clone, Copy)]
enum Arrival {
    /// Each topic on its own random phase, ±10% jitter per message.
    Jittered,
    /// Topics published in fixed-order frames (10 µs apart), as CAN frames and the
    /// BMS cell sweep arrive; ±2% jitter per frame.
    Bursty,
}

/// (time s, topic index), sorted by time; plus each topic's class index.
fn traffic(arrival: Arrival, seed: u64) -> (Vec<(f64, u32)>, Vec<usize>) {
    let mut rng = Rng(seed);
    let mut events = Vec::new();
    let mut class_of = Vec::new();
    for (ci, class) in CLASSES.iter().enumerate() {
        let period = 1.0 / class.hz;
        let first = class_of.len();
        class_of.extend(std::iter::repeat_n(ci, class.count));
        match arrival {
            Arrival::Jittered => {
                for topic in first..first + class.count {
                    let phase = rng.next_f64() * period;
                    let mut k = 0.0;
                    while phase + k * period < END {
                        let t = phase + k * period + rng.sym() * 0.1 * period;
                        if (0.0..END).contains(&t) {
                            events.push((t, topic as u32));
                        }
                        k += 1.0;
                    }
                }
            }
            Arrival::Bursty => {
                for start in (first..first + class.count).step_by(class.frame) {
                    let end = (start + class.frame).min(first + class.count);
                    let phase = rng.next_f64() * period;
                    let mut k = 0.0;
                    while phase + k * period < END {
                        let t0 = phase + k * period + rng.sym() * 0.02 * period;
                        for (i, topic) in (start..end).enumerate() {
                            let t = t0 + i as f64 * 10e-6;
                            if (0.0..END).contains(&t) {
                                events.push((t, topic as u32));
                            }
                        }
                        k += 1.0;
                    }
                }
            }
        }
    }
    events.sort_by(|a, b| a.0.total_cmp(&b.0));
    (events, class_of)
}

#[derive(Clone, Copy)]
enum Policy {
    None,
    /// Token bucket per client: msgs/s, burst seconds.
    Cap(u32, f64),
    /// `SOCKET_DISCARD_PERCENT`'s rolling counter.
    Discard(u8),
    /// Latest value per topic, flushed every window (a stand-in for #989).
    Conflate(f64),
}

impl Policy {
    fn label(self) -> String {
        match self {
            Policy::None => "no cap".into(),
            Policy::Cap(r, b) => format!("cap {r}/s burst {b}s"),
            Policy::Discard(p) => format!("discard {p}%"),
            Policy::Conflate(w) => format!("latest/topic {}ms", (w * 1000.0) as u32),
        }
    }
}

/// (delivered at s, source time s, topic), in delivery order.
fn deliver(policy: Policy, events: &[(f64, u32)], topics: usize) -> Vec<(f64, f64, u32)> {
    let at = |base: Instant, t: f64| base + Duration::from_secs_f64(t);
    match policy {
        Policy::None => events.iter().map(|&(t, p)| (t, t, p)).collect(),
        Policy::Cap(rate, burst) => {
            let base = Instant::now();
            let mut bucket = TokenBucket::new(rate, burst, base);
            events
                .iter()
                .filter(|(t, _)| bucket.try_take(at(base, *t)))
                .map(|&(t, p)| (t, t, p))
                .collect()
        }
        Policy::Discard(pct) => {
            let mut counter = 0u8;
            events
                .iter()
                .filter(|_| {
                    counter = (counter + 1) % 100;
                    counter >= pct
                })
                .map(|&(t, p)| (t, t, p))
                .collect()
        }
        Policy::Conflate(window) => {
            let mut latest: Vec<Option<f64>> = vec![None; topics];
            let mut out = Vec::new();
            let mut flush_at = window;
            let flush = |until: f64, latest: &mut Vec<Option<f64>>, out: &mut Vec<_>| {
                for (p, slot) in latest.iter_mut().enumerate() {
                    if let Some(src) = slot.take() {
                        out.push((until, src, p as u32));
                    }
                }
            };
            for &(t, p) in events {
                while t >= flush_at {
                    flush(flush_at, &mut latest, &mut out);
                    flush_at += window;
                }
                latest[p as usize] = Some(t);
            }
            flush(flush_at, &mut latest, &mut out);
            out
        }
    }
}

fn pct(sorted: &[f64], p: f64) -> f64 {
    sorted[((sorted.len() - 1) as f64 * p).round() as usize]
}

/// Per topic: deliveries in the measured window, and the worst age of the value on
/// screen (time since the source time of the last delivered value; nothing delivered
/// yet counts from connect at t=0).
fn staleness(deliveries: &[(f64, f64, u32)], topics: usize) -> (Vec<u32>, Vec<f64>) {
    let mut last_src = vec![0.0f64; topics];
    let mut worst = vec![0.0f64; topics];
    let mut count = vec![0u32; topics];
    for &(d, src, p) in deliveries {
        let p = p as usize;
        if (WARM..END).contains(&d) {
            worst[p] = worst[p].max(d - last_src[p]);
            count[p] += 1;
        }
        last_src[p] = last_src[p].max(src);
    }
    for p in 0..topics {
        worst[p] = worst[p].max(END - last_src[p]);
    }
    (count, worst)
}

fn run(arrival: Arrival, name: &str) {
    let (events, class_of) = traffic(arrival, 990);
    let topics = class_of.len();
    let secs = END - WARM;
    let in_window = events.iter().filter(|(t, _)| *t >= WARM).count();
    println!(
        "\nCAP == arrival {name}: {topics} topics, {:.0} msgs/s in ==",
        in_window as f64 / secs
    );
    let policies = [
        Policy::None,
        Policy::Cap(1000, BURST_SECS),
        Policy::Cap(500, BURST_SECS),
        Policy::Cap(500, 1.0),
        Policy::Discard(83),
        Policy::Conflate(0.1),
        Policy::Conflate(0.5),
        Policy::Conflate(1.0),
    ];
    println!(
        "CAP {:<22} {:>8} {:>8} {:>8} {:>8} {:>9}",
        "policy", "msgs/s", "BMS/s", "starved", "stale>5s", ">10x per"
    );
    let mut per_class = Vec::new();
    for policy in policies {
        let out = deliver(policy, &events, topics);
        let delivered = out.iter().filter(|(d, ..)| *d >= WARM && *d < END).count();
        let bms = out
            .iter()
            .filter(|(d, _, p)| *d >= WARM && *d < END && class_of[*p as usize] == BMS_CLASS)
            .count();
        let (count, worst) = staleness(&out, topics);
        let starved = count.iter().filter(|c| **c == 0).count();
        let over5 = worst.iter().filter(|w| **w > 5.0).count();
        let over10x = (0..topics)
            .filter(|p| worst[*p] > 10.0 / CLASSES[class_of[*p]].hz)
            .count();
        println!(
            "CAP {:<22} {:>8.0} {:>8.0} {:>8} {:>8} {:>9}",
            policy.label(),
            delivered as f64 / secs,
            bms as f64 / secs,
            starved,
            over5,
            over10x
        );
        per_class.push((policy, count, worst));
    }
    println!("CAP -- worst staleness per topic (s): p50 / p99 / max across the class, starved --");
    for (ci, class) in CLASSES.iter().enumerate() {
        println!(
            "CAP [{}] {} topics, period {:.2}s",
            class.name,
            class.count,
            1.0 / class.hz
        );
        for (policy, count, worst) in &per_class {
            let mut w: Vec<f64> = (0..topics)
                .filter(|p| class_of[*p] == ci)
                .map(|p| worst[p])
                .collect();
            w.sort_by(f64::total_cmp);
            let starved = (0..topics)
                .filter(|p| class_of[*p] == ci && count[*p] == 0)
                .count();
            println!(
                "CAP     {:<22} {:>7.2} {:>7.2} {:>7.2}  starved {:>3}",
                policy.label(),
                pct(&w, 0.5),
                pct(&w, 0.99),
                w[w.len() - 1],
                starved
            );
        }
    }
}

#[test]
#[ignore = "benchmark"]
fn cap_staleness() {
    run(Arrival::Jittered, "jittered (random phase per topic)");
    run(Arrival::Bursty, "bursty (fixed-order frames)");
}

/// Every client gets the same stream today, so do the buckets of clients that
/// connected at different times end up making the same decisions (one broadcast), or
/// split them (one emit per socket)?
#[test]
#[ignore = "benchmark"]
fn client_buckets_split_decisions() {
    let (events, _) = traffic(Arrival::Jittered, 7);
    let base = Instant::now();
    for rate in [500, 1000] {
        let mut cap = ClientRateCap::new(rate, BURST_SECS);
        let (mut all, mut none, mut some) = (0u32, 0u32, 0u32);
        for &(t, _) in &events {
            let now = base + Duration::from_secs_f64(t);
            // clients connect at t=0, 1.0003 s and 2.7 s
            let clients: &[u8] = match t {
                t if t < 1.0003 => &[1],
                t if t < 2.7 => &[1, 2],
                _ => &[1, 2, 3],
            };
            let admission = cap.admit(clients, now);
            if t < 5.0 {
                continue;
            }
            match admission {
                super::Admission::All => all += 1,
                super::Admission::None => none += 1,
                super::Admission::Some(_) => some += 1,
            }
        }
        let n = f64::from(all + none + some);
        println!(
            "SPLIT cap {rate}/s, 3 clients: all {:.1}%  none {:.1}%  subset {:.1}% (subset = per-socket emits)",
            100.0 * f64::from(all) / n,
            100.0 * f64::from(none) / n,
            100.0 * f64::from(some) / n
        );
    }
}

mod emit_cost {
    use crate::ClientData;
    use crate::socket_handler::DataSender;
    use socketioxide::SocketIo;
    use socketioxide::extract::SocketRef;
    use std::time::{Duration, Instant};

    const CLIENTS: usize = 15;
    const EMITS: usize = 20_000;

    fn data() -> ClientData {
        ClientData {
            run_id: 1,
            name: "BMS/PerCell/Alpha/3/Volts/7".to_string(),
            unit: "V".to_string(),
            values: vec![3.71],
            timestamp: chrono::DateTime::from_timestamp_millis(1_700_000_000_000).unwrap(),
        }
    }

    fn report(label: &str, mut samples: Vec<Duration>) {
        samples.sort_unstable();
        let us = |d: Duration| d.as_secs_f64() * 1e6;
        let n = samples.len();
        let mean = samples.iter().sum::<Duration>() / n as u32;
        println!(
            "EMIT {label:<40} p50={:>7.2}us p99={:>7.2}us mean={:>7.2}us",
            us(samples[n / 2]),
            us(samples[n * 99 / 100]),
            us(mean)
        );
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore = "benchmark"]
    async fn emit_cost() {
        let (_svc, io) = SocketIo::new_svc();
        io.ns("/", async |_s: SocketRef| {});
        let mut keep = Vec::new();
        for _ in 0..CLIENTS {
            let (tx, mut rx) = io.new_dummy_sock("/", ()).await;
            rx.recv().await.unwrap();
            tokio::spawn(async move { while rx.recv().await.is_some() {} });
            keep.push(tx);
        }
        while io.sockets().len() < CLIENTS {
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
        let msg = data();
        let mut counter = 0u8;

        let mut uncapped = DataSender::new(0);
        let mut samples = Vec::with_capacity(EMITS);
        for _ in 0..EMITS {
            let s = Instant::now();
            uncapped.send(&msg, &mut counter, &io).await;
            samples.push(s.elapsed());
            tokio::task::yield_now().await;
        }
        report("no cap: one broadcast", samples);

        // a cap nobody reaches: the gate's overhead on top of the broadcast
        let mut gate = DataSender::new(u32::MAX);
        let mut samples = Vec::with_capacity(EMITS);
        for _ in 0..EMITS {
            let s = Instant::now();
            gate.send(&msg, &mut counter, &io).await;
            samples.push(s.elapsed());
            tokio::task::yield_now().await;
        }
        report("cap not reached: gate + broadcast", samples);

        // what admitting a subset costs: one emit per socket
        let mut samples = Vec::with_capacity(EMITS);
        for _ in 0..EMITS {
            let s = Instant::now();
            let payload = serde_json::to_string(&msg).unwrap();
            for socket in io.sockets() {
                let _ = socket.emit(crate::metadata_structs::DATA_SOCKET_KEY, &payload);
            }
            samples.push(s.elapsed());
            tokio::task::yield_now().await;
        }
        report("per-socket emit to all 15", samples);

        // cap 500 at full speed: nearly every message is dropped by the gate
        let mut capped = DataSender::new(500);
        let mut samples = Vec::with_capacity(EMITS);
        for _ in 0..EMITS {
            let s = Instant::now();
            capped.send(&msg, &mut counter, &io).await;
            samples.push(s.elapsed());
            tokio::task::yield_now().await;
        }
        report("cap 500 saturated (mostly dropped)", samples);
        drop(keep);
    }
}
