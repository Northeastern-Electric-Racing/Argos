use tokio::sync::broadcast;
use tracing::warn;

use crate::ClientData;

/// Use this anywhere the server itself needs to insert a datapoint into the DB
/// (i.e. anything that isn't coming from MQTT). Publishes into the same
/// broadcast the MQTT processor uses, so points flow through `handling_loop`
/// and `batching_loop` like any other datapoint.
#[derive(Clone)]
pub struct ArgosInserter {
    sender: broadcast::Sender<ClientData>,
}

impl ArgosInserter {
    pub fn new(sender: broadcast::Sender<ClientData>) -> Self {
        Self { sender }
    }

    /// Push a synthetic ClientData into the db-bound broadcast. Warn-logs and
    /// returns silently if the channel has no active receivers, never panics.
    pub fn insert(&self, data: ClientData) {
        if let Err(err) = self.sender.send(data) {
            warn!("ArgosInserter send failed (no active receivers): {}", err);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample(name: &str) -> ClientData {
        ClientData {
            run_id: 1,
            name: name.to_string(),
            unit: String::new(),
            values: vec![42.0],
            timestamp: Utc::now(),
        }
    }

    #[tokio::test]
    async fn insert_delivers_to_receiver() {
        let (tx, mut rx) = broadcast::channel::<ClientData>(4);
        let inserter = ArgosInserter::new(tx);

        inserter.insert(sample("Argos/Message"));

        let received = rx.try_recv().expect("receiver should have a message");
        assert_eq!(received.name, "Argos/Message");
        assert_eq!(received.values, vec![42.0]);
    }

    #[tokio::test]
    async fn insert_with_no_receivers_does_not_panic() {
        let (tx, rx) = broadcast::channel::<ClientData>(4);
        drop(rx);
        let inserter = ArgosInserter::new(tx);

        inserter.insert(sample("Argos/Message"));
    }
}
