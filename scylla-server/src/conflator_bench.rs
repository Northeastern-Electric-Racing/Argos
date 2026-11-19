//! Synthetic measurement of conflation (spike #989), on a simulated clock.
//!
//! Feeds the [`Conflator`] the topic rates Calypso's simulator sends (counted
//! off its MQTT broker for 20 s: 1,017 topics, ~3,900 msgs/s), flushes it every
//! window, and reports what one client would get. Ignored by `cargo test`; run
//! `cargo test --release conflation_sim -- --ignored --nocapture`.
//!
//! * out/s: `data` messages emitted to a client per second.
//! * delay: how long a delivered value waited at the server (flush - arrival).
//! * visible: per incoming value, how long until the client shows it or a
//!   newer value of its topic (the next flush). This is the added latency.
//! * behind: sampled every 1 ms per topic, how long the client has been showing
//!   a value the server already has a newer one of (0 when up to date), and the
//!   share of samples where it is behind at all.
use super::*;

/// (topics, Hz) as counted from the simulator; 0 Hz topics sent under 3 times in 20 s.
const SIM_RATES: &[(usize, f64)] = &[
    (36, 0.1),
    (89, 0.25),
    (109, 0.5),
    (108, 0.75),
    (97, 1.0),
    (95, 1.25),
    (105, 1.5),
    (40, 1.75),
    (44, 2.0),
    (19, 2.25),
    (27, 2.5),
    (10, 2.75),
    (6, 3.0),
    (11, 3.25),
    (6, 3.5),
    (4, 3.75),
    (144, 4.0),
    (6, 4.5),
    (3, 4.75),
    (2, 5.25),
    (48, 33.0),
    (8, 100.0),
];

const SIM_SECS: u64 = 20;
const SECOND_US: u64 = 1_000_000;

/// Tiny LCG, so the run needs no rand crate and repeats exactly.
struct Lcg(u64);
impl Lcg {
    fn next_f64(&mut self) -> f64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (self.0 >> 11) as f64 / (1u64 << 53) as f64
    }
}

/// Every arrival as (time in µs, topic), sorted, with a random phase per topic
/// and ±10% jitter on each period.
fn arrivals(rng: &mut Lcg) -> (Vec<String>, Vec<f64>, Vec<(u64, usize)>) {
    let mut names = Vec::new();
    let mut hz = Vec::new();
    let mut events = Vec::new();
    for &(count, rate) in SIM_RATES {
        for _ in 0..count {
            let topic = names.len();
            names.push(format!("Sim/{rate}Hz/{topic}"));
            hz.push(rate);
            let period = SECOND_US as f64 / rate;
            let mut t = rng.next_f64() * period;
            while t < (SIM_SECS * SECOND_US) as f64 {
                events.push((t as u64, topic));
                t += period * (0.9 + 0.2 * rng.next_f64());
            }
        }
    }
    events.sort_unstable();
    (names, hz, events)
}

struct Stats(Vec<u64>);
impl Stats {
    fn ms(&mut self) -> (f64, f64, f64) {
        self.0.sort_unstable();
        let n = self.0.len().max(1);
        let ms = |us: u64| us as f64 / 1000.0;
        let mean = self.0.iter().sum::<u64>() as f64 / n as f64 / 1000.0;
        (
            mean,
            ms(self.0.get(n * 99 / 100).copied().unwrap_or(0)),
            ms(self.0.last().copied().unwrap_or(0)),
        )
    }
}

/// Runs one window (0 = every message) and prints a row.
fn simulate(window_ms: u64, names: &[String], hz: &[f64], events: &[(u64, usize)]) {
    let window = window_ms * 1000;
    let mut conflator = Conflator::new();
    // per topic: arrival times, and (shown at, arrival) of each value the client gets
    let mut arrived: Vec<Vec<u64>> = vec![Vec::new(); names.len()];
    let mut shown: Vec<Vec<(u64, u64)>> = vec![Vec::new(); names.len()];
    let mut delay = Stats(Vec::new());
    let mut visible = Stats(Vec::new());
    let mut out_by_rate: FxHashMap<u64, u64> = FxHashMap::default();
    let mut index: FxHashMap<&str, usize> = FxHashMap::default();
    for (i, n) in names.iter().enumerate() {
        index.insert(n, i);
    }

    let mut emit = |conflator: &mut Conflator, at: u64, shown: &mut Vec<Vec<(u64, u64)>>| {
        for data in conflator.drain() {
            let topic = index[data.name.as_str()];
            let arrival = data.timestamp.timestamp_micros() as u64;
            delay.0.push(at - arrival);
            shown[topic].push((at, arrival));
            *out_by_rate.entry((hz[topic] * 100.0) as u64).or_default() += 1;
        }
    };

    let mut next_flush = window;
    for &(t, topic) in events {
        if window > 0 {
            while next_flush <= t {
                emit(&mut conflator, next_flush, &mut shown);
                next_flush += window;
            }
        }
        arrived[topic].push(t);
        conflator.push(ClientData {
            run_id: 1,
            name: names[topic].clone(),
            unit: String::new(),
            values: vec![0.0],
            timestamp: chrono::DateTime::from_timestamp_micros(t.cast_signed()).unwrap(),
        });
        if window == 0 {
            emit(&mut conflator, t, &mut shown);
        } else {
            visible.0.push(next_flush - t);
        }
    }
    if window == 0 {
        visible.0.push(0);
    }

    // how long the client has been behind, sampled every 1 ms per topic
    let mut behind = Stats(Vec::new());
    for topic in 0..names.len() {
        let (a, s) = (&arrived[topic], &shown[topic]);
        let (mut ia, mut is) = (0, 0);
        for sample in (0..SIM_SECS * SECOND_US).step_by(1000) {
            while ia < a.len() && a[ia] <= sample {
                ia += 1;
            }
            while is < s.len() && s[is].0 <= sample {
                is += 1;
            }
            if is == 0 {
                continue;
            }
            // the first value the client has not seen yet, if it has arrived
            let unseen = a.partition_point(|&t| t <= s[is - 1].1);
            behind
                .0
                .push(if unseen < ia { sample - a[unseen] } else { 0 });
        }
    }

    let out = delay.0.len() as f64 / SIM_SECS as f64;
    let fast: u64 = out_by_rate
        .iter()
        .filter(|(r, _)| **r >= 1000)
        .map(|(_, c)| c)
        .sum();
    let (dm, _, dx) = delay.ms();
    let (vm, vp, vx) = visible.ms();
    let behind_share =
        behind.0.iter().filter(|&&b| b > 0).count() as f64 / behind.0.len().max(1) as f64;
    let (bm, bp, bx) = behind.ms();
    println!(
        "CONFLATE window={window_ms:>4}ms in/s={:>6.0} out/s={out:>6.0} ({:>5.1}% cut) \
         >=10Hz-out/s={:>5.0} delay mean/max={dm:>6.1}/{dx:>6.1}ms \
         visible mean/p99/max={vm:>6.1}/{vp:>6.1}/{vx:>6.1}ms \
         behind mean/p99/max={bm:>6.2}/{bp:>6.1}/{bx:>6.1}ms ({:>4.1}% of time)",
        events.len() as f64 / SIM_SECS as f64,
        100.0 * (1.0 - out * SIM_SECS as f64 / events.len() as f64),
        fast as f64 / SIM_SECS as f64,
        100.0 * behind_share,
    );
}

#[test]
#[ignore = "measurement: run with --release -- --ignored --nocapture"]
fn conflation_sim() {
    let (names, hz, events) = arrivals(&mut Lcg(989));
    println!(
        "CONFLATE {} topics, {} msgs over {SIM_SECS} s",
        names.len(),
        events.len()
    );
    for window_ms in [0, 50, 100, 250, 500, 1000] {
        simulate(window_ms, &names, &hz, &events);
    }
}
