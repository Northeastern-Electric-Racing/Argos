//! End-to-end check of the Rule -> notification path, in-process and without Postgres:
//! add a Rule over REST, feed datapoints into the socket delivery loop, and expect
//! `rule_notify` on a real Socket.IO client connected with the same client id.

use std::{sync::Arc, time::Duration};

use rust_socketio::{
    Event, Payload,
    asynchronous::{Client, ClientBuilder},
};
use scylla_server::{
    ClientData, argos_inserter::ArgosInserter, controllers::rule_controller::rule_router,
    rule_structs::RuleManager, socket_handler::socket_handler_with_metadata,
};
use serde_json::{Value, json};
use socketioxide::SocketIo;
use tokio::sync::{broadcast, mpsc};
use tokio_util::sync::CancellationToken;

const CLIENT_ID: &str = "e2e-client";
const TOPIC: &str = "Test/E2E/Value";
const RULE_ID: &str = "e2e-rule";
const TIMEOUT: Duration = Duration::from_secs(5);

fn datapoint(value: f32) -> ClientData {
    ClientData {
        run_id: -1,
        name: TOPIC.to_owned(),
        unit: String::new(),
        values: vec![value],
        timestamp: chrono::Utc::now(),
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn rule_added_over_rest_notifies_its_socket_client() {
    // server: the real Rule routes and socket delivery loop, on an ephemeral port
    let token = CancellationToken::new();
    let rules_manager = Arc::new(RuleManager::new());
    let (socket_layer, io) = SocketIo::new_layer();
    let (data_send, data_recv) = broadcast::channel::<ClientData>(100);
    let (db_send, _db_recv) = broadcast::channel::<ClientData>(100);
    tokio::spawn(socket_handler_with_metadata(
        token.clone(),
        data_recv,
        rules_manager.clone(),
        ArgosInserter::new(db_send),
        io.clone(),
    ));
    // the handler registers the "/" namespace (and its clientId mapping) once it starts;
    // a client connecting before that is refused with "Invalid namespace"
    tokio::time::timeout(TIMEOUT, async {
        while io.of("/").is_none() {
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
    })
    .await
    .expect("socket handler never registered the / namespace");

    let app = rule_router::<()>(rules_manager).layer(socket_layer);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let serve_token = token.clone();
    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move { serve_token.cancelled().await })
            .await
            .unwrap();
    });

    // client: identifies itself by the clientId query parameter, like angular-client
    let (notify_send, mut notify_recv) = mpsc::unbounded_channel::<Value>();
    let (ready_send, mut ready_recv) = mpsc::unbounded_channel::<()>();
    let socket = ClientBuilder::new(format!("{base}/?clientId={CLIENT_ID}"))
        .on(Event::Connect, move |_: Payload, _: Client| {
            let ready_send = ready_send.clone();
            Box::pin(async move {
                let _ = ready_send.send(());
            })
        })
        .on("rule_notify", move |payload: Payload, _: Client| {
            let notify_send = notify_send.clone();
            Box::pin(async move {
                if let Payload::Text(values) = payload {
                    for value in values {
                        let _ = notify_send.send(value);
                    }
                }
            })
        })
        .connect()
        .await
        .expect("socket client should connect");
    // connect() returns before the server acks the namespace; a Rule firing before
    // then finds no socket for the client and the server drops its subscriptions
    tokio::time::timeout(TIMEOUT, ready_recv.recv())
        .await
        .expect("no namespace connect ack within timeout");

    let res = reqwest::Client::new()
        .put(format!("{base}/rules/add"))
        .header("x-client-id", CLIENT_ID)
        .json(&json!({ "id": RULE_ID, "topic": TOPIC, "debounce_time": 0, "expr": "a > 10" }))
        .send()
        .await
        .expect("PUT /rules/add should respond");
    assert!(
        res.status().is_success(),
        "add rule failed: {}",
        res.status()
    );

    // a non-matching datapoint first, so a Rule that always fires is caught too
    data_send.send(datapoint(5.0)).unwrap();
    data_send.send(datapoint(42.0)).unwrap();

    let notification = tokio::time::timeout(TIMEOUT, notify_recv.recv())
        .await
        .expect("no rule_notify within timeout")
        .expect("notification channel closed");
    assert_eq!(notification["id"], RULE_ID);
    assert_eq!(notification["topic"], TOPIC);
    assert_eq!(notification["values"], json!([42.0]));

    socket.disconnect().await.ok();
    token.cancel();
}
