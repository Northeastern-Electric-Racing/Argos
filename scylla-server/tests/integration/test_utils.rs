use std::time::{Duration, Instant};

use diesel::{Connection, PgConnection};
use diesel_async::{
    AsyncConnection, AsyncPgConnection, RunQueryDsl,
    pooled_connection::{AsyncDieselConnectionManager, bb8::Pool},
};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use dotenvy::dotenv;
use scylla_server::{
    ArgosPoolHandle, PoolHandle,
    argos_database::{self, ARGOS_DATABASE_NAME, ARGOS_MIGRATIONS},
    argos_schema::track,
    schema::{data, data_type, run},
};
use tokio::sync::OnceCell;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();
const DB_WAIT_TIMEOUT: Duration = Duration::from_secs(60);

/// Holds the argos database URL from the one-time wait and setup, so only the first test pays for it and,
/// if it failed, every later test fails straight away instead of waiting again.
static DB_READY: OnceCell<Result<String, String>> = OnceCell::const_new();

/// Retries connecting until Postgres accepts connections (it has no ready signal), then migrates.
fn wait_and_migrate(db_url: &str) -> Result<(), String> {
    let start = Instant::now();
    let mut conn = loop {
        match PgConnection::establish(db_url) {
            Ok(conn) => break conn,
            Err(_) if start.elapsed() < DB_WAIT_TIMEOUT => {
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => {
                return Err(format!(
                    "database not reachable after {DB_WAIT_TIMEOUT:?}: {e}"
                ));
            }
        }
    };
    conn.run_pending_migrations(MIGRATIONS)
        .map(|_| ())
        .map_err(|e| format!("failed to run migrations: {e}"))
}

/// Creates `database_name` on the server of `db_url` if it is missing and runs the argos migrations on it,
/// as scylla does on startup. Returns the URL of `database_name`.
pub async fn prepare_argos_database(db_url: &str, database_name: &str) -> Result<String, String> {
    let mut server = AsyncPgConnection::establish(db_url)
        .await
        .map_err(|e| e.to_string())?;
    argos_database::create_database_if_missing(&mut server, database_name)
        .await
        .map_err(|e| format!("failed to create {database_name}: {e}"))?;
    let argos_db_url =
        argos_database::database_url_with_name(db_url, database_name).map_err(|e| e.to_string())?;
    let migrated_url = argos_db_url.clone();
    tokio::task::spawn_blocking(move || {
        PgConnection::establish(&migrated_url)
            .map_err(|e| e.to_string())?
            .run_pending_migrations(ARGOS_MIGRATIONS)
            .map(|_| ())
            .map_err(|e| format!("failed to run the argos migrations: {e}"))
    })
    .await
    .map_err(|e| format!("argos database setup panicked: {e}"))??;
    Ok(argos_db_url)
}

async fn build_pool(db_url: String) -> PoolHandle {
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url);
    Pool::builder()
        .max_size(10)
        .min_idle(Some(5))
        .max_lifetime(Some(Duration::from_hours(24)))
        .idle_timeout(Some(Duration::from_mins(2)))
        .build(manager)
        .await
        .unwrap()
}

/// Prepares the car and argos databases once, empties them, and returns a pool for each
pub async fn cleanup_and_prepare() -> Result<(PoolHandle, ArgosPoolHandle), diesel::result::Error> {
    dotenv().ok();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be specified");
    let ready = DB_READY
        .get_or_init(|| async {
            let car_db_url = db_url.clone();
            tokio::task::spawn_blocking(move || wait_and_migrate(&car_db_url))
                .await
                .unwrap_or_else(|e| Err(format!("database setup panicked: {e}")))?;
            prepare_argos_database(&db_url, ARGOS_DATABASE_NAME).await
        })
        .await;
    let argos_db_url = match ready {
        Ok(argos_db_url) => argos_db_url.clone(),
        Err(e) => panic!("{e}"),
    };

    let pool = build_pool(db_url).await;
    let mut client = pool.get().await.unwrap();
    diesel::delete(data::table).execute(&mut client).await?;
    diesel::delete(data_type::table)
        .execute(&mut client)
        .await?;
    diesel::delete(run::table).execute(&mut client).await?;

    let argos_pool = build_pool(argos_db_url).await;
    let mut argos_client = argos_pool.get().await.unwrap();
    diesel::delete(track::table)
        .execute(&mut argos_client)
        .await?;

    Ok((pool.clone(), ArgosPoolHandle(argos_pool.clone())))
}
