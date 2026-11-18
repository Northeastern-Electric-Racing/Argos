//! Selective delivery of the `data` event over Socket.IO rooms (ADR 0007).
//!
//! Every topic is a room. A socket starts in [`FIREHOSE_ROOM`] and receives
//! every topic, as before. Once it sends `set_subscriptions` with its full list
//! of topics, it is moved to exactly those topic rooms. Rooms live only in the
//! server's in-memory adapter; nothing about them crosses the network.
//!
//! [`Subscriptions`] mirrors the room membership the adapter holds, so the
//! server can tell without touching the adapter whether a topic has any
//! reader, and diff a new topic list against the socket's current one instead
//! of rejoining every room.
//!
//! Only `data` is gated. `metadata`, `faults`, `timers` and `rule_notify` are
//! sent the same way as before.

use std::borrow::Cow;
use std::sync::{Arc, PoisonError, RwLock, RwLockReadGuard, RwLockWriteGuard};

use rustc_hash::{FxHashMap, FxHashSet};
use socketioxide::SocketIo;
use socketioxide::extract::{AckSender, Data, SocketRef};
use socketioxide::socket::Sid;
use tokio::sync::Mutex;
use tracing::{debug, trace, warn};

use crate::ClientData;
use crate::metadata_structs::DATA_SOCKET_KEY;

/// Client -> server event carrying the socket's full list of topics.
pub const SET_SUBSCRIPTIONS_EVENT: &str = "set_subscriptions";

/// Room for sockets that never sent `set_subscriptions`. `#` is the MQTT
/// "everything" filter and can never be a published topic name, so it cannot
/// collide with a topic room.
pub const FIREHOSE_ROOM: &str = "#";

/// socketioxide's room name (`socketioxide_core::adapter::Room`).
type Room = Cow<'static, str>;

/// Ack payload for `set_subscriptions`: number of topics the socket is now in.
#[derive(serde::Serialize, Debug)]
pub struct SubscriptionAck {
    pub count: usize,
}

/// Which `data` messages a connected socket receives.
enum Delivery {
    /// Every topic, via [`FIREHOSE_ROOM`]: it has not sent `set_subscriptions`.
    Firehose,
    /// Exactly these topic rooms.
    Topics(FxHashSet<Room>),
}

/// What an emit needs to know: which rooms have sockets.
#[derive(Default)]
struct Gate {
    /// Sockets in [`FIREHOSE_ROOM`].
    firehose: usize,
    /// Topic rooms with at least one socket, and how many sockets each has.
    readers: FxHashMap<Room, usize>,
}

/// Room membership for `data`, mirrored from the adapter so an emit can skip
/// a topic nobody reads and a topic change only touches the rooms that change.
///
/// Shared by the connect handler, which registers sockets, and the data loop,
/// which emits through it.
#[derive(Default)]
pub struct Subscriptions {
    /// Every registered socket's delivery. Held for each whole room change,
    /// so the changes for one socket apply in order. Emits never take it.
    sockets: Mutex<FxHashMap<Sid, Delivery>>,
    /// Read by every emit to pick its rooms; written briefly to update counts.
    gate: RwLock<Gate>,
    /// Read by every emit across its broadcast; written across the room
    /// change of a socket leaving the firehose, which happens once per socket.
    /// An emit then sees that socket either only in [`FIREHOSE_ROOM`] or only
    /// in its topic rooms: never both (socketioxide does not dedupe a socket in
    /// more than one target room, so it would get the message twice) and never
    /// neither (it would miss a topic it kept).
    firehose_exit: tokio::sync::RwLock<()>,
}

impl Subscriptions {
    /// Puts a newly connected socket on the firehose and listens for its
    /// `set_subscriptions` event. The caller's disconnect handler must call
    /// [`Self::unregister`].
    pub async fn register(self: &Arc<Self>, socket: &SocketRef) {
        {
            let mut sockets = self.sockets.lock().await;
            sockets.insert(socket.id, Delivery::Firehose);
            self.gate_mut().firehose += 1;
            socket.join(FIREHOSE_ROOM);
        }
        let subscriptions = self.clone();
        socket.on(
            SET_SUBSCRIPTIONS_EVENT,
            async move |socket: SocketRef, Data(topics): Data<Vec<String>>, ack: AckSender| {
                let count = subscriptions.set_subscriptions(&socket, topics).await;
                debug!("Socket {} now subscribed to {} topics", socket.id, count);
                if let Err(err) = ack.send(&SubscriptionAck { count }) {
                    trace!("Could not ack set_subscriptions: {}", err);
                }
            },
        );
    }

    /// Forgets a disconnected socket. socketioxide removes it from its rooms.
    pub async fn unregister(&self, sid: Sid) {
        let mut sockets = self.sockets.lock().await;
        let Some(delivery) = sockets.remove(&sid) else {
            return;
        };
        let mut gate = self.gate_mut();
        match delivery {
            Delivery::Firehose => gate.firehose -= 1,
            Delivery::Topics(topics) => {
                for topic in &topics {
                    gate.remove_reader(topic);
                }
            }
        }
    }

    /// Replace-set: moves the socket to exactly the rooms for `topics`, joining
    /// only the rooms it is not in yet and leaving only the ones it no longer
    /// wants. Returns the number of topics it is now in.
    async fn set_subscriptions(&self, socket: &SocketRef, topics: Vec<String>) -> usize {
        let wanted: FxHashSet<Room> = topics
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
            .map(Cow::Owned)
            .collect();
        let count = wanted.len();

        let mut sockets = self.sockets.lock().await;
        // None: disconnected while this event was in flight
        let Some(delivery) = sockets.get_mut(&socket.id) else {
            return 0;
        };
        match std::mem::replace(delivery, Delivery::Topics(FxHashSet::default())) {
            Delivery::Firehose => {
                let join: Vec<Room> = wanted.iter().cloned().collect();
                let _exit = self.firehose_exit.write().await;
                {
                    let mut gate = self.gate_mut();
                    for topic in &join {
                        gate.add_reader(topic);
                    }
                    gate.firehose -= 1;
                }
                if !join.is_empty() {
                    socket.join(join);
                }
                socket.leave(FIREHOSE_ROOM);
            }
            Delivery::Topics(current) => {
                let join: Vec<Room> = wanted.difference(&current).cloned().collect();
                let leave: Vec<Room> = current
                    .into_iter()
                    .filter(|topic| !wanted.contains(topic))
                    .collect();
                {
                    // A count can lead its room: an emit may target a room
                    // the socket is about to join, or skip one it is about to
                    // leave. Topics it keeps are untouched either way.
                    let mut gate = self.gate_mut();
                    for topic in &join {
                        gate.add_reader(topic);
                    }
                    for topic in &leave {
                        gate.remove_reader(topic);
                    }
                }
                for batch in batches(join) {
                    socket.join(batch);
                    tokio::task::yield_now().await;
                }
                for batch in batches(leave) {
                    socket.leave(batch);
                    tokio::task::yield_now().await;
                }
            }
        }
        *delivery = Delivery::Topics(wanted);
        count
    }

    /// Sends one `data` message to the sockets that want its topic: the
    /// firehose room plus the topic's room. Does nothing, not even
    /// serialization, when neither has a socket.
    ///
    /// # Panics
    /// If `ClientData` fails to serialize, which it cannot (plain fields only).
    pub async fn emit_data(
        &self,
        io: &SocketIo,
        client_data: &ClientData,
    ) -> Result<(), socketioxide::BroadcastError> {
        let _exit = self.firehose_exit.read().await;
        let (firehose, topic_room) = {
            let gate = self.gate();
            let topic_room = gate
                .readers
                .get_key_value(client_data.name.as_str())
                .map(|(room, _)| room.clone());
            (gate.firehose > 0, topic_room)
        };
        let to = match (firehose, topic_room) {
            (false, None) => return Ok(()),
            (false, Some(room)) => io.to(room),
            (true, None) => io.to(FIREHOSE_ROOM),
            (true, Some(room)) => io.to(FIREHOSE_ROOM).to(room),
        };
        let payload = serde_json::to_string(client_data).expect("Could not serialize ClientData");
        to.emit(DATA_SOCKET_KEY, &payload).await
    }

    fn gate(&self) -> RwLockReadGuard<'_, Gate> {
        // counts are updated in place and stay consistent if a holder panics
        self.gate.read().unwrap_or_else(PoisonError::into_inner)
    }

    fn gate_mut(&self) -> RwLockWriteGuard<'_, Gate> {
        self.gate.write().unwrap_or_else(PoisonError::into_inner)
    }
}

/// Rooms per adapter call when a socket changes topics. The adapter
/// write-locks all rooms for each call, stalling every emit until it returns;
/// small batches, with a yield between them, let emits through in between.
const ROOM_BATCH: usize = 32;

fn batches(mut rooms: Vec<Room>) -> impl Iterator<Item = Vec<Room>> {
    std::iter::from_fn(move || {
        (!rooms.is_empty()).then(|| rooms.split_off(rooms.len().saturating_sub(ROOM_BATCH)))
    })
}

impl Gate {
    fn add_reader(&mut self, topic: &Room) {
        match self.readers.get_mut(topic) {
            Some(count) => *count += 1,
            None => {
                self.readers.insert(topic.clone(), 1);
            }
        }
    }

    fn remove_reader(&mut self, topic: &str) {
        if let Some(count) = self.readers.get_mut(topic) {
            *count -= 1;
            if *count == 0 {
                self.readers.remove(topic);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use engineioxide::Packet;
    use std::sync::Arc;
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

    struct Server {
        io: SocketIo,
        subs: Arc<Subscriptions>,
    }

    impl Server {
        async fn emit(&self, topic: &str) {
            self.subs
                .emit_data(&self.io, &client_data(topic))
                .await
                .unwrap();
        }
    }

    fn io_with_register() -> Server {
        let (_svc, io) = SocketIo::new_svc();
        let subs = Arc::new(Subscriptions::default());
        let ns_subs = subs.clone();
        io.ns("/", async move |socket: SocketRef| {
            ns_subs.register(&socket).await;
            let subs = ns_subs.clone();
            socket.on_disconnect(async move |socket: SocketRef| subs.unregister(socket.id).await);
        });
        Server { io, subs }
    }

    #[tokio::test]
    async fn new_socket_gets_every_topic() {
        let srv = io_with_register();
        let (_tx, mut rx) = connect(&srv.io).await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(
            received_topics(&mut rx).await,
            ["BMS/Pack/SOC", "VCU/Speed"]
        );
    }

    #[tokio::test]
    async fn subscribed_socket_gets_only_its_topics_once() {
        let srv = io_with_register();
        let (tx, mut rx) = connect(&srv.io).await;
        send_set(&tx, &mut rx, r#"["BMS/Pack/SOC","BMS/Pack/SOC"]"#).await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["BMS/Pack/SOC"]);
    }

    #[tokio::test]
    async fn second_set_replaces_the_first() {
        let srv = io_with_register();
        let (tx, mut rx) = connect(&srv.io).await;
        send_set(&tx, &mut rx, r#"["BMS/Pack/SOC"]"#).await;
        send_set(&tx, &mut rx, r#"["VCU/Speed"]"#).await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn overlapping_sets_keep_shared_topics() {
        let srv = io_with_register();
        let (tx, mut rx) = connect(&srv.io).await;
        let (peer_tx, mut peer_rx) = connect(&srv.io).await;
        send_set(&tx, &mut rx, r#"["A","B"]"#).await;
        send_set(&peer_tx, &mut peer_rx, r#"["B"]"#).await;
        send_set(&tx, &mut rx, r#"["B","C"]"#).await;
        for topic in ["A", "B", "C"] {
            srv.emit(topic).await;
        }
        assert_eq!(received_topics(&mut rx).await, ["B", "C"]);
        assert_eq!(received_topics(&mut peer_rx).await, ["B"]);
        let state = srv.subs.gate();
        assert_eq!(state.firehose, 0);
        assert_eq!(state.readers.get("A"), None);
        assert_eq!(state.readers.get("B"), Some(&2));
        assert_eq!(state.readers.get("C"), Some(&1));
    }

    #[tokio::test]
    async fn empty_set_gets_nothing_and_firehose_peer_is_unaffected() {
        let srv = io_with_register();
        let (tx, mut rx) = connect(&srv.io).await;
        let (_peer_tx, mut peer_rx) = connect(&srv.io).await;
        send_set(&tx, &mut rx, "[]").await;
        srv.emit("VCU/Speed").await;
        assert!(received_topics(&mut rx).await.is_empty());
        assert_eq!(received_topics(&mut peer_rx).await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn disconnect_forgets_the_socket() {
        let srv = io_with_register();
        let (_tx, _rx) = connect(&srv.io).await;
        let (tx, mut rx) = connect(&srv.io).await;
        send_set(&tx, &mut rx, r#"["VCU/Speed"]"#).await;
        for socket in srv.io.sockets() {
            socket.disconnect().unwrap();
        }
        tokio::time::sleep(Duration::from_millis(20)).await;
        assert!(srv.subs.sockets.lock().await.is_empty());
        let state = srv.subs.gate();
        assert_eq!(state.firehose, 0);
        assert!(state.readers.is_empty());
    }

    #[tokio::test]
    async fn wildcards_and_empty_topics_are_dropped() {
        let srv = io_with_register();
        let (tx, mut rx) = connect(&srv.io).await;
        tx.send(Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",[\"BMS/#\",\"+/Speed\",\"\",\"VCU/Speed\"]]")
                .into(),
        ))
        .await
        .unwrap();
        let ack = rx.recv().await.unwrap();
        assert!(matches!(ack, Packet::Message(m) if m.as_str() == "30[{\"count\":1}]"));
    }

    /// Sockets leave the firehose while a kept topic is being emitted: each
    /// must get every message exactly once, in order.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn first_switch_neither_drops_nor_duplicates() {
        const SOCKETS: usize = 16;
        const MESSAGES: usize = 1000;
        let (_svc, io) = SocketIo::builder().max_buffer_size(4096).build_svc();
        let subs = Arc::new(Subscriptions::default());
        let ns_subs = subs.clone();
        io.ns("/", async move |socket: SocketRef| {
            ns_subs.register(&socket).await;
        });

        // keep the topic room busy and wide so the switch takes a while
        let mut set: Vec<String> = (0..2000).map(|i| format!("Other/{i}")).collect();
        set.push("Kept".to_string());
        let set = serde_json::to_string(&set).unwrap();

        let mut receivers = vec![];
        let mut senders = vec![];
        for _ in 0..SOCKETS {
            let (tx, rx) = connect(&io).await;
            senders.push(tx);
            receivers.push(tokio::spawn(async move {
                let mut rx = rx;
                let mut values = vec![];
                while values.len() < MESSAGES {
                    let Ok(Some(Packet::Message(msg))) =
                        tokio::time::timeout(Duration::from_secs(5), rx.recv()).await
                    else {
                        break;
                    };
                    // ack packets carry no "values"
                    if let Some(rest) = msg.split("\\\"values\\\":[").nth(1) {
                        let value = rest.split(']').next().unwrap();
                        values.push(value.parse::<f32>().unwrap() as usize);
                    }
                }
                values
            }));
        }

        let emitter = {
            let (io, subs) = (io.clone(), subs.clone());
            tokio::spawn(async move {
                for i in 0..MESSAGES {
                    let mut data = client_data("Kept");
                    data.values = vec![i as f32];
                    subs.emit_data(&io, &data).await.unwrap();
                    tokio::task::yield_now().await;
                }
            })
        };
        tokio::time::sleep(Duration::from_millis(2)).await;
        for tx in &senders {
            tx.send(Packet::Message(
                format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",{set}]").into(),
            ))
            .await
            .unwrap();
        }
        emitter.await.unwrap();
        for receiver in receivers {
            assert_eq!(receiver.await.unwrap(), (0..MESSAGES).collect::<Vec<_>>());
        }
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
    type Ctx = Arc<Subscriptions>;
    fn setup() -> (SocketIo, Ctx) {
        let (_svc, io) = SocketIo::new_svc();
        let subs = Arc::new(Subscriptions::default());
        let ns_subs = subs.clone();
        io.ns("/", async move |socket: SocketRef| {
            ns_subs.register(&socket).await;
            let subs = ns_subs.clone();
            socket.on_disconnect(async move |socket: SocketRef| subs.unregister(socket.id).await);
        });
        (io, subs)
    }
    async fn apply(ctx: &Ctx, socket: &SocketRef, topics: Vec<String>) -> usize {
        ctx.set_subscriptions(socket, topics).await
    }
    async fn emit(ctx: &Ctx, io: &SocketIo, data: &ClientData) -> bool {
        ctx.emit_data(io, data).await.is_ok()
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
        let mean = samples.iter().sum::<Duration>() / n as u32;
        println!(
            "{label:<48} n={n:<6} p50={:>9.2}us p99={:>9.2}us max={:>9.2}us mean={:>8.2}us",
            us(samples[n / 2]),
            us(samples[(n * 99 / 100).min(n - 1)]),
            us(samples[n - 1]),
            us(mean),
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
                let mut flips = 0u32;
                while !stop.load(Ordering::Relaxed) {
                    let page = if flips.is_multiple_of(2) { &b } else { &a };
                    apply(&ctx, &switcher, page.clone()).await;
                    flips += 1;
                    tokio::task::yield_now().await;
                }
                flips
            })
        };
        let mut samples = vec![];
        let mut full = 0;
        let start = Instant::now();
        while start.elapsed() < Duration::from_secs(2) {
            samples.push(timed_emit(&ctx, &io, &watched, &mut full).await);
        }
        stop.store(true, Ordering::Relaxed);
        let flips = switching.await.unwrap();
        report("(f) emit while one client switches nonstop", samples);
        println!("    (switcher made {flips} page switches)");
        report_full(full);
        drop(others);
    }
}
