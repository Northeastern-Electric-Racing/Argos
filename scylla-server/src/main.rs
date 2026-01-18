use std::{
    fs,
    path::Path,
    sync::{atomic::Ordering, Arc},
    time::Duration,
};

use axum::{
    extract::DefaultBodyLimit,
    http::Method,
    routing::{get, post, put},
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
        data_type_controller, file_insertion_controller,
        rule_controller::{add_rule, delete_rule, get_all_rules},
        run_controller, scylla_config_controller,
        video_streamer_controller::{self},
        OutputDirectory, VideoSuffix,
    },
    rule_structs::RuleManager,
    socket_handler::{socket_handler, socket_handler_with_metadata},
    RateLimitMode, BATCH_UPSERT_TIME, DATA_UPLOAD_DISABLE, RATE_LIMIT_MODE, SOCKET_DISCARD_PERCENT,
    STATIC_RATE_LIMIT_VALUE,
};
use scylla_server::{
    db_handler,
    mqtt_processor::{MqttProcessor, MqttProcessorOptions},
    ClientData,
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
use tracing::{debug, info, level_filters::LevelFilter, warn};
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
    batch_upsert_time: u16,

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
    static_rate_limit_value: u16,

    /// The percent of messages discarded when sent from the socket
    #[arg(
        short = 'd',
        long,
        env = "SCYLLA_SOCKET_DISCARD_PERCENT",
        default_value = "0"
    )]
    socketio_discard_percent: u8,

    /// The output directory to store the .cap and .mp4 files coming in from the odysseus daemon
    #[arg(
        short = 'o',
        long,
        env = "SCYLLA_FILE_OUTPUT_DIRECTORY",
        default_value = "files" // Do not use absolute file path unless you mean to
    )]
    output_directory: String,

    /// The suffix to find video files by
    #[arg(short = 's', long, env = "SCYLLA_VIDEO_SUFFIX", default_value = ".mp4")]
    video_suffix: String,

    /// The port to bind scylla to
    #[arg(short = 'p', long, env = "SCYLLA_PORT", default_value = "8000")]
    port: u16,

    /// Whether to disable sending of metadata over the socket to the client
    #[arg(long, env = "SCYLLA_SOCKET_DISABLE_METADATA")]
    no_metadata: bool,

    /// The authentication password for privileged pages
    #[arg(long, env = "SCYLLA_PASSWORD", default_value = "admin")]
    password: String,
}

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

fn ensure_directory_exists(path: &str) -> std::io::Result<()> {
    let dir_path = Path::new(path);
    if !dir_path.exists() {
        fs::create_dir_all(dir_path)?;
        println!("Directory created: {path}");
    } else {
        println!("Directory already exists: {path}");
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = ScyllaArgs::parse();

    println!("Initializing scylla server...");

    if let Err(e) = ensure_directory_exists(cli.output_directory.as_str()) {
        eprintln!("Failed to create directory: {e}");
    }

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

    info!("Configuring global variables");
    DATA_UPLOAD_DISABLE.store(cli.disable_data_upload, Ordering::Relaxed);
    BATCH_UPSERT_TIME.store(cli.batch_upsert_time, Ordering::Relaxed);
    RATE_LIMIT_MODE.store(cli.rate_limit_mode as u8, Ordering::Relaxed);
    STATIC_RATE_LIMIT_VALUE.store(cli.static_rate_limit_value, Ordering::Relaxed);
    SOCKET_DISCARD_PERCENT.store(cli.socketio_discard_percent, Ordering::Relaxed);

    dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be specified");

    info!("Beginning DB migration w/ temporary connection...");
    // it is best to create a temporary unmanaged connection to run the migrations
    // a completely new set of connections is created by the pool manager because it cannot understand an already established connection
    let conn: AsyncPgConnection = AsyncPgConnection::establish(&db_url).await?;
    let mut async_wrapper: AsyncConnectionWrapper<AsyncPgConnection> =
        AsyncConnectionWrapper::from(conn);
    tokio::task::spawn_blocking(
        move || match async_wrapper.run_pending_migrations(MIGRATIONS) {
            Ok(_res) => info!("Successfully migrated DB!"),
            Err(e) => warn!("Encountered Error: {}", e),
        },
    )
    .await?;

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
    io.ns("/", async |s: SocketRef| {
        s.on_disconnect(async |_: SocketRef| debug!("Socket: Client disconnected from socket"))
    });

    // channel to pass the mqtt data
    // TODO tune buffer size
    let (mqtt_send_db, mqtt_receive_db) = broadcast::channel::<ClientData>(10000);
    let (mqtt_send_socket, mqtt_receive_socket) = broadcast::channel::<ClientData>(10000);

    // channel to pass the processed data to the batch uploading thread
    // TODO tune buffer size
    let (db_send, db_receive) = mpsc::channel::<Vec<ClientData>>(1000);

    // the rules manager
    let rules_manager = Arc::new(RuleManager::new());

    // the below two threads need to cancel cleanly to ensure all queued messages are sent.  therefore they are part of the a task tracker group.
    // create a task tracker and cancellation token
    let task_tracker = TaskTracker::new();
    let token = CancellationToken::new();

    if cli.no_metadata {
        task_tracker.spawn(socket_handler(token.clone(), mqtt_receive_socket, io));
    } else {
        task_tracker.spawn(socket_handler_with_metadata(
            token.clone(),
            mqtt_receive_socket,
            rules_manager.clone(),
            io,
        ));
    }

    // spawn the database handler
    task_tracker.spawn(
        db_handler::DbHandler::new(mqtt_receive_db, pool.clone())
            .handling_loop(db_send.clone(), token.clone()),
    );
    // spawn the database inserter
    task_tracker.spawn(db_handler::DbHandler::batching_loop(
        db_receive,
        pool.clone(),
        token.clone(),
    ));

    // run prod if this isnt present
    // create and spawn the mqtt processor
    info!("Running processor in MQTT (production) mode");
    let (recv, opts) = MqttProcessor::new(
        mqtt_send_db,
        mqtt_send_socket,
        token.clone(),
        MqttProcessorOptions {
            mqtt_path: cli.siren_host_url,
        },
    );
    let (client, eventloop) = AsyncClient::new(opts, 600);
    let client_sharable: Arc<AsyncClient> = Arc::new(client);
    task_tracker.spawn(recv.process_mqtt(client_sharable.clone(), eventloop, pool.clone()));

    let app = Router::new()
        .merge(
            Router::new()
                // DATA
                .route(
                    "/data/{dataTypeName}/{runId}",
                    get(controllers::data_controller::get_data_by_run_id),
                )
                .route(
                    "/data/{dataTypeName}",
                    get(controllers::data_controller::get_data_by_timing),
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
                ),
        )
        .merge(
            Router::new()
                // CAR CONFIG
                .route(
                    "/config/set/{configKey}",
                    post(car_command_controller::send_config_command),
                )
                .layer(Extension(client_sharable)),
        )
        .merge(
            Router::new()
                // SCYLLA CONFIG
                .route(
                    "/scylla/get_settings",
                    get(scylla_config_controller::get_settings),
                )
                // DATA_UPLOAD_DISABLE --
                .route(
                    "/scylla/upload/disable",
                    put(scylla_config_controller::disable_data_upload),
                )
                .route(
                    "/scylla/upload/enable",
                    put(scylla_config_controller::enable_data_upload),
                )
                // --
                .route(
                    "/scylla/batch_time/{time_sec}",
                    put(scylla_config_controller::batch_upsert_set),
                )
                .route(
                    "/scylla/ratelimit_mode/{mode_idex}",
                    put(scylla_config_controller::rate_limit_mode_set),
                )
                .route(
                    "/scylla/static_ratelimit_time/{time_ms}",
                    put(scylla_config_controller::static_ratelimit_time_set),
                )
                .route(
                    "/scylla/socket_discard_percent/{discard_perc}",
                    put(scylla_config_controller::socket_discard_percent_set),
                ),
        )
        .merge(
            Router::new()
                // FILE INSERT
                .route("/insert/file", post(file_insertion_controller::insert_file))
                .route(
                    "/insert/log",
                    post(file_insertion_controller::insert_logger_file).layer(Extension(db_send)),
                )
                .route(
                    "/insert/update_logger",
                    post(file_insertion_controller::request_logger_insert),
                )
                .route(
                    "/insert/update_serial",
                    post(file_insertion_controller::request_serial_insert),
                )
                // VIDEO STREAMING
                .route(
                    "/videos/{file_name}",
                    get(video_streamer_controller::stream_video),
                )
                .route(
                    "/videos",
                    get(video_streamer_controller::get_videos)
                        .layer(Extension(VideoSuffix(cli.video_suffix))),
                )
                .route(
                    "/videos/update",
                    post(video_streamer_controller::request_updated_videos),
                )
                .route(
                    "/authenticate",
                    post(car_command_controller::authenticate_password)
                        .layer(Extension(cli.password)),
                )
                .layer(Extension(OutputDirectory(cli.output_directory)))
                .layer(DefaultBodyLimit::disable()),
        )
        .merge(
            Router::new()
                .route("/rules/add", put(add_rule))
                .route("/rules/delete/{rule_id}", post(delete_rule))
                .route("/rules", get(get_all_rules))
                //.route("/rules/delete/{rule_id}", post()).route("/rules/poll")
                .layer(Extension(rules_manager)),
        )
        // for CORS handling
        .layer(
            CorsLayer::new()
                // allow `GET`
                .allow_methods([Method::GET, Method::POST, Method::PUT])
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

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", cli.port))
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
