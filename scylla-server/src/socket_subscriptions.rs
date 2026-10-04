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
