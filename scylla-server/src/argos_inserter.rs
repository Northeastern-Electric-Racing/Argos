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
