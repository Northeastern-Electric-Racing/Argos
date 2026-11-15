use std::time::Duration;

use diesel_async::{
    AsyncConnection, AsyncPgConnection, async_connection_wrapper::AsyncConnectionWrapper,
};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use tracing::warn;

use crate::{ArgosPoolHandle, PoolHandle, build_pool, track_handler::TracksChanged};

const ARGOS_MIGRATIONS: EmbeddedMigrations = embed_migrations!("argos_migrations");

const RETRY_AFTER: Duration = Duration::from_secs(5);

/// A pool for the argos database at `database_url`, which holds Argos-only data such as tracks, migrated first
pub async fn connect(
    database_url: &str,
) -> Result<PoolHandle, Box<dyn std::error::Error + Send + Sync>> {
    let mut async_wrapper: AsyncConnectionWrapper<AsyncPgConnection> =
        AsyncConnectionWrapper::from(AsyncPgConnection::establish(database_url).await?);
    tokio::task::spawn_blocking(move || {
        async_wrapper
            .run_pending_migrations(ARGOS_MIGRATIONS)
            .map(|_| ())
    })
    .await??;

    Ok(build_pool(database_url).await?)
}

/// Connects to the argos database, retrying until it answers since it may start after scylla, then wakes the track
/// handler to load the tracks
pub async fn keep_connecting(
    database_url: String,
    ArgosPoolHandle(pool): ArgosPoolHandle,
    TracksChanged(tracks_changed): TracksChanged,
) {
    loop {
        match connect(&database_url).await {
            Ok(connected) => {
                let _ = pool.set(connected);
                tracks_changed.notify_one();
                return;
            }
            Err(e) => {
                warn!("Argos database unavailable, retrying in {RETRY_AFTER:?}: {e}");
                tokio::time::sleep(RETRY_AFTER).await;
            }
        }
    }
}
