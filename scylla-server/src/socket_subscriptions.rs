//! Delivery of the `data` event through one Socket.IO room per topic (ADR 0009).
//!
//! A socket that never names its topics is in [`EVERY_TOPIC_ROOM`] and gets
//! every topic, as before (old clients). A socket that names them, in the
//! handshake's `auth.topics` or with [`SET_SUBSCRIPTIONS_EVENT`], is in exactly
//! those topic rooms, and never in [`EVERY_TOPIC_ROOM`] again, even with an
//! empty list.
//!
//! socketioxide creates a room on its first join and removes it on its last
//! leave (or disconnect), so a topic room exists only while a socket reads the
//! topic. Emitting `data` never creates one.
//!
//! [`Subscriptions`] mirrors which rooms have sockets, so an emit can skip a
//! topic nobody reads without serializing it, and a new topic list joins and
//! leaves only the rooms that change.
//!
//! Only `data` goes through rooms. `metadata`, `faults`, `timers` and rule
//! notifications are sent as before.

use std::convert::Infallible;
use std::sync::{Arc, PoisonError, RwLock, RwLockReadGuard, RwLockWriteGuard};

use rustc_hash::{FxHashMap, FxHashSet};
use socketioxide::SocketIo;
use socketioxide::adapter::Adapter;
use socketioxide::extract::{AckSender, SocketRef, TryData};
use socketioxide::handler::{FromConnectParts, Value};
use socketioxide::socket::{Sid, Socket};
use tokio::sync::Mutex;
use tracing::{debug, trace, warn};

use crate::ClientData;
use crate::metadata_structs::DATA_SOCKET_KEY;

/// Client -> server event carrying the socket's full list of topics; acked
/// with a [`SubscriptionAck`].
pub const SET_SUBSCRIPTIONS_EVENT: &str = "set_subscriptions";

/// Room for sockets that never named their topics. `#` is the MQTT
/// "everything" filter and never a published topic name, and topics with
/// wildcards are dropped, so it cannot collide with a topic room.
pub const EVERY_TOPIC_ROOM: &str = "#";

/// Ack payload for `set_subscriptions`: the number of topics the socket is now in.
#[derive(serde::Serialize, Debug)]
pub struct SubscriptionAck {
    pub count: usize,
}

/// Connect extractor for the topics a socket named in its handshake, the
/// Socket.IO auth payload `{"topics": [...]}`. `None` when there is no
/// `topics` field, or it is not a list of strings.
pub struct HandshakeTopics(pub Option<Vec<String>>);

#[derive(serde::Deserialize)]
struct HandshakeAuth {
    topics: Option<Vec<String>>,
}

impl<A: Adapter> FromConnectParts<A> for HandshakeTopics {
    type Error = Infallible;

    fn from_connect_parts(s: &Arc<Socket<A>>, auth: &Option<Value>) -> Result<Self, Infallible> {
        let Ok(TryData(auth)) = TryData::<HandshakeAuth>::from_connect_parts(s, auth);
        let topics = match auth {
            Ok(auth) => auth.topics,
            Err(err) => {
                warn!(
                    "Socket {} sent an unreadable auth payload, sending it every topic: {}",
                    s.id, err
                );
                None
            }
        };
        Ok(HandshakeTopics(topics))
    }
}

/// Which `data` messages a connected socket receives.
enum Delivery {
    /// Every topic, through [`EVERY_TOPIC_ROOM`].
    EveryTopic,
    /// Exactly these topic rooms.
    Topics(FxHashSet<String>),
}

/// What an emit needs to know: which rooms have sockets.
#[derive(Default)]
struct Gate {
    /// Sockets in [`EVERY_TOPIC_ROOM`].
    every_topic: usize,
    /// Topic rooms with at least one socket, and how many each has.
    readers: FxHashMap<String, usize>,
}

/// Room membership for `data`, mirrored from the adapter.
///
/// Shared by the connect handler, which registers sockets, and the data loop,
/// which emits through it.
#[derive(Default)]
pub struct Subscriptions {
    /// Each registered socket's delivery. Held across a socket's whole room
    /// change, so its changes apply in order. Emits never take it.
    sockets: Mutex<FxHashMap<Sid, Delivery>>,
    /// Read by every emit to pick its rooms; written briefly to update counts.
    gate: RwLock<Gate>,
    /// Read by every emit across its broadcast; written across a socket's
    /// move out of [`EVERY_TOPIC_ROOM`], which happens at most once per
    /// socket. An emit so sees that socket only in [`EVERY_TOPIC_ROOM`] or
    /// only in its topic rooms: never both (socketioxide does not dedupe a
    /// socket in two target rooms, so it would get the message twice) and
    /// never neither (it would miss a topic it kept).
    every_topic_exit: tokio::sync::RwLock<()>,
}

impl Subscriptions {
    /// Puts a newly connected socket in the rooms for its handshake `topics`,
    /// or in [`EVERY_TOPIC_ROOM`] without them, and listens for its
    /// `set_subscriptions`. The caller's disconnect handler must call
    /// [`Self::unregister`].
    pub async fn register(self: &Arc<Self>, socket: &SocketRef, topics: Option<Vec<String>>) {
        {
            let mut sockets = self.sockets.lock().await;
            match topics {
                None => {
                    self.gate_mut().every_topic += 1;
                    socket.join(EVERY_TOPIC_ROOM);
                    sockets.insert(socket.id, Delivery::EveryTopic);
                }
                Some(topics) => {
                    let wanted = valid_topics(socket.id, topics);
                    debug!(
                        "Socket {} connected subscribed to {} topics",
                        socket.id,
                        wanted.len()
                    );
                    self.join(socket, wanted.iter().cloned().collect());
                    sockets.insert(socket.id, Delivery::Topics(wanted));
                }
            }
        }
        let subscriptions = self.clone();
        socket.on(
            SET_SUBSCRIPTIONS_EVENT,
            async move |socket: SocketRef,
                        TryData(topics): TryData<Vec<String>>,
                        ack: AckSender| {
                let topics = match topics {
                    Ok(topics) => topics,
                    Err(err) => {
                        warn!(
                            "Socket {} sent unreadable {}: {}",
                            socket.id, SET_SUBSCRIPTIONS_EVENT, err
                        );
                        return;
                    }
                };
                let count = subscriptions.set_subscriptions(&socket, topics).await;
                debug!("Socket {} now subscribed to {} topics", socket.id, count);
                if let Err(err) = ack.send(&SubscriptionAck { count }) {
                    trace!("Could not ack {}: {}", SET_SUBSCRIPTIONS_EVENT, err);
                }
            },
        );
    }

    /// Forgets a disconnected socket. socketioxide removes it from its rooms.
    pub async fn unregister(&self, sid: Sid) {
        let Some(delivery) = self.sockets.lock().await.remove(&sid) else {
            return;
        };
        let mut gate = self.gate_mut();
        match delivery {
            Delivery::EveryTopic => gate.every_topic -= 1,
            Delivery::Topics(topics) => {
                for topic in &topics {
                    gate.remove_reader(topic);
                }
            }
        }
    }

    /// Replace-set: moves the socket to exactly the rooms for `topics`,
    /// joining only the rooms it is not in yet and leaving only the ones it no
    /// longer wants. Returns the number of topics it is now in.
    async fn set_subscriptions(&self, socket: &SocketRef, topics: Vec<String>) -> usize {
        let wanted = valid_topics(socket.id, topics);
        let count = wanted.len();
        let mut sockets = self.sockets.lock().await;
        // None: disconnected while this event was in flight
        let Some(delivery) = sockets.get_mut(&socket.id) else {
            return 0;
        };
        match delivery {
            Delivery::EveryTopic => {
                let _exit = self.every_topic_exit.write().await;
                self.join(socket, wanted.iter().cloned().collect());
                self.gate_mut().every_topic -= 1;
                socket.leave(EVERY_TOPIC_ROOM);
            }
            Delivery::Topics(current) => {
                // An emit may target a room the socket is about to join, or
                // skip one it is about to leave; topics it keeps are untouched.
                self.join(socket, wanted.difference(current).cloned().collect());
                let leave: Vec<String> = current.difference(&wanted).cloned().collect();
                if !leave.is_empty() {
                    {
                        let mut gate = self.gate_mut();
                        for topic in &leave {
                            gate.remove_reader(topic);
                        }
                    }
                    socket.leave(leave);
                }
            }
        }
        *delivery = Delivery::Topics(wanted);
        count
    }

    /// Counts the socket as a reader of `topics`, then joins their rooms.
    fn join(&self, socket: &SocketRef, topics: Vec<String>) {
        if topics.is_empty() {
            return;
        }
        {
            let mut gate = self.gate_mut();
            for topic in &topics {
                *gate.readers.entry(topic.clone()).or_default() += 1;
            }
        }
        socket.join(topics);
    }

    /// The rooms a `data` message for `topic` goes to, or `None` when no
    /// socket reads it.
    fn rooms_for(&self, topic: &str) -> Option<Vec<String>> {
        let gate = self.gate();
        let mut rooms = Vec::with_capacity(2);
        if gate.every_topic > 0 {
            rooms.push(EVERY_TOPIC_ROOM.to_string());
        }
        if gate.readers.contains_key(topic) {
            rooms.push(topic.to_string());
        }
        (!rooms.is_empty()).then_some(rooms)
    }

    /// Sends one `data` message to [`EVERY_TOPIC_ROOM`] and its topic's room.
    /// Does nothing, not even serialization, when neither has a socket.
    ///
    /// # Panics
    /// If `ClientData` fails to serialize, which it cannot (plain fields only).
    pub async fn emit_data(
        &self,
        io: &SocketIo,
        client_data: &ClientData,
    ) -> Result<(), socketioxide::BroadcastError> {
        let _exit = self.every_topic_exit.read().await;
        let Some(rooms) = self.rooms_for(&client_data.name) else {
            return Ok(());
        };
        let payload = serde_json::to_string(client_data).expect("Could not serialize ClientData");
        io.to(rooms).emit(DATA_SOCKET_KEY, &payload).await
    }

    fn gate(&self) -> RwLockReadGuard<'_, Gate> {
        // counts are updated in place and stay consistent if a holder panics
        self.gate.read().unwrap_or_else(PoisonError::into_inner)
    }

    fn gate_mut(&self) -> RwLockWriteGuard<'_, Gate> {
        self.gate.write().unwrap_or_else(PoisonError::into_inner)
    }
}

impl Gate {
    fn remove_reader(&mut self, topic: &str) {
        if let Some(count) = self.readers.get_mut(topic) {
            *count -= 1;
            if *count == 0 {
                self.readers.remove(topic);
            }
        }
    }
}

/// Drops empty topics and topics with MQTT wildcards (which would silently
/// match nothing), and duplicates.
fn valid_topics(sid: Sid, topics: Vec<String>) -> FxHashSet<String> {
    topics
        .into_iter()
        .filter(|topic| {
            let ok = !topic.is_empty() && !topic.contains(['#', '+']);
            if !ok {
                warn!("Socket {} sent invalid topic {:?}, dropping", sid, topic);
            }
            ok
        })
        .collect()
}

#[cfg(test)]
impl Subscriptions {
    /// Sockets in [`EVERY_TOPIC_ROOM`], and each read topic's socket count, sorted.
    fn reader_counts(&self) -> (usize, Vec<(String, usize)>) {
        let gate = self.gate();
        let mut readers: Vec<(String, usize)> = gate
            .readers
            .iter()
            .map(|(topic, count)| (topic.clone(), *count))
            .collect();
        readers.sort();
        (gate.every_topic, readers)
    }

    async fn socket_count(&self) -> usize {
        self.sockets.lock().await.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use engineioxide::Packet;
    use serde_json::json;
    use std::time::Duration;
    use tokio::sync::mpsc::{Receiver, Sender};

    fn client_data(name: &str) -> ClientData {
        ClientData {
            run_id: 1,
            name: name.to_string(),
            unit: String::new(),
            values: vec![1.0],
            timestamp: chrono::DateTime::from_timestamp_millis(0).unwrap(),
        }
    }

    /// Topic names of every `data` packet received within a short window.
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

    struct Server {
        io: SocketIo,
        subs: Arc<Subscriptions>,
    }

    impl Server {
        /// Registers sockets the way `socket_handler_with_metadata` does.
        fn new() -> Self {
            Self::with_builder(SocketIo::builder())
        }

        fn with_builder(builder: socketioxide::SocketIoBuilder) -> Self {
            let (_svc, io) = builder.build_svc();
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

        async fn connect(&self, auth: serde_json::Value) -> (Sender<Packet>, Receiver<Packet>) {
            let (tx, mut rx) = self.io.new_dummy_sock("/", auth).await;
            rx.recv().await.unwrap(); // namespace connect packet
            (tx, rx)
        }

        /// Connects without an auth payload, like an old client.
        async fn connect_old(&self) -> (Sender<Packet>, Receiver<Packet>) {
            self.connect(json!({})).await
        }

        async fn emit(&self, topic: &str) {
            self.subs
                .emit_data(&self.io, &client_data(topic))
                .await
                .unwrap();
        }

        async fn rooms(&self) -> Vec<String> {
            let mut rooms: Vec<String> = self
                .io
                .rooms()
                .await
                .unwrap()
                .into_iter()
                .map(|room| room.to_string())
                .collect();
            rooms.sort();
            rooms
        }
    }

    /// Sends `set_subscriptions` and returns its ack packet.
    async fn send_set(tx: &Sender<Packet>, rx: &mut Receiver<Packet>, json: &str) -> String {
        tx.send(Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",{json}]").into(),
        ))
        .await
        .unwrap();
        match rx.recv().await.unwrap() {
            Packet::Message(msg) if msg.starts_with("30") => msg.to_string(),
            other => panic!("expected an ack, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn socket_without_topics_gets_every_topic() {
        let srv = Server::new();
        let (_tx, mut rx) = srv.connect_old().await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(
            received_topics(&mut rx).await,
            ["BMS/Pack/SOC", "VCU/Speed"]
        );
    }

    #[tokio::test]
    async fn handshake_topics_get_only_those_topics() {
        let srv = Server::new();
        let (_tx, mut rx) = srv.connect(json!({ "topics": ["VCU/Speed"] })).await;
        let (_peer_tx, mut peer_rx) = srv.connect_old().await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["VCU/Speed"]);
        assert_eq!(
            received_topics(&mut peer_rx).await,
            ["BMS/Pack/SOC", "VCU/Speed"]
        );
    }

    #[tokio::test]
    async fn empty_handshake_topics_get_nothing() {
        let srv = Server::new();
        let (_tx, mut rx) = srv.connect(json!({ "topics": [] })).await;
        srv.emit("VCU/Speed").await;
        assert!(received_topics(&mut rx).await.is_empty());
        assert_eq!(srv.rooms().await, Vec::<String>::new());
    }

    #[tokio::test]
    async fn malformed_handshake_topics_get_every_topic() {
        let srv = Server::new();
        let (_tx, mut rx) = srv.connect(json!({ "topics": "VCU/Speed" })).await;
        srv.emit("BMS/Pack/SOC").await;
        assert_eq!(received_topics(&mut rx).await, ["BMS/Pack/SOC"]);
    }

    #[tokio::test]
    async fn subscribed_socket_gets_only_its_topics_once() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_old().await;
        let ack = send_set(&tx, &mut rx, r#"["BMS/Pack/SOC","BMS/Pack/SOC"]"#).await;
        assert_eq!(ack, r#"30[{"count":1}]"#);
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["BMS/Pack/SOC"]);
    }

    #[tokio::test]
    async fn second_set_replaces_the_first() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect(json!({ "topics": ["BMS/Pack/SOC"] })).await;
        send_set(&tx, &mut rx, r#"["VCU/Speed"]"#).await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["VCU/Speed"]);
        assert_eq!(srv.rooms().await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn empty_set_never_returns_to_every_topic() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_old().await;
        let (_peer_tx, mut peer_rx) = srv.connect_old().await;
        send_set(&tx, &mut rx, r#"["VCU/Speed"]"#).await;
        assert_eq!(send_set(&tx, &mut rx, "[]").await, r#"30[{"count":0}]"#);
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert!(received_topics(&mut rx).await.is_empty());
        assert_eq!(
            received_topics(&mut peer_rx).await,
            ["BMS/Pack/SOC", "VCU/Speed"]
        );
    }

    #[tokio::test]
    async fn overlapping_sets_keep_shared_topics() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_old().await;
        let (peer_tx, mut peer_rx) = srv.connect_old().await;
        send_set(&tx, &mut rx, r#"["A","B"]"#).await;
        send_set(&peer_tx, &mut peer_rx, r#"["B"]"#).await;
        send_set(&tx, &mut rx, r#"["B","C"]"#).await;
        for topic in ["A", "B", "C"] {
            srv.emit(topic).await;
        }
        assert_eq!(received_topics(&mut rx).await, ["B", "C"]);
        assert_eq!(received_topics(&mut peer_rx).await, ["B"]);
        assert_eq!(
            srv.subs.reader_counts(),
            (0, vec![("B".to_string(), 2), ("C".to_string(), 1)])
        );
        assert_eq!(srv.rooms().await, ["B", "C"]);
    }

    #[tokio::test]
    async fn unread_topics_are_not_serialized_or_given_a_room() {
        let srv = Server::new();
        let (_tx, _rx) = srv.connect(json!({ "topics": ["VCU/Speed"] })).await;
        assert_eq!(srv.subs.rooms_for("BMS/Pack/SOC"), None);
        assert_eq!(
            srv.subs.rooms_for("VCU/Speed"),
            Some(vec!["VCU/Speed".to_string()])
        );
        srv.emit("BMS/Pack/SOC").await;
        assert_eq!(srv.rooms().await, ["VCU/Speed"]);

        let (_old_tx, _old_rx) = srv.connect_old().await;
        assert_eq!(
            srv.subs.rooms_for("BMS/Pack/SOC"),
            Some(vec![EVERY_TOPIC_ROOM.to_string()])
        );
    }

    #[tokio::test]
    async fn disconnect_forgets_the_socket() {
        let srv = Server::new();
        let (_tx, _rx) = srv.connect_old().await;
        let (_hs_tx, _hs_rx) = srv.connect(json!({ "topics": ["A"] })).await;
        let (tx, mut rx) = srv.connect_old().await;
        send_set(&tx, &mut rx, r#"["VCU/Speed"]"#).await;
        assert_eq!(srv.subs.socket_count().await, 3);
        for socket in srv.io.sockets() {
            socket.disconnect().unwrap();
        }
        tokio::time::sleep(Duration::from_millis(20)).await;
        assert_eq!(srv.subs.socket_count().await, 0);
        assert_eq!(srv.subs.reader_counts(), (0, vec![]));
        assert_eq!(srv.rooms().await, Vec::<String>::new());
    }

    #[tokio::test]
    async fn wildcards_and_empty_topics_are_dropped() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect(json!({ "topics": ["#", "+/Speed", ""] })).await;
        assert_eq!(srv.rooms().await, Vec::<String>::new());
        let ack = send_set(&tx, &mut rx, r#"["BMS/#","+/Speed","","VCU/Speed"]"#).await;
        assert_eq!(ack, r#"30[{"count":1}]"#);
        assert_eq!(srv.rooms().await, ["VCU/Speed"]);
    }

    /// A socket's move out of the every-topic room waits for emits in flight,
    /// so no emit sees it in both rooms (a duplicate) or in neither (a drop).
    #[tokio::test]
    async fn leaving_every_topic_waits_for_emits_in_flight() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_old().await;
        let emit_in_flight = srv.subs.every_topic_exit.read().await;
        tx.send(Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",[\"Kept\"]]").into(),
        ))
        .await
        .unwrap();
        tokio::time::sleep(Duration::from_millis(20)).await;
        assert_eq!(srv.rooms().await, [EVERY_TOPIC_ROOM]);
        drop(emit_in_flight);
        assert!(matches!(rx.recv().await, Some(Packet::Message(m)) if m.starts_with("30")));
        assert_eq!(srv.rooms().await, ["Kept"]);
    }

    /// Sockets leave the every-topic room while a kept topic is being
    /// emitted: each must get every message exactly once, in order.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn leaving_every_topic_neither_drops_nor_duplicates() {
        const SOCKETS: usize = 16;
        const MESSAGES: usize = 1000;
        let srv = Server::with_builder(SocketIo::builder().max_buffer_size(4096));

        // many rooms, so each switch takes a while
        let mut set: Vec<String> = (0..2000).map(|i| format!("Other/{i}")).collect();
        set.push("Kept".to_string());
        let set = serde_json::to_string(&set).unwrap();

        let mut receivers = vec![];
        let mut senders = vec![];
        for _ in 0..SOCKETS {
            let (tx, mut rx) = srv.connect_old().await;
            senders.push(tx);
            receivers.push(tokio::spawn(async move {
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
            let (io, subs) = (srv.io.clone(), srv.subs.clone());
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
