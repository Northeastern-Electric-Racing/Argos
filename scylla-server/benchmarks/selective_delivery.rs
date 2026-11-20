//! Server micro-benchmark for selective delivery (epic #991, ADR 0009).
//!
//! Run in release: `cargo bench --bench selective_delivery` (see `README.md`).
//!
//! Replays 20 s of the simulator's traffic (`sim-topics.txt`: 1,048 topics,
//! ~3,900 msgs/s, counted off its MQTT broker) through the `data` emit path to
//! in-process dummy sockets (socketioxide's test harness, no network), and
//! times each emit:
//!
//! * `broadcast`: `io.emit` to every socket, as develop's `send_socket_msg` does.
//! * `rooms`: [`Subscriptions::emit_data`], the room-per-topic path, with every
//!   socket on the firehose (old clients), on the BMS page, on a small page, or
//!   on an empty list.
//!
//! Then times `set_subscriptions` changes, sent as client packets and timed to
//! their ack, so the figure includes socketioxide's packet dispatch.
//!
//! Only public API is used: sockets register through [`Subscriptions::register`]
//! as `socket_handler_with_metadata` does, and topic lists go over the wire.

use std::hint::black_box;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use engineioxide::Packet;
use scylla_server::ClientData;
use scylla_server::metadata_structs::DATA_SOCKET_KEY;
use scylla_server::socket_subscriptions::{
    HandshakeTopics, SET_SUBSCRIPTIONS_EVENT, Subscriptions,
};
use serde_json::json;
use socketioxide::SocketIo;
use socketioxide::extract::SocketRef;
use tokio::sync::mpsc::{self, Receiver, Sender};

/// `<messages in SAMPLE_SECS> <topic>` per line.
const SIM_TOPICS: &str = include_str!("sim-topics.txt");
const SAMPLE_SECS: f64 = 20.0;
const SOCKET_COUNTS: [usize; 3] = [1, 5, 15];
/// Timed `set_subscriptions` per change.
const CHANGES: usize = 300;
/// Sockets already connected while changes are timed.
const BYSTANDERS: usize = 14;

/// The BMS page reads every `BMS/` topic (821 of them, ~half the traffic).
const BMS_PAGE: &[&str] = &["BMS/"];
/// Small pages, ~10-30 topics each; socket `i` reads page `i % 4`.
const SMALL_PAGES: [&[&str]; 4] = [
    &["VCU/Pedals/", "VCU/CarState/"],
    &["DTI/General/", "DTI/Temps/", "DTI/Power/"],
    &[
        "BMS/Segment_Volt/",
        "BMS/Segment_Temp/",
        "BMS/Status/",
        "BMS/Charging/",
    ],
    &["MSB/F/", "MSB/B/"],
];

struct Sim {
    topics: Vec<(String, u32)>,
}

impl Sim {
    fn load() -> Self {
        let topics = SIM_TOPICS
            .lines()
            .filter_map(|line| {
                let (count, topic) = line.trim().split_once(' ')?;
                Some((topic.to_string(), count.parse().ok()?))
            })
            .collect();
        Sim { topics }
    }

    fn page(&self, prefixes: &[&str]) -> Vec<String> {
        self.topics
            .iter()
            .map(|(topic, _)| topic)
            .filter(|topic| prefixes.iter().any(|p| topic.starts_with(p)))
            .cloned()
            .collect()
    }

    /// Every message of the sample in arrival order: each topic's messages
    /// evenly spaced, on a per-topic phase so topics interleave.
    fn stream(&self) -> Vec<ClientData> {
        let mut events: Vec<(f64, usize)> = vec![];
        for (i, (_, count)) in self.topics.iter().enumerate() {
            let phase = (i as f64 * 0.618_034).fract();
            for k in 0..*count {
                events.push(((f64::from(k) + phase) / f64::from(*count), i));
            }
        }
        events.sort_by(|a, b| a.0.total_cmp(&b.0));
        let data: Vec<ClientData> = self
            .topics
            .iter()
            .map(|(topic, _)| client_data(topic))
            .collect();
        events.into_iter().map(|(_, i)| data[i].clone()).collect()
    }
}

fn client_data(topic: &str) -> ClientData {
    ClientData {
        run_id: 1,
        name: topic.to_string(),
        unit: "V".to_string(),
        values: vec![3.71],
        timestamp: chrono::DateTime::from_timestamp_millis(1_700_000_000_000).unwrap(),
    }
}

/// A dummy socket: its packets are drained by a task that counts `data`
/// messages and forwards acks.
struct Client {
    tx: Sender<Packet>,
    acks: Receiver<String>,
    data: Arc<AtomicU64>,
    /// The last `set_subscriptions` list's number.
    seq: u64,
}

impl Client {
    /// Sends `set_subscriptions` and waits for its ack.
    async fn set(&mut self, topics: &[String]) -> Duration {
        self.seq += 1;
        let packet = format!(
            "20[\"{SET_SUBSCRIPTIONS_EVENT}\",{{\"seq\":{},\"topics\":{}}}]",
            self.seq,
            serde_json::to_string(topics).unwrap()
        );
        let start = Instant::now();
        self.tx.send(Packet::Message(packet.into())).await.unwrap();
        let ack = self.acks.recv().await.expect("no ack");
        let elapsed = start.elapsed();
        assert!(ack.contains("count"), "unexpected ack {ack}");
        elapsed
    }
}

struct Server {
    io: SocketIo,
    subs: Arc<Subscriptions>,
}

impl Server {
    /// Registers sockets the way `socket_handler_with_metadata` does, with
    /// main.rs's buffer size.
    fn new() -> Self {
        let (_svc, io) = SocketIo::builder().max_buffer_size(4096).build_svc();
        let subs = Arc::new(Subscriptions::default());
        let ns_subs = subs.clone();
        io.ns(
            "/",
            async move |socket: SocketRef, HandshakeTopics(topics): HandshakeTopics| {
                ns_subs.register(&socket, topics).await;
                socket.on_disconnect(async move |socket: SocketRef| {
                    ns_subs.unregister(socket.id).await;
                });
            },
        );
        Server { io, subs }
    }

    /// `topics: None` connects like an old client, without an auth payload.
    async fn connect(&self, topics: Option<&[String]>) -> Client {
        let auth = topics.map_or(json!({}), |t| json!({ "topics": t }));
        let (tx, mut rx) = self.io.new_dummy_sock("/", auth).await;
        rx.recv().await.unwrap(); // namespace connect packet
        let (ack_tx, acks) = mpsc::channel(16);
        let data = Arc::new(AtomicU64::new(0));
        let counter = data.clone();
        tokio::spawn(async move {
            while let Some(packet) = rx.recv().await {
                if let Packet::Message(msg) = packet {
                    if msg.starts_with('3') {
                        let _ = ack_tx.send(msg.to_string()).await;
                    } else if msg.contains(DATA_SOCKET_KEY) {
                        counter.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        });
        Client {
            tx,
            acks,
            data,
            seq: 0,
        }
    }
}

/// Which `data` messages each socket asks for.
#[derive(Clone, Copy)]
enum Shape {
    /// Old clients: no topic list, every topic.
    Firehose,
    /// Every socket on the BMS page.
    Bms,
    /// Socket `i` on small page `i % 4`.
    Small,
    /// Every socket sent an empty list.
    Empty,
}

impl Shape {
    fn name(self) -> &'static str {
        match self {
            Shape::Firehose => "firehose (old clients)",
            Shape::Bms => "BMS page each",
            Shape::Small => "small page each",
            Shape::Empty => "empty list each",
        }
    }

    fn topics(self, sim: &Sim, i: usize) -> Option<Vec<String>> {
        match self {
            Shape::Firehose => None,
            Shape::Bms => Some(sim.page(BMS_PAGE)),
            Shape::Small => Some(sim.page(SMALL_PAGES[i % SMALL_PAGES.len()])),
            Shape::Empty => Some(vec![]),
        }
    }
}

#[derive(Clone, Copy)]
enum Path {
    Broadcast,
    Rooms,
}

struct Stats {
    p50: f64,
    p99: f64,
    mean: f64,
}

/// In µs.
fn stats(mut samples: Vec<Duration>) -> Stats {
    samples.sort_unstable();
    let n = samples.len();
    let us = |d: Duration| d.as_secs_f64() * 1e6;
    Stats {
        p50: us(samples[n / 2]),
        p99: us(samples[(n * 99 / 100).min(n - 1)]),
        mean: us(samples.iter().sum::<Duration>()) / n as f64,
    }
}

async fn emit_pass(sim: &Sim, stream: &[ClientData], sockets: usize, shape: Shape, path: Path) {
    let srv = Server::new();
    let mut clients = vec![];
    for i in 0..sockets {
        clients.push(srv.connect(shape.topics(sim, i).as_deref()).await);
    }
    // warm-up: one pass over every topic
    for (topic, _) in &sim.topics {
        emit(&srv, &client_data(topic), path).await;
    }
    tokio::time::sleep(Duration::from_millis(50)).await;
    let before: u64 = clients.iter().map(|c| c.data.load(Ordering::Relaxed)).sum();

    let mut samples = Vec::with_capacity(stream.len());
    for data in stream {
        let start = Instant::now();
        emit(&srv, data, path).await;
        samples.push(start.elapsed());
        tokio::task::yield_now().await;
    }
    tokio::time::sleep(Duration::from_millis(100)).await;
    let delivered: u64 = clients
        .iter()
        .map(|c| c.data.load(Ordering::Relaxed))
        .sum::<u64>()
        - before;
    let total: Duration = samples.iter().sum();
    let s = stats(samples);
    let label = match path {
        Path::Broadcast => "broadcast (develop)".to_string(),
        Path::Rooms => format!("rooms, {}", shape.name()),
    };
    println!(
        "| {sockets:>2} | {label:<32} | {:>6.2} | {:>6.2} | {:>7.2} | {:>5.2} % | {:>6.0} |",
        s.mean,
        s.p50,
        s.p99,
        total.as_secs_f64() / SAMPLE_SECS * 100.0,
        delivered as f64 / sockets as f64 / SAMPLE_SECS,
    );
}

async fn emit(srv: &Server, data: &ClientData, path: Path) {
    match path {
        Path::Broadcast => {
            let payload = serde_json::to_string(data).unwrap();
            let _ = black_box(srv.io.emit(DATA_SOCKET_KEY, &payload).await);
        }
        Path::Rooms => {
            let _ = black_box(srv.subs.emit_data(&srv.io, data).await);
        }
    }
}

/// Times `CHANGES` changes of one socket while `BYSTANDERS` others sit on
/// small pages. `from` is set (untimed) before each timed `to` when given;
/// without it the socket stays where the previous change left it.
async fn change_pass(label: &str, sim: &Sim, fresh: bool, steps: &[Vec<String>]) {
    let srv = Server::new();
    let mut bystanders = vec![];
    for i in 0..BYSTANDERS {
        bystanders.push(srv.connect(Shape::Small.topics(sim, i).as_deref()).await);
    }
    let mut samples = Vec::with_capacity(CHANGES);
    let mut client = srv.connect(None).await;
    while samples.len() < CHANGES {
        if fresh {
            // disconnect the last one, so sockets do not pile up
            client.tx.send(Packet::Close).await.unwrap();
            client = srv.connect(None).await;
        }
        for step in steps {
            samples.push(client.set(step).await);
        }
    }
    let s = stats(samples);
    println!(
        "| {label:<44} | {:>7.1} | {:>7.1} | {:>7.1} |",
        s.mean, s.p50, s.p99
    );
}

fn main() {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .unwrap();
    runtime.block_on(async {
        let sim = Sim::load();
        let stream = sim.stream();
        let bms = sim.page(BMS_PAGE);
        let small: Vec<Vec<String>> = (0..SMALL_PAGES.len())
            .map(|i| sim.page(SMALL_PAGES[i]))
            .collect();
        println!(
            "{} topics, {} msgs in {SAMPLE_SECS} s ({:.0} msgs/s); BMS page {} topics, small pages {:?} topics",
            sim.topics.len(),
            stream.len(),
            stream.len() as f64 / SAMPLE_SECS,
            bms.len(),
            small.iter().map(Vec::len).collect::<Vec<_>>(),
        );

        println!("\nEmit cost per data message (µs), and one core's share of the sample's rate");
        println!(
            "| N  | path, subscriptions              | mean   | p50    | p99     | core    | msgs/s per socket |"
        );
        println!(
            "|----|----------------------------------|--------|--------|---------|---------|--------|"
        );
        for sockets in SOCKET_COUNTS {
            emit_pass(&sim, &stream, sockets, Shape::Firehose, Path::Broadcast).await;
            for shape in [Shape::Firehose, Shape::Bms, Shape::Small, Shape::Empty] {
                emit_pass(&sim, &stream, sockets, shape, Path::Rooms).await;
            }
        }

        println!(
            "\nset_subscriptions round trip to its ack (µs), {CHANGES} changes, {BYSTANDERS} other sockets on small pages"
        );
        println!("| change                                       | mean    | p50     | p99     |");
        println!("|----------------------------------------------|---------|---------|---------|");
        let none: Vec<String> = vec![];
        change_pass("first set, old -> small page", &sim, true, &[small[0].clone()]).await;
        change_pass(
            "first set, old -> BMS page",
            &sim,
            true,
            std::slice::from_ref(&bms),
        )
        .await;
        change_pass(
            "small page A <-> small page B",
            &sim,
            false,
            &[small[0].clone(), small[1].clone()],
        )
        .await;
        change_pass(
            "small page <-> BMS page",
            &sim,
            false,
            &[small[0].clone(), bms.clone()],
        )
        .await;
        change_pass(
            "same small page again (no-op, dispatch only)",
            &sim,
            false,
            &[small[0].clone()],
        )
        .await;
        change_pass(
            "small page <-> empty list",
            &sim,
            false,
            &[small[0].clone(), none],
        )
        .await;
    });
}
