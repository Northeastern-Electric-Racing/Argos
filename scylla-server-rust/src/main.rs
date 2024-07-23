use std::sync::Arc;

use axum::{
    http::Method,
    routing::{get, post},
    Extension, Router,
};
use prisma_client_rust::chrono;
use scylla_server_rust::{
    controllers::{
        self, data_type_controller, driver_controller, location_controller, node_controller,
        run_controller, system_controller,
    },
    prisma::PrismaClient,
    processors::{
        db_handler, mock_processor::MockProcessor, mqtt_processor::MqttProcessor, ClientData,
    },
    services::run_service::{self, public_run},
    Database,
};
use socketioxide::{extract::SocketRef, SocketIo};
use tokio::{signal, sync::mpsc};
use tokio_util::{sync::CancellationToken, task::TaskTracker};
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::{debug, info, level_filters::LevelFilter};
use tracing_subscriber::{fmt::format::FmtSpan, EnvFilter};

#[tokio::main]
async fn main() {
    println!("Initializing scylla server...");

    #[cfg(feature = "top")]
    {
        println!("Initializing tokio console subscriber");
        console_subscriber::init();
    }

    #[cfg(not(feature = "top"))]
    {
        println!("Initializing fmt subscriber");
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
    }

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
    let (mqtt_send, mqtt_receive) = mpsc::channel::<ClientData>(10000);

    // channel to pass the processed data to the db thread
    // TODO tune buffer size
    let (db_send, db_receive) = mpsc::channel::<Vec<ClientData>>(1000);

    // channel to update the run to a new value
    let (new_run_send, new_run_receive) = mpsc::channel::<public_run::Data>(5);

    // the below two threads need to cancel cleanly to ensure all queued messages are sent.  therefore they are part of the a task tracker group.
    // create a task tracker and cancellation token
    let task_tracker = TaskTracker::new();
    let token = CancellationToken::new();
    // spawn the database handler
    task_tracker.spawn(
        db_handler::DbHandler::new(mqtt_receive, Arc::clone(&db))
            .handling_loop(db_send, token.clone()),
    );
    // spawn the database inserter
    task_tracker.spawn(db_handler::DbHandler::batching_loop(
        db_receive,
        Arc::clone(&db),
        token.clone(),
    ));

    // if PROD_SCYLLA=false
    if std::env::var("PROD_SCYLLA").is_ok_and(|f| f == "false") {
        info!("Running processor in mock mode, no data will be stored");
        let recv = MockProcessor::new(io);
        tokio::spawn(recv.generate_mock());
    } else {
        // creates the initial run
        let curr_run = run_service::create_run(&db, chrono::offset::Utc::now().timestamp_millis())
            .await
            .expect("Could not create initial run!");
        debug!("Configuring current run: {:?}", curr_run);

        // run prod if this isnt present
        // create and spawn the mqtt processor
        info!("Running processor in MQTT (production) mode");
        let recv = MqttProcessor::new(
            mqtt_send,
            new_run_receive,
            std::env::var("PROD_SIREN_HOST_URL").unwrap_or("localhost:1883".to_string()),
            curr_run.id,
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
        .route(
            "/runs/new",
            post(run_controller::new_run).layer(Extension(new_run_send)),
        )
        // SYSTEMS
        .route("/systems", get(system_controller::get_all_systems))
        // for CORS handling
        .layer(
            CorsLayer::new()
                // allow `GET`
                .allow_methods([Method::GET, Method::POST])
                // allow requests from any origin
                .allow_origin(Any),
        )
        // for socketio integration
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::permissive())
                .layer(socket_layer),
        )
        .layer(TraceLayer::new_for_http())
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
