#[path = "test_utils.rs"]
mod test_utils;

use std::sync::atomic::Ordering;
use std::time::Duration;

use scylla_server::db_handler::DbHandler;
use scylla_server::{BATCH_UPSERT_TIME, ClientData};

use test_utils::cleanup_and_prepare;
use tokio::sync::{broadcast, mpsc};
use tokio_util::sync::CancellationToken;

// End-to-end test for handling_loop's broadcast lifecycle.
//
// Sends a small batch of messages through the broadcast, drops the
// sender, and verifies:
//   1. handling_loop exits on its own (no cancel_token used),
//   2. the pending data_queue is flushed to data_channel on exit,
//   3. exactly one batch is produced (no duplicate flush).
//
// batch_interval is set to u16::MAX seconds so a routine interval-tick
// flush cannot race the close-handling flush — any batch observed must
// come from the Err(RecvError::Closed) path.
//
// Before the fix at db_handler.rs:184, the Ok(msg) = select! arm
// silently disabled on Err(Closed); the task never exited and the
// pending batch was never flushed.
#[tokio::test]
async fn handling_loop_flushes_pending_batch_and_exits_on_sender_drop() {
    // Effectively disable the interval tick so the only flush path the
    // test can observe is the close-handling path.
    BATCH_UPSERT_TIME.store(u16::MAX, Ordering::Relaxed);

    let pool = cleanup_and_prepare().await.unwrap();

    let (broadcast_tx, broadcast_rx) = broadcast::channel::<ClientData>(32);
    let (data_tx, mut data_rx) = mpsc::channel::<Vec<ClientData>>(32);
    let cancel = CancellationToken::new();

    let handler = DbHandler::new(broadcast_rx, pool);
    let task = tokio::spawn(handler.handling_loop(data_tx, cancel.clone()));

    // Queue 3 messages, then close. Broadcast buffers these; handling_loop
    // drains all buffered Ok messages before recv() returns Err(Closed).
    for i in 0..3 {
        broadcast_tx
            .send(ClientData {
                name: "TestTopic".to_string(),
                unit: "N".to_string(),
                run_id: 0,
                timestamp: chrono::offset::Utc::now(),
                values: vec![i as f32],
            })
            .unwrap();
    }
    drop(broadcast_tx);

    // A correct implementation drains the 3 buffered messages, sees
    // Err(Closed), flushes data_queue via data_channel, and breaks.
    // 500ms is ~1000x the real time needed and generous slack for the
    // DB upsert triggered by the first new-name message.
    let result = tokio::time::timeout(Duration::from_millis(500), task).await;
    if result.is_err() {
        cancel.cancel();
    }
    let task_result = result.expect(
        "handling_loop did not exit within 500ms of broadcast sender drop — \
         Err(RecvError::Closed) is not being handled",
    );
    task_result.expect("handling_loop panicked while exiting");

    // The close-handling path must have pushed the accumulated data_queue
    // downstream as a single batch before breaking the loop.
    let flushed = data_rx.try_recv().expect(
        "handling_loop exited without flushing the 3 pending messages to data_channel",
    );
    assert_eq!(
        flushed.len(),
        3,
        "flushed batch should contain all 3 queued messages"
    );
    assert!(
        data_rx.try_recv().is_err(),
        "unexpected second batch — handling_loop should flush exactly once on exit"
    );
}
