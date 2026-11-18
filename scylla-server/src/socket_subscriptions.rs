//! Selective delivery of the `data` event over Socket.IO rooms (ADR 0007).
//!
//! Every topic is a room. A socket starts in [`FIREHOSE_ROOM`] and receives
//! every topic, as before. Once it sends `set_subscriptions` with its full list
//! of topics, it is moved to exactly those topic rooms. Rooms live only in the
//! server's in-memory adapter; nothing about them crosses the network.
//!
//! Only `data` is gated. `metadata`, `faults`, `timers` and `rule_notify` are
//! sent the same way as before.

use socketioxide::SocketIo;
use socketioxide::extract::{AckSender, Data, SocketRef};
use tracing::{debug, trace, warn};

use crate::ClientData;
use crate::metadata_structs::DATA_SOCKET_KEY;

/// Client -> server event carrying the socket's full list of topics.
pub const SET_SUBSCRIPTIONS_EVENT: &str = "set_subscriptions";

/// Room for sockets that never sent `set_subscriptions`. `#` is the MQTT
/// "everything" filter and can never be a published topic name, so it cannot
/// collide with a topic room.
pub const FIREHOSE_ROOM: &str = "#";

/// Ack payload for `set_subscriptions`: number of topics the socket is now in.
#[derive(serde::Serialize, Debug)]
pub struct SubscriptionAck {
    pub count: usize,
}

/// Puts a newly connected socket on the firehose and listens for its
/// `set_subscriptions` event.
pub fn register(socket: &SocketRef) {
    socket.join(FIREHOSE_ROOM);
    socket.on(
        SET_SUBSCRIPTIONS_EVENT,
        async |socket: SocketRef, Data(topics): Data<Vec<String>>, ack: AckSender| {
            let count = set_subscriptions(&socket, topics);
            debug!("Socket {} now subscribed to {} topics", socket.id, count);
            if let Err(err) = ack.send(&SubscriptionAck { count }) {
                trace!("Could not ack set_subscriptions: {}", err);
            }
        },
    );
}

/// Replace-set: moves the socket to exactly the rooms for `topics`.
///
/// Joins the new rooms before leaving the old ones, so a topic kept across the
/// change is never dropped. The cost is that, during the first switch off the
/// firehose, a message may arrive twice: socketioxide does not dedupe a socket
/// that is in more than one target room. Outside that switch the firehose room
/// and the topic rooms never share a socket.
fn set_subscriptions(socket: &SocketRef, topics: Vec<String>) -> usize {
    let mut topics: Vec<String> = topics
        .into_iter()
        .filter(|topic| {
            // exact topics only: wildcards would silently match nothing
            let ok = !topic.is_empty() && !topic.contains(['#', '+']);
            if !ok {
                warn!(
                    "Socket {} sent invalid topic {:?}, dropping",
                    socket.id, topic
                );
            }
            ok
        })
        .collect();
    topics.sort_unstable();
    topics.dedup();

    let stale: Vec<_> = socket
        .rooms()
        .into_iter()
        .filter(|room| topics.binary_search_by(|t| t.as_str().cmp(room)).is_err())
        .collect();
    let count = topics.len();
    socket.join(topics);
    socket.leave(stale);
    count
}

/// Sends one `data` message to the firehose room plus the room for its topic.
///
/// # Panics
/// If `ClientData` fails to serialize, which it cannot (plain fields only).
pub async fn emit_data(
    io: &SocketIo,
    client_data: &ClientData,
) -> Result<(), socketioxide::BroadcastError> {
    let payload = serde_json::to_string(client_data).expect("Could not serialize ClientData");
    io.to(FIREHOSE_ROOM)
        .to(client_data.name.clone())
        .emit(DATA_SOCKET_KEY, &payload)
        .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use engineioxide::Packet;
    use std::time::Duration;
    use tokio::sync::mpsc::Receiver;

    fn client_data(name: &str) -> ClientData {
        ClientData {
            run_id: 1,
            name: name.to_string(),
            unit: String::new(),
            values: vec![1.0],
            timestamp: chrono::DateTime::from_timestamp_millis(0).unwrap(),
        }
    }

    /// Event names of every `data` packet received within a short window.
    async fn received_topics(rx: &mut Receiver<Packet>) -> Vec<String> {
        let mut topics = vec![];
        while let Ok(Some(packet)) =
            tokio::time::timeout(Duration::from_millis(50), rx.recv()).await
        {
            if let Packet::Message(msg) = packet
                && msg.contains(DATA_SOCKET_KEY)
            {
                let name = msg.split("\\\"name\\\":\\\"").nth(1).unwrap_or("");
                topics.push(name.split("\\\"").next().unwrap_or("").to_string());
            }
        }
        topics
    }

    async fn connect(io: &SocketIo) -> (tokio::sync::mpsc::Sender<Packet>, Receiver<Packet>) {
        let (tx, mut rx) = io.new_dummy_sock("/", ()).await;
        rx.recv().await.unwrap(); // namespace connect packet
        (tx, rx)
    }

    async fn send_set(
        tx: &tokio::sync::mpsc::Sender<Packet>,
        rx: &mut Receiver<Packet>,
        json: &str,
    ) {
        tx.send(Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",{json}]").into(),
        ))
        .await
        .unwrap();
        let ack = rx.recv().await.unwrap(); // ack packet
        assert!(matches!(ack, Packet::Message(m) if m.starts_with("30")));
    }

    fn io_with_register() -> SocketIo {
        let (_svc, io) = SocketIo::new_svc();
        io.ns("/", async |socket: SocketRef| register(&socket));
        io
    }

    #[tokio::test]
    async fn new_socket_gets_every_topic() {
        let io = io_with_register();
        let (_tx, mut rx) = connect(&io).await;
        emit_data(&io, &client_data("BMS/Pack/SOC")).await.unwrap();
        emit_data(&io, &client_data("VCU/Speed")).await.unwrap();
        assert_eq!(
            received_topics(&mut rx).await,
            ["BMS/Pack/SOC", "VCU/Speed"]
        );
    }

    #[tokio::test]
    async fn subscribed_socket_gets_only_its_topics_once() {
        let io = io_with_register();
        let (tx, mut rx) = connect(&io).await;
        send_set(&tx, &mut rx, r#"["BMS/Pack/SOC"]"#).await;
        emit_data(&io, &client_data("BMS/Pack/SOC")).await.unwrap();
        emit_data(&io, &client_data("VCU/Speed")).await.unwrap();
        assert_eq!(received_topics(&mut rx).await, ["BMS/Pack/SOC"]);
    }

    #[tokio::test]
    async fn second_set_replaces_the_first() {
        let io = io_with_register();
        let (tx, mut rx) = connect(&io).await;
        send_set(&tx, &mut rx, r#"["BMS/Pack/SOC"]"#).await;
        send_set(&tx, &mut rx, r#"["VCU/Speed"]"#).await;
        emit_data(&io, &client_data("BMS/Pack/SOC")).await.unwrap();
        emit_data(&io, &client_data("VCU/Speed")).await.unwrap();
        assert_eq!(received_topics(&mut rx).await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn empty_set_gets_nothing_and_firehose_peer_is_unaffected() {
        let io = io_with_register();
        let (tx, mut rx) = connect(&io).await;
        let (_peer_tx, mut peer_rx) = connect(&io).await;
        send_set(&tx, &mut rx, "[]").await;
        emit_data(&io, &client_data("VCU/Speed")).await.unwrap();
        assert!(received_topics(&mut rx).await.is_empty());
        assert_eq!(received_topics(&mut peer_rx).await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn wildcards_and_empty_topics_are_dropped() {
        let io = io_with_register();
        let (tx, mut rx) = connect(&io).await;
        tx.send(Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",[\"BMS/#\",\"+/Speed\",\"\",\"VCU/Speed\"]]")
                .into(),
        ))
        .await
        .unwrap();
        let ack = rx.recv().await.unwrap();
        assert!(matches!(ack, Packet::Message(m) if m.as_str() == "30[{\"count\":1}]"));
    }
}

/// Benchmark for the server-side cost of selective delivery. Run with
/// `cargo test --release -- --ignored --nocapture bench_socket_subscriptions`.
#[cfg(test)]
mod bench {
    use super::*;
    use engineioxide::Packet;
    use socketioxide::socket::Sid;
    use std::collections::HashSet;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::time::{Duration, Instant};
    use tokio::sync::mpsc::Sender;

    const CLIENTS: usize = 15;
    const TOPICS: usize = 900;
    const RUNS: usize = 300;
    const EMITS: usize = 5000;

    // ---- API shim: the only part that differs between implementations ----
    #[derive(Clone)]
    struct Ctx;
    fn setup() -> (SocketIo, Ctx) {
        let (_svc, io) = SocketIo::new_svc();
        io.ns("/", async |socket: SocketRef| register(&socket));
        (io, Ctx)
    }
    async fn apply(_ctx: &Ctx, socket: &SocketRef, topics: Vec<String>) -> usize {
        set_subscriptions(socket, topics)
    }
    async fn emit(_ctx: &Ctx, io: &SocketIo, data: &ClientData) -> bool {
        emit_data(io, data).await.is_ok()
    }
    // ----------------------------------------------------------------------

    fn topic(i: usize) -> String {
        format!("BMS/Segment{}/Cell{}/Voltage", i / 30, i % 30)
    }

    fn data(name: String) -> ClientData {
        ClientData {
            run_id: 1,
            name,
            unit: "V".to_string(),
            values: vec![3.71],
            timestamp: chrono::DateTime::from_timestamp_millis(1_700_000_000_000).unwrap(),
        }
    }

    /// Connects a dummy socket whose packets are drained in the background,
    /// and returns its `SocketRef` plus the sender that keeps it open.
    async fn connect(io: &SocketIo, known: &mut HashSet<Sid>) -> (SocketRef, Sender<Packet>) {
        let (tx, mut rx) = io.new_dummy_sock("/", ()).await;
        rx.recv().await.unwrap(); // namespace connect packet
        tokio::spawn(async move { while rx.recv().await.is_some() {} });
        let socket = io
            .sockets()
            .into_iter()
            .find(|s| !known.contains(&s.id))
            .unwrap();
        known.insert(socket.id);
        (socket, tx)
    }

    fn report(label: &str, mut samples: Vec<Duration>) {
        samples.sort_unstable();
        let us = |d: Duration| d.as_secs_f64() * 1e6;
        let n = samples.len();
        println!(
            "{label:<48} n={n:<6} p50={:>9.2}us p99={:>9.2}us max={:>9.2}us",
            us(samples[n / 2]),
            us(samples[(n * 99 / 100).min(n - 1)]),
            us(samples[n - 1]),
        );
    }

    async fn timed_apply(ctx: &Ctx, socket: &SocketRef, topics: &[String]) -> Duration {
        let topics = topics.to_vec();
        let start = Instant::now();
        let count = apply(ctx, socket, topics).await;
        let elapsed = start.elapsed();
        assert!(count > 0);
        elapsed
    }

    /// Times a fresh socket's first `set_subscriptions` of `page`.
    async fn first_set_runs(
        io: &SocketIo,
        ctx: &Ctx,
        known: &mut HashSet<Sid>,
        page: &[String],
    ) -> Vec<Duration> {
        let mut samples = Vec::with_capacity(RUNS);
        for _ in 0..RUNS {
            let (socket, _tx) = connect(io, known).await;
            samples.push(timed_apply(ctx, &socket, page).await);
            socket.disconnect().unwrap();
            tokio::time::sleep(Duration::from_millis(1)).await; // let disconnect cleanup run
        }
        samples
    }

    /// Times one emit. If a dummy socket's buffer was full, pauses (untimed)
    /// so the drains catch up, and counts it.
    async fn timed_emit(ctx: &Ctx, io: &SocketIo, data: &ClientData, full: &mut u32) -> Duration {
        let start = Instant::now();
        let ok = emit(ctx, io, data).await;
        let elapsed = start.elapsed();
        if ok {
            tokio::task::yield_now().await; // let the drains keep up
        } else {
            *full += 1;
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
        elapsed
    }

    async fn emit_runs(io: &SocketIo, ctx: &Ctx, data: &ClientData) -> Vec<Duration> {
        let mut full = 0;
        let mut samples = Vec::with_capacity(EMITS);
        for _ in 0..EMITS {
            samples.push(timed_emit(ctx, io, data, &mut full).await);
        }
        report_full(full);
        samples
    }

    fn report_full(full: u32) {
        if full > 0 {
            println!("    ({full} emits hit a full dummy-socket buffer)");
        }
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore = "benchmark: run with --release -- --ignored --nocapture"]
    async fn bench_socket_subscriptions() {
        let topics: Vec<String> = (0..TOPICS).map(topic).collect();
        let page_a = &topics[0..490];
        let page_b = &topics[410..900];
        let (io, ctx) = setup();
        let mut known = HashSet::new();

        // (a) first set of page A, nobody else subscribed
        report(
            "(a) first set_subscriptions, fresh, alone",
            first_set_runs(&io, &ctx, &mut known, page_a).await,
        );

        // 14 other sockets on page A
        let mut others = vec![];
        for _ in 0..CLIENTS - 1 {
            let (socket, tx) = connect(&io, &mut known).await;
            apply(&ctx, &socket, page_a.to_vec()).await;
            others.push((socket, tx));
        }

        // (b) first set of page A, others already on page A
        report(
            "(b) first set_subscriptions, others on page A",
            first_set_runs(&io, &ctx, &mut known, page_a).await,
        );

        // the 15th client, on page A
        let (switcher, _switcher_tx) = connect(&io, &mut known).await;
        apply(&ctx, &switcher, page_a.to_vec()).await;

        // (c) page switch A <-> B
        let mut samples = Vec::with_capacity(RUNS * 2);
        for _ in 0..RUNS {
            samples.push(timed_apply(&ctx, &switcher, page_b).await);
            samples.push(timed_apply(&ctx, &switcher, page_a).await);
        }
        report("(c) page switch A<->B", samples);

        // (d) emit, topic watched by all 15
        let watched = data(topics[0].clone());
        report(
            "(d) emit, topic watched by all 15",
            emit_runs(&io, &ctx, &watched).await,
        );

        // (e) emit, topic nobody watches
        let unwatched = data(topics[899].clone());
        for (socket, _) in &others {
            assert!(!socket.rooms().iter().any(|r| r == topics[899].as_str()));
        }
        report(
            "(e) emit, topic nobody watches",
            emit_runs(&io, &ctx, &unwatched).await,
        );

        // (f) emit while one client switches pages nonstop for ~2 s
        let stop = Arc::new(AtomicBool::new(false));
        let switching = {
            let stop = stop.clone();
            let ctx = ctx.clone();
            let (a, b) = (page_a.to_vec(), page_b.to_vec());
            tokio::spawn(async move {
                let mut switches = 0u32;
                while !stop.load(Ordering::Relaxed) {
                    let page = if switches % 2 == 0 { &b } else { &a };
                    apply(&ctx, &switcher, page.clone()).await;
                    switches += 1;
                    tokio::task::yield_now().await;
                }
                switches
            })
        };
        let mut samples = vec![];
        let mut full = 0;
        let start = Instant::now();
        while start.elapsed() < Duration::from_secs(2) {
            samples.push(timed_emit(&ctx, &io, &watched, &mut full).await);
        }
        stop.store(true, Ordering::Relaxed);
        let switches = switching.await.unwrap();
        report("(f) emit while one client switches nonstop", samples);
        println!("    (switcher made {switches} page switches)");
        report_full(full);
        drop(others);
    }
}
