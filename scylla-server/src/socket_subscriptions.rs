//! Delivery of the `data` event through one Socket.IO room per topic (ADR 0009).
//!
//! A client that reads topics connects with `subscriptions=1` in its query
//! string ([`SubscribesTopics`]). Its socket starts in no room, and each
//! [`SET_SUBSCRIPTIONS_EVENT`] list moves it to exactly those topic rooms. A
//! socket without the flag (old clients) is in [`EVERY_TOPIC_ROOM`] for its
//! whole connection and gets every topic, as before; its `set_subscriptions`
//! are ignored. The flag settles this at connect, so a socket never moves
//! between the two, and an emit never sees it in both rooms (socketioxide
//! would send it the message twice).
//!
//! Each `set_subscriptions` list carries a number, `seq`, that the client
//! raises with every list. socketioxide runs each event in its own task, so
//! lists sent close together can be handled out of order; the server applies
//! a list only if its number is higher than the last one applied to that
//! socket (0 at connect), and drops older ones. A client can so change its
//! topics as often as it likes and the socket always ends up on its latest
//! list.
//!
//! socketioxide creates a room on its first join and removes it on its last
//! leave (or disconnect), so a topic room exists only while a socket reads the
//! topic. Emitting `data` never creates one.
//!
//! [`Subscriptions`] mirrors which rooms have sockets, so an emit can skip a
//! topic nobody reads without serializing it, and a new topic list joins and
//! leaves only the rooms that change.
//!
//! Only `data` goes through rooms. `metadata`, `faults` and `timers` are sent
//! as before.

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

/// Client -> server event carrying a [`TopicList`]; acked with a
/// [`SubscriptionAck`].
pub const SET_SUBSCRIPTIONS_EVENT: &str = "set_subscriptions";

/// Query-string key of the flag a client that sends `set_subscriptions`
/// connects with: `subscriptions=1`.
pub const SUBSCRIPTIONS_QUERY_KEY: &str = "subscriptions";

/// Room for sockets that connected without the flag. `#` is the MQTT
/// "everything" filter and never a published topic name, and topics with
/// wildcards are dropped, so it cannot collide with a topic room.
pub const EVERY_TOPIC_ROOM: &str = "#";

/// `set_subscriptions` payload: the socket's full list of topics, numbered.
#[derive(serde::Deserialize, Debug)]
pub struct TopicList {
    /// Higher than every list this client sent before on this socket.
    pub seq: u64,
    pub topics: Vec<String>,
}

/// Ack payload for `set_subscriptions`: the socket's latest applied list, by
/// its number and topic count. When the acked list was older than one already
/// applied, `seq` is that newer list's; when none was applied (or the socket
/// connected without the flag), both are 0.
#[derive(serde::Serialize, Debug)]
pub struct SubscriptionAck {
    pub count: usize,
    pub seq: u64,
}

/// Connect extractor: whether the connection's query string carries
/// `subscriptions=1`, i.e. the client sends its topics with
/// `set_subscriptions` and wants only those.
pub struct SubscribesTopics(pub bool);

impl<A: Adapter> FromConnectParts<A> for SubscribesTopics {
    type Error = Infallible;

    fn from_connect_parts(s: &Arc<Socket<A>>, _: &Option<Value>) -> Result<Self, Infallible> {
        Ok(SubscribesTopics(subscribes_topics(
            s.req_parts().uri.query(),
        )))
    }
}

fn subscribes_topics(query: Option<&str>) -> bool {
    query.is_some_and(|query| {
        query
            .split('&')
            .any(|pair| pair.split_once('=') == Some((SUBSCRIPTIONS_QUERY_KEY, "1")))
    })
}

/// Which `data` messages a connected socket receives.
enum Delivery {
    /// Every topic, through [`EVERY_TOPIC_ROOM`].
    EveryTopic,
    /// Exactly these topic rooms, from the list numbered `seq` (0 at connect).
    Topics { topics: FxHashSet<String>, seq: u64 },
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
/// Shared by the connect middleware, which registers sockets, and the data
/// loop, which emits through it.
#[derive(Default)]
pub struct Subscriptions {
    /// Each registered socket's delivery. Held across a socket's whole room
    /// change, so one change applies at a time; which list wins is decided by
    /// its `seq`, not by when its event is handled. Emits never take it.
    sockets: Mutex<FxHashMap<Sid, Delivery>>,
    /// Read by every emit to pick its rooms; written briefly to update counts.
    gate: RwLock<Gate>,
}

impl Subscriptions {
    /// Puts a newly connected socket in [`EVERY_TOPIC_ROOM`], or in no room
    /// when it `subscribes` to topics, and listens for its
    /// `set_subscriptions`.
    ///
    /// Call it from connect middleware, which socketioxide awaits before it
    /// acks the connection. The connect handler runs after the ack, and a
    /// client sends its first list as soon as it is acked: an event that
    /// arrives before its handler is registered is dropped. The caller's
    /// disconnect handler must call [`Self::unregister`].
    pub async fn register(self: &Arc<Self>, socket: &SocketRef, subscribes: bool) {
        {
            let mut sockets = self.sockets.lock().await;
            if subscribes {
                sockets.insert(
                    socket.id,
                    Delivery::Topics {
                        topics: FxHashSet::default(),
                        seq: 0,
                    },
                );
            } else {
                self.gate_mut().every_topic += 1;
                socket.join(EVERY_TOPIC_ROOM);
                sockets.insert(socket.id, Delivery::EveryTopic);
            }
        }
        let subscriptions = self.clone();
        #[expect(
            clippy::disallowed_methods,
            reason = "register is called from connect middleware, before the CONNECT ack"
        )]
        socket.on(
            SET_SUBSCRIPTIONS_EVENT,
            async move |socket: SocketRef, TryData(list): TryData<TopicList>, ack: AckSender| {
                let list = match list {
                    Ok(list) => list,
                    Err(err) => {
                        warn!(
                            "Socket {} sent unreadable {}: {}",
                            socket.id, SET_SUBSCRIPTIONS_EVENT, err
                        );
                        return;
                    }
                };
                let applied = subscriptions.set_subscriptions(&socket, list).await;
                debug!(
                    "Socket {} now subscribed to {} topics (list {})",
                    socket.id, applied.count, applied.seq
                );
                if let Err(err) = ack.send(&applied) {
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
            Delivery::Topics { topics, .. } => {
                for topic in &topics {
                    gate.remove_reader(topic);
                }
            }
        }
    }

    /// Replace-set: moves the socket to exactly the rooms for `list`, joining
    /// only the rooms it is not in yet and leaving only the ones it no longer
    /// wants, unless a list with the same or a higher number was already
    /// applied. Returns the socket's latest applied list.
    async fn set_subscriptions(&self, socket: &SocketRef, list: TopicList) -> SubscriptionAck {
        let mut sockets = self.sockets.lock().await;
        let Some(delivery) = sockets.get_mut(&socket.id) else {
            // disconnected while this event was in flight
            return SubscriptionAck { count: 0, seq: 0 };
        };
        let Delivery::Topics {
            topics: current,
            seq,
        } = delivery
        else {
            warn!(
                "Socket {} sent {} without connecting with {}=1, so it keeps every topic",
                socket.id, SET_SUBSCRIPTIONS_EVENT, SUBSCRIPTIONS_QUERY_KEY
            );
            return SubscriptionAck { count: 0, seq: 0 };
        };
        if list.seq <= *seq {
            debug!(
                "Socket {} sent list {} after list {}, dropping it",
                socket.id, list.seq, seq
            );
            return SubscriptionAck {
                count: current.len(),
                seq: *seq,
            };
        }
        let wanted = valid_topics(socket.id, list.topics);
        // An emit may target a room the socket is about to join, or skip one
        // it is about to leave; topics it keeps are untouched.
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
        *current = wanted;
        *seq = list.seq;
        SubscriptionAck {
            count: current.len(),
            seq: list.seq,
        }
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
    use socketioxide::handler::ConnectHandler;
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
        fn new() -> Self {
            Self::with(SocketIo::builder(), Duration::ZERO)
        }

        /// Registers sockets the way `socket_handler_with_metadata` does: in
        /// connect middleware, with a connect handler that takes
        /// `handler_delay` to run. Dummy sockets carry no query string, so
        /// the flag comes in the auth payload, `{"subscriptions": 1}`.
        fn with(builder: socketioxide::SocketIoBuilder, handler_delay: Duration) -> Self {
            let (_svc, io) = builder.build_svc();
            let subs = Arc::new(Subscriptions::default());
            let mw_subs = subs.clone();
            let register = move |socket: SocketRef, TryData(auth): TryData<serde_json::Value>| {
                let subs = mw_subs.clone();
                async move {
                    let flag = auth
                        .ok()
                        .and_then(|auth| auth.get(SUBSCRIPTIONS_QUERY_KEY).cloned());
                    subs.register(&socket, flag == Some(json!(1))).await;
                    Ok::<(), Infallible>(())
                }
            };
            let ns_subs = subs.clone();
            io.ns(
                "/",
                (async move |socket: SocketRef| {
                    tokio::time::sleep(handler_delay).await;
                    socket.on_disconnect(async move |socket: SocketRef| {
                        ns_subs.unregister(socket.id).await;
                    });
                })
                .with(register),
            );
            Server { io, subs }
        }

        async fn connect(&self, auth: serde_json::Value) -> (Sender<Packet>, Receiver<Packet>) {
            let (tx, mut rx) = self.io.new_dummy_sock("/", auth).await;
            rx.recv().await.unwrap(); // namespace connect packet
            (tx, rx)
        }

        /// Connects without the flag, like an old client.
        async fn connect_old(&self) -> (Sender<Packet>, Receiver<Packet>) {
            self.connect(json!({})).await
        }

        /// Connects with the flag, like a client that sends its topics.
        async fn connect_subscriber(&self) -> (Sender<Packet>, Receiver<Packet>) {
            self.connect(json!({ SUBSCRIPTIONS_QUERY_KEY: 1 })).await
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

    /// A `set_subscriptions` packet for list `seq` of `topics` (a JSON array).
    fn set_packet(seq: u64, topics: &str) -> Packet {
        Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",{{\"seq\":{seq},\"topics\":{topics}}}]")
                .into(),
        )
    }

    /// Sends `set_subscriptions` and returns its ack packet.
    async fn send_set(
        tx: &Sender<Packet>,
        rx: &mut Receiver<Packet>,
        seq: u64,
        topics: &str,
    ) -> String {
        tx.send(set_packet(seq, topics)).await.unwrap();
        match tokio::time::timeout(Duration::from_secs(1), rx.recv()).await {
            Ok(Some(Packet::Message(msg))) if msg.starts_with("30") => msg.to_string(),
            other => panic!("expected an ack, got {other:?}"),
        }
    }

    #[test]
    fn flag_is_read_from_the_query_string() {
        assert!(subscribes_topics(Some("clientId=abc&subscriptions=1")));
        assert!(subscribes_topics(Some("subscriptions=1&EIO=4")));
        assert!(!subscribes_topics(None));
        assert!(!subscribes_topics(Some("clientId=abc")));
        assert!(!subscribes_topics(Some("subscriptions=0")));
        assert!(!subscribes_topics(Some("subscriptions")));
        assert!(!subscribes_topics(Some("xsubscriptions=1")));
    }

    #[tokio::test]
    async fn socket_without_flag_gets_every_topic() {
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
    async fn socket_with_flag_gets_nothing_until_its_first_list() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        let (_peer_tx, mut peer_rx) = srv.connect_old().await;
        srv.emit("VCU/Speed").await;
        assert!(received_topics(&mut rx).await.is_empty());
        assert_eq!(srv.rooms().await, [EVERY_TOPIC_ROOM]);

        send_set(&tx, &mut rx, 1, r#"["VCU/Speed"]"#).await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["VCU/Speed"]);
        assert_eq!(
            received_topics(&mut peer_rx).await,
            ["VCU/Speed", "BMS/Pack/SOC", "VCU/Speed"]
        );
    }

    /// A client sends its first list as soon as the connection is acked, while
    /// the connect handler may still be running; registering in middleware
    /// means the list still finds its handler.
    #[tokio::test]
    async fn list_sent_right_after_connecting_is_applied() {
        let srv = Server::with(SocketIo::builder(), Duration::from_millis(100));
        let (tx, mut rx) = srv.connect_subscriber().await;
        let ack = send_set(&tx, &mut rx, 1, r#"["VCU/Speed"]"#).await;
        assert_eq!(ack, r#"30[{"count":1,"seq":1}]"#);
        assert_eq!(srv.rooms().await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn socket_without_flag_ignores_lists() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_old().await;
        assert_eq!(
            send_set(&tx, &mut rx, 1, r#"["VCU/Speed"]"#).await,
            r#"30[{"count":0,"seq":0}]"#
        );
        srv.emit("BMS/Pack/SOC").await;
        assert_eq!(received_topics(&mut rx).await, ["BMS/Pack/SOC"]);
        assert_eq!(srv.rooms().await, [EVERY_TOPIC_ROOM]);
    }

    #[tokio::test]
    async fn subscribed_socket_gets_only_its_topics_once() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        let ack = send_set(&tx, &mut rx, 1, r#"["BMS/Pack/SOC","BMS/Pack/SOC"]"#).await;
        assert_eq!(ack, r#"30[{"count":1,"seq":1}]"#);
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["BMS/Pack/SOC"]);
    }

    #[tokio::test]
    async fn second_set_replaces_the_first() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        send_set(&tx, &mut rx, 1, r#"["BMS/Pack/SOC"]"#).await;
        send_set(&tx, &mut rx, 2, r#"["VCU/Speed"]"#).await;
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert_eq!(received_topics(&mut rx).await, ["VCU/Speed"]);
        assert_eq!(srv.rooms().await, ["VCU/Speed"]);
    }

    #[tokio::test]
    async fn empty_list_gets_nothing() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        let (_peer_tx, mut peer_rx) = srv.connect_old().await;
        send_set(&tx, &mut rx, 1, r#"["VCU/Speed"]"#).await;
        assert_eq!(
            send_set(&tx, &mut rx, 2, "[]").await,
            r#"30[{"count":0,"seq":2}]"#
        );
        srv.emit("BMS/Pack/SOC").await;
        srv.emit("VCU/Speed").await;
        assert!(received_topics(&mut rx).await.is_empty());
        assert_eq!(
            received_topics(&mut peer_rx).await,
            ["BMS/Pack/SOC", "VCU/Speed"]
        );
        assert_eq!(srv.rooms().await, [EVERY_TOPIC_ROOM]);
    }

    #[tokio::test]
    async fn overlapping_sets_keep_shared_topics() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        let (peer_tx, mut peer_rx) = srv.connect_subscriber().await;
        send_set(&tx, &mut rx, 1, r#"["A","B"]"#).await;
        send_set(&peer_tx, &mut peer_rx, 1, r#"["B"]"#).await;
        send_set(&tx, &mut rx, 2, r#"["B","C"]"#).await;
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
    async fn older_or_repeated_list_is_dropped() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        send_set(&tx, &mut rx, 2, r#"["B"]"#).await;
        assert_eq!(
            send_set(&tx, &mut rx, 1, r#"["A","C"]"#).await,
            r#"30[{"count":1,"seq":2}]"#
        );
        assert_eq!(
            send_set(&tx, &mut rx, 2, r#"["A"]"#).await,
            r#"30[{"count":1,"seq":2}]"#
        );
        assert_eq!(srv.rooms().await, ["B"]);
    }

    #[tokio::test]
    async fn list_numbered_zero_is_dropped() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        assert_eq!(
            send_set(&tx, &mut rx, 0, r#"["B"]"#).await,
            r#"30[{"count":0,"seq":0}]"#
        );
        assert_eq!(srv.rooms().await, Vec::<String>::new());
    }

    #[tokio::test]
    async fn list_without_seq_is_ignored() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        send_set(&tx, &mut rx, 1, r#"["A"]"#).await;
        tx.send(Packet::Message(
            format!("20[\"{SET_SUBSCRIPTIONS_EVENT}\",[\"B\"]]").into(),
        ))
        .await
        .unwrap();
        assert!(
            tokio::time::timeout(Duration::from_millis(50), rx.recv())
                .await
                .is_err()
        );
        assert_eq!(srv.rooms().await, ["A"]);
    }

    /// A page releasing its topics one by one sends many lists at once; their
    /// events race, and the socket must still end on the last list sent.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn lists_sent_at_once_end_on_the_latest() {
        const LISTS: u64 = 300;
        let srv = Server::with(SocketIo::builder().max_buffer_size(4096), Duration::ZERO);
        let (tx, mut rx) = srv.connect_subscriber().await;
        let (peer_tx, mut peer_rx) = srv.connect_subscriber().await;
        send_set(&peer_tx, &mut peer_rx, 1, r#"["T0"]"#).await;
        for seq in 1..=LISTS {
            // each list one topic shorter: list LISTS keeps only T0
            let topics: Vec<String> = (0..=LISTS - seq).map(|i| format!("T{i}")).collect();
            tx.send(set_packet(seq, &serde_json::to_string(&topics).unwrap()))
                .await
                .unwrap();
        }
        let mut acks = 0;
        while acks < LISTS {
            match tokio::time::timeout(Duration::from_secs(5), rx.recv()).await {
                Ok(Some(Packet::Message(msg))) if msg.starts_with("30") => acks += 1,
                Ok(Some(_)) => {}
                other => panic!("missing acks after {acks}: {other:?}"),
            }
        }
        assert_eq!(srv.rooms().await, ["T0"]);
        assert_eq!(srv.subs.reader_counts(), (0, vec![("T0".to_string(), 2)]));
    }

    #[tokio::test]
    async fn unread_topics_are_not_serialized_or_given_a_room() {
        let srv = Server::new();
        let (tx, mut rx) = srv.connect_subscriber().await;
        send_set(&tx, &mut rx, 1, r#"["VCU/Speed"]"#).await;
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
        let (_idle_tx, _idle_rx) = srv.connect_subscriber().await;
        let (tx, mut rx) = srv.connect_subscriber().await;
        send_set(&tx, &mut rx, 1, r#"["VCU/Speed"]"#).await;
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
        let (tx, mut rx) = srv.connect_subscriber().await;
        let ack = send_set(
            &tx,
            &mut rx,
            1,
            r##"["#","BMS/#","+/Speed","","VCU/Speed"]"##,
        )
        .await;
        assert_eq!(ack, r#"30[{"count":1,"seq":1}]"#);
        assert_eq!(srv.rooms().await, ["VCU/Speed"]);
    }
}
