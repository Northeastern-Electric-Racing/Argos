use std::sync::Arc;

use axum::{http::Method, routing::get, Router};
use scylla_server_rust::{
    controllers::{
        self, data_type_controller, driver_controller, location_controller, node_controller,
        run_controller, system_controller,
    },
    prisma::PrismaClient,
    reciever::{db_handler, mqtt_reciever::MqttReciever, socket_handler, ClientData},
    Database,
};
use socketioxide::SocketIo;
use tokio::{
    signal,
    sync::{broadcast as Broadcaster, mpsc},
};
use tokio_util::{sync::CancellationToken, task::TaskTracker};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    // create the database stuff
    let db: Database = Arc::new(PrismaClient::_builder().build().await.unwrap());

    // create the socket stuff
    let (socket_layer, io) = SocketIo::new_layer();

    // channel to pass the mqtt data
    // TODO tune buffer size
    let (tx, rx) = Broadcaster::channel::<ClientData>(1000);
    let rx2 = tx.subscribe();

    // channel to pass the processed data to the db thread
    // TODO tune buffer size
    let (tx_proc, rx_proc) = mpsc::channel::<Vec<ClientData>>(1000000);

    // spawn the socket handler
    tokio::spawn(socket_handler::handle_socket(io, rx));

    // the below two threads need to cancel cleanly to ensure all queued messages are sent.  therefore they are part of the a task tracker group.
    // create a task tracker and cancellation token
    let task_tracker = TaskTracker::new();
    let token = CancellationToken::new();
    // spawn the database handler
    task_tracker.spawn(
        db_handler::DbHandler::new(rx2, Arc::clone(&db)).handling_loop(tx_proc, token.clone()),
    );
    // spawm the database inserter
    task_tracker.spawn(db_handler::DbHandler::batching_loop(
        rx_proc,
        Arc::clone(&db),
        token.clone(),
    ));

    // create and spawn the mqtt reciever
    let (recv, eloop) = MqttReciever::new(tx, "localhost:1883", db.clone()).await;
    tokio::spawn(recv.recieve_mqtt(eloop));

    let app = Router::new()
        // get all data with the name dataTypeName and runID as specified
        .route(
            "/data/:dataTypeName/:runId",
            get(controllers::data_controller::get_data),
        )
        // get all datatypes
        .route("/datatypes", get(data_type_controller::get_all_data_types))
        // get all drivers
        .route("/drivers", get(driver_controller::get_all_drivers))
        // get all locations
        .route("/locations", get(location_controller::get_all_locations))
        // get all nodes
        .route("/nodes", get(node_controller::get_all_nodes))
        // runs:
        // get all runs
        .route("/runs", get(run_controller::get_all_runs))
        // get run with id
        .route("/runs/:id", get(run_controller::get_run_by_id))
        // get all systems
        .route("/systems", get(system_controller::get_all_systems))
        // for CORS handling
        .layer(
            CorsLayer::new()
                // allow `GET`
                .allow_methods([Method::GET])
                // allow requests from any origin
                .allow_origin(Any),
        )
        // for socketio integration
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::permissive())
                .layer(socket_layer),
        )
        .with_state(db.clone());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    let axum_token = token.clone();
    tokio::spawn(async {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                _ = axum_token.cancelled().await;
            })
            .await
            .expect("Failed shutdown init for axum");
    });

    task_tracker.close();
    // listen for ctrl_c, then cancel, close, and await for all tasks in the tracker.  Other tasks cancel vai the default tokio system
    signal::ctrl_c()
        .await
        .expect("Could not read cancellation trigger (ctr+c)");
    token.cancel();
    task_tracker.wait().await;
}
