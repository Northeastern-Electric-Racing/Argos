use std::time::{Duration, Instant};

use diesel::{Connection, PgConnection};
use diesel_async::{
    AsyncPgConnection, RunQueryDsl,
    pooled_connection::{AsyncDieselConnectionManager, bb8::Pool},
};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use dotenvy::dotenv;
use scylla_server::schema::{data, data_type, run, track};
use tokio::sync::OnceCell;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();
const DB_WAIT_TIMEOUT: Duration = Duration::from_secs(60);

/// Holds the outcome of the one-time wait and migration, so only the first test pays for it and,
/// if it failed, every later test fails straight away instead of waiting again.
static DB_READY: OnceCell<Result<(), String>> = OnceCell::const_new();

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

pub async fn cleanup_and_prepare() -> Result<Pool<AsyncPgConnection>, diesel::result::Error> {
    dotenv().ok();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be specified");
    let ready = DB_READY
        .get_or_init(|| {
            let db_url = db_url.clone();
            async move {
                tokio::task::spawn_blocking(move || wait_and_migrate(&db_url))
                    .await
                    .unwrap_or_else(|e| Err(format!("database setup panicked: {e}")))
            }
        })
        .await;
    if let Err(e) = ready {
        panic!("{e}");
    }

    //let mut config = ManagerConfig::default();
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url);
    let pool: Pool<AsyncPgConnection> = Pool::builder()
        .max_size(10)
        .min_idle(Some(5))
        .max_lifetime(Some(Duration::from_secs(60 * 60 * 24)))
        .idle_timeout(Some(Duration::from_secs(60 * 2)))
        .build(manager)
        .await
        .unwrap();
    let mut client = pool.get().await.unwrap();

    diesel::delete(data::table).execute(&mut client).await?;
    diesel::delete(data_type::table)
        .execute(&mut client)
        .await?;
    diesel::delete(run::table).execute(&mut client).await?;
    diesel::delete(track::table).execute(&mut client).await?;

    Ok(pool.clone())
}
