use std::{
    sync::{atomic::Ordering, Arc},
    time::Duration,
};

use axum::{
    extract::DefaultBodyLimit,
    http::Method,
    routing::{get, post},
    Extension, Router,
};
use clap::Parser;
use diesel_async::async_connection_wrapper::AsyncConnectionWrapper;
use diesel_async::{
    pooled_connection::{bb8::Pool, AsyncDieselConnectionManager},
    AsyncConnection, AsyncPgConnection,
};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use dotenvy::dotenv;
use rumqttc::v5::AsyncClient;
use scylla_server::{
    controllers::{
        self,
        car_command_controller::{self},
        data_type_controller, file_insertion_controller, run_controller,
    },
    services::run_service::{self},
    socket_handler::{socket_handler, socket_handler_with_metadata},
    RateLimitMode,
};
use scylla_server::{
    db_handler,
    mqtt_processor::{MqttProcessor, MqttProcessorOptions},
    ClientData, RUN_ID,
};
use socketioxide::{extract::SocketRef, SocketIo};
use tokio::{
    signal,
    sync::{broadcast, mpsc},
};
use tokio_util::{sync::CancellationToken, task::TaskTracker};
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::{debug, info, level_filters::LevelFilter};
use tracing_subscriber::{fmt::format::FmtSpan, EnvFilter};

#[cfg(not(target_env = "msvc"))]
use tikv_jemallocator::Jemalloc;

#[cfg(not(target_env = "msvc"))]
#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;

/// Scylla command line arguments
#[derive(Parser, Debug)]
#[command(version)]
struct ScyllaArgs {
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

    /// Whether to disable sending of metadata over the socket to the client
    #[arg(long, env = "SCYLLA_SOCKET_DISABLE_METADATA")]
    no_metadata: bool,
}

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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

    dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be specified");

    info!("Beginning DB migration w/ temporary connection...");
    // it is best to create a temporary unmanaged connection to run the migrations
    // a completely new set of connections is created by the pool manager because it cannot understand an already established connection
    let conn: AsyncPgConnection = AsyncPgConnection::establish(&db_url).await?;
    let mut async_wrapper: AsyncConnectionWrapper<AsyncPgConnection> =
        AsyncConnectionWrapper::from(conn);
    tokio::task::spawn_blocking(move || {
        async_wrapper.run_pending_migrations(MIGRATIONS).unwrap();
    })
    .await?;
    info!("Successfully migrated DB!");

    info!("Initializing database connections...");
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url);
    let pool: Pool<AsyncPgConnection> = Pool::builder()
        .max_size(10)
        .min_idle(Some(2))
        .max_lifetime(Some(Duration::from_secs(60 * 60 * 24)))
        .idle_timeout(Some(Duration::from_secs(60 * 2)))
        .build(manager)
        .await?;

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
    let (mqtt_send, mqtt_receive) = broadcast::channel::<ClientData>(10000);

    // channel to pass the processed data to the batch uploading thread
    // TODO tune buffer size
    let (db_send, db_receive) = mpsc::channel::<Vec<ClientData>>(1000);

    // the below two threads need to cancel cleanly to ensure all queued messages are sent.  therefore they are part of the a task tracker group.
    // create a task tracker and cancellation token
    let task_tracker = TaskTracker::new();
    let token = CancellationToken::new();

    if cli.no_metadata {
        task_tracker.spawn(socket_handler(
            token.clone(),
            mqtt_receive,
            cli.socketio_discard_percent,
            io,
        ));
    } else {
        task_tracker.spawn(socket_handler_with_metadata(
            token.clone(),
            mqtt_receive,
            cli.socketio_discard_percent,
            io,
        ));
    }

    // spawn the database handler
    task_tracker.spawn(
        db_handler::DbHandler::new(
            mqtt_send.subscribe(),
            pool.clone(),
            cli.batch_upsert_time * 1000,
        )
        .handling_loop(db_send.clone(), token.clone()),
    );
    // spawn the database inserter, if we have it enabled
    if !cli.disable_data_upload {
        task_tracker.spawn(db_handler::DbHandler::batching_loop(
            db_receive,
            pool.clone(),
            token.clone(),
        ));
    } else {
        task_tracker.spawn(db_handler::DbHandler::fake_batching_loop(
            db_receive,
            token.clone(),
        ));
    }

    // creates the initial run
    let curr_run =
        run_service::create_run(&mut pool.get().await.unwrap(), chrono::offset::Utc::now())
            .await
            .expect("Could not create initial run!");
    debug!("Configuring current run: {:?}", curr_run);

    RUN_ID.store(curr_run.runId, Ordering::Relaxed);
    // run prod if this isnt present
    // create and spawn the mqtt processor
    info!("Running processor in MQTT (production) mode");
    let (recv, opts) = MqttProcessor::new(
        mqtt_send,
        token.clone(),
        MqttProcessorOptions {
            mqtt_path: cli.siren_host_url,
            initial_run: curr_run.runId,
            static_rate_limit_time: cli.static_rate_limit_value,
            rate_limit_mode: cli.rate_limit_mode,
        },
    );
    let (client, eventloop) = AsyncClient::new(opts, 600);
    let client_sharable: Arc<AsyncClient> = Arc::new(client);
    task_tracker.spawn(recv.process_mqtt(client_sharable.clone(), eventloop));

    let app = Router::new()
        // DATA
        .route(
            "/data/{dataTypeName}/{runId}",
            get(controllers::data_controller::get_data),
        )
        // DATA TYPE
        .route("/datatypes", get(data_type_controller::get_all_data_types))
        .route("/runs", get(run_controller::get_all_runs))
        .route("/runs/latest", get(run_controller::get_latest_run))
        .route("/runs/{id}", get(run_controller::get_run_by_id))
        .route("/runs/new", post(run_controller::new_run))
        .route(
            "/runs/new/{driver}/{location}/{notes}",
            post(run_controller::new_run_with_data),
        )
        .route(
            "/runs/update/{id}/{driver}/{location}/{notes}",
            post(run_controller::update_run_with_data),
        )
        // CONFIG
        .route(
            "/config/set/{configKey}",
            post(car_command_controller::send_config_command).layer(Extension(client_sharable)),
        )
        // FILE INSERT
        .route("/insert/file", post(file_insertion_controller::insert_file))
        .layer(Extension(db_send))
        .layer(DefaultBodyLimit::disable())
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
        .with_state(pool.clone());

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
    Ok(())
}
