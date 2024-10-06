use std::{
    sync::{atomic::Ordering, Arc},
    time::Duration,
};

use axum::{
    http::Method,
    routing::{get, post},
    Extension, Router,
};
use clap::Parser;
use prisma_client_rust::chrono;
use rumqttc::v5::AsyncClient;
use scylla_server::RUN_ID;
use scylla_server::{
    controllers::{
        self,
        car_command_controller::{self},
        data_type_controller, driver_controller, location_controller, node_controller,
        run_controller, system_controller,
    },
    prisma::PrismaClient,
    processors::{
        db_handler,
        mock_processor::MockProcessor,
        mqtt_processor::{MqttProcessor, MqttProcessorOptions},
        ClientData,
    },
    services::run_service::{self},
    Database, RateLimitMode,
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

/// Scylla command line arguments
#[derive(Parser, Debug)]
#[command(version)]
struct ScyllaArgs {
    /// Whether to enable the Scylla production mode
    #[arg(short = 'p', long, env = "SCYLLA_PROD")]
    prod: bool,

    /// Whether to enable batch saturation (parallel batching)
    #[arg(short = 's', long, env = "SCYLLA_SATURATE_BATCH")]
    saturate_batch: bool,

    /// Whether to disable batch data uploading (will not disable upsertion of special types)
    #[arg(long, env = "SCYLLA_DATA_UPLOAD_DISABLE")]
    disable_data_upload: bool,

    // /// Whether to enable the socket io server in Scylla
    // #[arg(short, long, env = "SCYLLA_SOCKET")]
    // socket: bool,
    /// The host url of the siren, including port and excluding protocol prefix
    #[arg(
        short = 'u',
        long,
        env = "SCYLLA_SIREN_HOST_URL",
        default_value = "localhost:1883"
    )]
    siren_host_url: String,

    /// The time, in seconds between collection for a batch upsert
    #[arg(
        short = 't',
        long,
        env = "SCYLLA_BATCH_UPSERT_TIME",
        default_value = "10"
    )]
    batch_upsert_time: u64,

    /// The rate limit mode to use
    #[arg(
        short = 'm',
        long,
        env = "SCYLLA_RATE_LIMIT_MODE",
        default_value_t = RateLimitMode::None,
        value_enum,
    )]
    rate_limit_mode: RateLimitMode,

    /// The static rate limit number to use in ms
    #[arg(
        short = 'v',
        long,
        env = "SCYLLA_STATIC_RATE_LIMIT_VALUE",
        default_value = "100"
    )]
    static_rate_limit_value: u64,

    /// The percent of messages discarded when sent from the socket
    #[arg(
        short = 'd',
        long,
        env = "SCYLLA_SOCKET_DISCARD_PERCENT",
        default_value = "0"
    )]
    socketio_discard_percent: u8,
}

#[tokio::main]
async fn main() {
    let cli = ScyllaArgs::parse();

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
    let (socket_layer, io) = SocketIo::builder()
        .max_buffer_size(4096) // TODO tune values
        .connect_timeout(Duration::from_secs(5)) // may be unecessary
        .ping_timeout(Duration::from_secs(5)) // may be unecessary
        .ack_timeout(Duration::from_millis(1500)) // this should be well below the time to fill max buffer size above
        .build_layer();
    io.ns("/", |s: SocketRef| {
        s.on_disconnect(|_: SocketRef| debug!("Socket: Client disconnected from socket"))
    });

    // channel to pass the mqtt data
    // TODO tune buffer size
    let (mqtt_send, mqtt_receive) = mpsc::channel::<ClientData>(10000);

    // channel to pass the processed data to the db thread
    // TODO tune buffer size
    let (db_send, db_receive) = mpsc::channel::<Vec<ClientData>>(1000);

    // the below two threads need to cancel cleanly to ensure all queued messages are sent.  therefore they are part of the a task tracker group.
    // create a task tracker and cancellation token
    let task_tracker = TaskTracker::new();
    let token = CancellationToken::new();
    // spawn the database handler
    task_tracker.spawn(
        db_handler::DbHandler::new(mqtt_receive, Arc::clone(&db), cli.batch_upsert_time * 1000)
            .handling_loop(db_send, token.clone()),
    );
    // spawn the database inserter, if we have it enabled
    if !cli.disable_data_upload {
        task_tracker.spawn(db_handler::DbHandler::batching_loop(
            db_receive,
            Arc::clone(&db),
            cli.saturate_batch,
            token.clone(),
        ));
    } else {
        task_tracker.spawn(db_handler::DbHandler::fake_batching_loop(
            db_receive,
            token.clone(),
        ));
    }

    // if PROD_SCYLLA=false, also procur a client for use in the config state
    let client: Option<Arc<AsyncClient>> = if !cli.prod {
        info!("Running processor in mock mode, no data will be stored");
        let recv = MockProcessor::new(io);
        tokio::spawn(recv.generate_mock());
        None
    } else {
        // creates the initial run
        let curr_run = run_service::create_run(&db, chrono::offset::Utc::now().timestamp_millis())
            .await
            .expect("Could not create initial run!");
        debug!("Configuring current run: {:?}", curr_run);

        RUN_ID.store(curr_run.id, Ordering::Relaxed);
        // run prod if this isnt present
        // create and spawn the mqtt processor
        info!("Running processor in MQTT (production) mode");
        let (recv, opts) = MqttProcessor::new(
            mqtt_send,
            io,
            token.clone(),
            MqttProcessorOptions {
                mqtt_path: cli.siren_host_url,
                initial_run: curr_run.id,
                static_rate_limit_time: cli.static_rate_limit_value,
                rate_limit_mode: cli.rate_limit_mode,
                upload_ratio: cli.socketio_discard_percent,
            },
        );
        let (client, eventloop) = AsyncClient::new(opts, 600);
        let client_sharable: Arc<AsyncClient> = Arc::new(client);
        task_tracker.spawn(recv.process_mqtt(client_sharable.clone(), eventloop));
        Some(client_sharable)
    };

    let app = Router::new()
        // DATA
        .route(
            "/data/:dataTypeName/:runId",
            get(controllers::data_controller::get_data),
        )
        // DATA TYPE
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
        .route("/runs/new", post(run_controller::new_run))
        // SYSTEMS
        .route("/systems", get(system_controller::get_all_systems))
        // CONFIG
        .route(
            "/config/set/:configKey",
            post(car_command_controller::send_config_command).layer(Extension(client)),
        )
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
