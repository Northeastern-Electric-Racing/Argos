//! A subscribed client without a socket keeps its Rule subscriptions for a grace period,
//! instead of losing them the first time one of its Rules fires.

use std::{sync::Arc, time::Duration};

use scylla_server::{
    ClientData,
    argos_inserter::ArgosInserter,
    rule_structs::{CLIENT_GRACE_PERIOD, ClientGrace, ClientId, Rule, RuleId, RuleManager, Topic},
    socket_handler::socket_handler_with_metadata,
};
use socketioxide::SocketIo;
use tokio::{sync::broadcast, time::Instant};
use tokio_util::sync::CancellationToken;

const TOPIC: &str = "Test/Grace/Value";

fn client(id: &str) -> ClientId {
    ClientId(id.to_owned())
}

#[tokio::test]
async fn rule_firing_for_disconnected_client_keeps_its_subscriptions() {
    let token = CancellationToken::new();
    let rules_manager = Arc::new(RuleManager::new());
    let away = client("away-client");
    rules_manager
        .add_rule(
            away.clone(),
            Rule::new(
                RuleId("grace-rule".to_owned()),
                Topic(TOPIC.to_owned()),
                Duration::from_secs(0),
                "a > 10".to_owned(),
            ),
        )
        .await
        .expect("rule should be added");

    // the client never connects a socket, as after a page reload or a dropped connection
    let (_socket_layer, io) = SocketIo::new_layer();
    let (data_send, data_recv) = broadcast::channel::<ClientData>(100);
    let (db_send, _db_recv) = broadcast::channel::<ClientData>(100);
    tokio::spawn(socket_handler_with_metadata(
        token.clone(),
        data_recv,
        rules_manager.clone(),
        ArgosInserter::new(db_send),
        io,
    ));

    data_send
        .send(ClientData {
            run_id: -1,
            name: TOPIC.to_owned(),
            unit: String::new(),
            values: vec![42.0],
            timestamp: chrono::Utc::now(),
        })
        .unwrap();
    tokio::time::sleep(Duration::from_millis(300)).await;

    assert_eq!(rules_manager.get_client_rules(away).await.len(), 1);
    token.cancel();
}

/// Runs the real delivery loop for a client that never connects, on tokio's paused clock so
/// the grace period passes instantly.
#[tokio::test(start_paused = true)]
async fn client_away_past_grace_period_loses_its_subscriptions() {
    let token = CancellationToken::new();
    let rules_manager = Arc::new(RuleManager::new());
    let away = client("long-gone-client");
    rules_manager
        .add_rule(
            away.clone(),
            Rule::new(
                RuleId("grace-rule".to_owned()),
                Topic(TOPIC.to_owned()),
                Duration::from_secs(0),
                "a > 10".to_owned(),
            ),
        )
        .await
        .expect("rule should be added");

    let (_socket_layer, io) = SocketIo::new_layer();
    let (_data_send, data_recv) = broadcast::channel::<ClientData>(100);
    let (db_send, _db_recv) = broadcast::channel::<ClientData>(100);
    tokio::spawn(socket_handler_with_metadata(
        token.clone(),
        data_recv,
        rules_manager.clone(),
        ArgosInserter::new(db_send),
        io,
    ));

    tokio::time::sleep(CLIENT_GRACE_PERIOD.saturating_sub(Duration::from_secs(30))).await;
    assert_eq!(
        rules_manager.get_client_rules(away.clone()).await.len(),
        1,
        "still within the grace period"
    );

    tokio::time::sleep(Duration::from_secs(60)).await;
    assert!(
        rules_manager.get_client_rules(away).await.is_empty(),
        "past the grace period"
    );
    token.cancel();
}

/// No client expired, for comparing sweep results
fn none() -> Vec<ClientId> {
    Vec::new()
}

#[test]
fn connected_client_is_never_expired() {
    let mut grace = ClientGrace::new(Duration::from_secs(60));
    let here = [client("here")];
    let start = Instant::now();
    for minutes in [0, 5, 60] {
        let now = start + Duration::from_mins(minutes);
        assert_eq!(grace.sweep(&here, |_| true, now), none());
    }
}

#[test]
fn disconnected_client_expires_only_after_grace_period() {
    let mut grace = ClientGrace::new(Duration::from_secs(60));
    let away = [client("away")];
    let start = Instant::now();

    assert_eq!(grace.sweep(&away, |_| false, start), none());
    let almost = start + Duration::from_secs(59);
    assert_eq!(grace.sweep(&away, |_| false, almost), none());
    let past = start + Duration::from_secs(60);
    assert_eq!(grace.sweep(&away, |_| false, past), away.to_vec());
}

#[test]
fn reconnecting_resets_the_grace_period() {
    let mut grace = ClientGrace::new(Duration::from_secs(60));
    let flaky = [client("flaky")];
    let start = Instant::now();

    // away, back before the grace period ends, then away again much later
    assert_eq!(grace.sweep(&flaky, |_| false, start), none());
    let back = start + Duration::from_secs(30);
    assert_eq!(grace.sweep(&flaky, |_| true, back), none());
    let away_again = start + Duration::from_hours(1);
    assert_eq!(grace.sweep(&flaky, |_| false, away_again), none());
    let still_within = away_again + Duration::from_secs(59);
    assert_eq!(grace.sweep(&flaky, |_| false, still_within), none());
}

#[test]
fn expired_client_is_reported_once() {
    let mut grace = ClientGrace::new(Duration::from_secs(60));
    let away = [client("away")];
    let start = Instant::now();

    assert_eq!(grace.sweep(&away, |_| false, start), none());
    let past = start + Duration::from_secs(61);
    assert_eq!(grace.sweep(&away, |_| false, past), away.to_vec());
    // once its subscriptions are removed it is no longer subscribed, so it isn't swept again
    assert_eq!(grace.sweep(&[], |_| false, past), none());
}
