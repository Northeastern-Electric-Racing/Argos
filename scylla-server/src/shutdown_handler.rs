use std::{sync::atomic::Ordering, time::Duration};

use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;
use tracing::{debug, info, trace, warn};

use crate::{
    ClientData,
    shutdown_loop::tracker::{SHUTDOWN_TOPIC_PREFIX, ShutdownTracker},
};

/// How often the loop status and active Faults are published even when nothing changed, so clients
/// can tell the status is fresh and staleness and grace windows are re-evaluated without new messages
const HEARTBEAT: Duration = Duration::from_secs(1);

/// Works out the shutdown loop status from the live datapoints and publishes it as `Argos/Shutdown/*`
/// datapoints into the same channels MQTT data takes: `socket_tx` reaches clients, Rules and the
/// Fault list, `db_tx` stores them with the current Run (ADR 0009)
pub async fn shutdown_handler(
    cancel_token: CancellationToken,
    mut data_rx: broadcast::Receiver<ClientData>,
    socket_tx: broadcast::Sender<ClientData>,
    db_tx: broadcast::Sender<ClientData>,
) {
    info!(task = "shutdown_handler", "starting");
    let mut tracker = ShutdownTracker::new();
    let mut heartbeat = tokio::time::interval(HEARTBEAT);
    loop {
        tokio::select! {
            () = cancel_token.cancelled() => {
                debug!("Shutting down shutdown handler!");
                break;
            },
            res = data_rx.recv() => match res {
                Ok(data) => {
                    // our own output comes back through the socket channel
                    if data.name.starts_with(SHUTDOWN_TOPIC_PREFIX) {
                        continue;
                    }
                    let now = chrono::Utc::now().timestamp_millis();
                    if let Some(&value) = data.values.first()
                        && tracker.record(&data.name, value, now)
                    {
                        publish(tracker.evaluate(now, false), &socket_tx, &db_tx);
                    }
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    warn!("Shutdown handler lagged behind, skipped {} messages!", n);
                }
                Err(broadcast::error::RecvError::Closed) => {
                    debug!("Data channel closed, shutting down shutdown handler!");
                    break;
                }
            },
            _ = heartbeat.tick() => {
                let now = chrono::Utc::now().timestamp_millis();
                publish(tracker.evaluate(now, true), &socket_tx, &db_tx);
            }
        }
    }
}

fn publish(
    points: Vec<(String, Vec<f32>)>,
    socket_tx: &broadcast::Sender<ClientData>,
    db_tx: &broadcast::Sender<ClientData>,
) {
    let run_id = crate::RUN_ID.load(Ordering::Relaxed);
    // every datapoint needs a Run, which the first car message creates
    if run_id == -1 || points.is_empty() {
        return;
    }
    let timestamp = chrono::Utc::now();
    for (name, values) in points {
        trace!("Publishing {}: {:?}", name, values);
        let data = ClientData {
            run_id,
            name,
            unit: String::new(),
            values,
            timestamp,
        };
        if let Err(err) = db_tx.send(data.clone()) {
            warn!("Could not send shutdown datapoint to the database: {}", err);
        }
        if let Err(err) = socket_tx.send(data) {
            warn!("Could not send shutdown datapoint to the socket: {}", err);
        }
    }
}
