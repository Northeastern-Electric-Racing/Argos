use std::sync::Arc;

use axum::{http::Method, routing::get, Router};
use scylla_server_rust::{
    controllers::{
        self, data_type_controller, driver_controller, location_controller, node_controller,
        run_controller, system_controller,
    },
    prisma::PrismaClient,
    processors::{
        db_handler, mock_processor::MockProcessor, mqtt_processor::MqttProcessor, ClientData,
    },
    Database,
};
use socketioxide::{extract::SocketRef, SocketIo};
use tokio::{signal, sync::mpsc};
use tokio_util::{sync::CancellationToken, task::TaskTracker};
use tower::ServiceBuilder;
use tower_http::cors::{Any, CorsLayer};
use tracing::{debug, info, level_filters::LevelFilter};
use tracing_subscriber::{fmt::format::FmtSpan, EnvFilter};

#[tokio::main]
async fn main() {
    println!("Initializing scylla server...");
    // construct a subscriber that prints formatted traces to stdout
    // if RUST_LOG is not set, defaults to loglevel INFO
    let subscriber = tracing_subscriber::fmt()
        .pretty()
        .with_thread_ids(true)
        .with_ansi(true)
        .with_thread_names(true)
        .with_span_events(FmtSpan::CLOSE)
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env_lossy(),
        )
        .finish();
    // use that subscriber to process traces emitted after this point
    tracing::subscriber::set_global_default(subscriber).expect("Could not init tracing");

    // create the database stuff
    let db: Database = Arc::new(
        PrismaClient::_builder()
            .build()
            .await
            .expect("Could not build prisma DB"),
    );

    // create the socket stuff
    let (socket_layer, io) = SocketIo::new_layer();
    io.ns("/", |s: SocketRef| {
        s.on_disconnect(|_: SocketRef| debug!("Socket: Client disconnected from socket"))
    });

    // channel to pass the mqtt data
    // TODO tune buffer size
    let (mqtt_receive, mqtt_send) = mpsc::channel::<ClientData>(10000);

    // channel to pass the processed data to the db thread
    // TODO tune buffer size
    let (db_receive, db_send) = mpsc::channel::<Vec<ClientData>>(1000);

    // the below two threads need to cancel cleanly to ensure all queued messages are sent.  therefore they are part of the a task tracker group.
    // create a task tracker and cancellation token
    let task_tracker = TaskTracker::new();
    let token = CancellationToken::new();
    // spawn the database handler
    task_tracker.spawn(
        db_handler::DbHandler::new(mqtt_send, Arc::clone(&db))
            .handling_loop(db_receive, token.clone()),
    );
    // spawn the database inserter
    task_tracker.spawn(db_handler::DbHandler::batching_loop(
        db_send,
        Arc::clone(&db),
        token.clone(),
    ));

    // if PROD_SCYLLA=false
    if std::env::var("PROD_SCYLLA").is_ok_and(|f| f == "false") {
        info!("Running processor in mock mode, no data will be stored");
        let recv = MockProcessor::new(io);
        tokio::spawn(recv.generate_mock());
    } else {
        // run prod if this isnt present
        // create and spawn the mqtt processor
        info!("Running processor in MQTT (production) mode");
        let recv = MqttProcessor::new(
            mqtt_receive,
            std::env::var("PROD_SIREN_HOST_URL").unwrap_or("localhost:1883".to_string()),
            db.clone(),
            io,
        )
        .await;
        tokio::spawn(recv.process_mqtt());
    }

    let app = Router::new()
        // DATA ROUTES
        .route(
            "/data/:dataTypeName/:runId",
            get(controllers::data_controller::get_data),
        )
        // DATA TYPE ROUTES
        .route("/datatypes", get(data_type_controller::get_all_data_types))
        // DRIVERS
        .route("/drivers", get(driver_controller::get_all_drivers))
        // LOCATIONS
        .route("/locations", get(location_controller::get_all_locations))
        // NODES
        .route("/nodes", get(node_controller::get_all_nodes))
        // RUNS
        .route("/runs", get(run_controller::get_all_runs))
        .route("/runs/:id", get(run_controller::get_run_by_id))
        // SYSTEMS
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

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000")
        .await
        .expect("Could not bind to 8000!");
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

    info!("Initialization complete, ready...");
    info!("Use Ctrl+C or SIGINT to exit cleanly!");

    // listen for ctrl_c, then cancel, close, and await for all tasks in the tracker.  Other tasks cancel vai the default tokio system
    signal::ctrl_c()
        .await
        .expect("Could not read cancellation trigger (ctr+c)");
    info!("Received exit signal, shutting down!");
    token.cancel();
    task_tracker.wait().await;
}
