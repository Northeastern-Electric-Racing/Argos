use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use diesel::{Connection, PgConnection};
use diesel_async::{
    AsyncPgConnection, RunQueryDsl,
    pooled_connection::{AsyncDieselConnectionManager, bb8::Pool},
};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use dotenvy::dotenv;
use scylla_server::{
    ArgosPoolHandle, argos_database,
    argos_schema::{lap, track},
    schema::{data, data_type, run},
};
use tokio::sync::OnceCell;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!();
const DB_WAIT_TIMEOUT: Duration = Duration::from_secs(60);

/// Holds the outcome of the one-time wait and migration, so only the first test pays for it and,
/// if it failed, every later test fails straight away instead of waiting again.
static DB_READY: OnceCell<Result<(), String>> = OnceCell::const_new();

/// Retries connecting until Postgres accepts connections (it has no ready signal).
fn wait_for(db_url: &str) -> Result<PgConnection, String> {
    let start = Instant::now();
    loop {
        match PgConnection::establish(db_url) {
            Ok(conn) => return Ok(conn),
            Err(_) if start.elapsed() < DB_WAIT_TIMEOUT => {
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => {
                return Err(format!(
                    "database not reachable after {DB_WAIT_TIMEOUT:?}: {e}"
                ));
            }
        }
    }
}

/// Waits for the car and argos databases, then migrates the car one; connecting to the argos one migrates it.
fn wait_and_migrate(db_url: &str, argos_db_url: &str) -> Result<(), String> {
    wait_for(argos_db_url)?;
    wait_for(db_url)?
        .run_pending_migrations(MIGRATIONS)
        .map(|_| ())
        .map_err(|e| format!("failed to run migrations: {e}"))
}

pub async fn cleanup_and_prepare()
-> Result<(Pool<AsyncPgConnection>, ArgosPoolHandle), diesel::result::Error> {
    dotenv().ok();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be specified");
    let argos_db_url =
        std::env::var("ARGOS_DATABASE_URL").expect("ARGOS_DATABASE_URL must be specified");
    let ready = DB_READY
        .get_or_init(|| {
            let (db_url, argos_db_url) = (db_url.clone(), argos_db_url.clone());
            async move {
                tokio::task::spawn_blocking(move || wait_and_migrate(&db_url, &argos_db_url))
                    .await
                    .unwrap_or_else(|e| Err(format!("database setup panicked: {e}")))
            }
        })
        .await;
    if let Err(e) = ready {
        panic!("{e}");
    }
    let argos_pool = argos_database::connect(&argos_db_url).await.unwrap();

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

    let mut argos_client = argos_pool.get().await.unwrap();
    diesel::delete(lap::table)
        .execute(&mut argos_client)
        .await?;
    diesel::delete(track::table)
        .execute(&mut argos_client)
        .await?;

    Ok((
        pool.clone(),
        ArgosPoolHandle(Arc::new(argos_pool.clone().into())),
    ))
}
