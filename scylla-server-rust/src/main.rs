use std::sync::Arc;

use axum::{http::Method, routing::get, Router};
use scylla_server_rust::{
    controllers::{
        self, data_type_controller, driver_controller, location_controller, node_controller,
        run_controller, system_controller,
    },
    prisma::PrismaClient,
    socket::{
        mqtt_reciever::{recieve_mqtt, MqttReciever},
        socket_handler,
    },
    Database,
};
use socketioxide::SocketIo;
use tokio::sync::mpsc;
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    let db: Database = Arc::new(PrismaClient::_builder().build().await.unwrap());

    let (socket_layer, io) = SocketIo::new_layer();

    // channel to pass the mqtt data
    // TODO tune buffer size
    let (tx, rx) = mpsc::channel::<socket_handler::ClientData>(32);

    // spawn the socket handler
    tokio::spawn(socket_handler::handle_socket(io, rx));

    // create and spawn the mock handler
    let (recv, opts) = MqttReciever::new(tx, "localhost:1883", db.clone()).await;
    tokio::spawn(recieve_mqtt(recv, opts));

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
    axum::serve(listener, app).await.unwrap();
}
