use diesel::sql_types::{Bool, Text};
use diesel_async::{
    AsyncConnection, AsyncPgConnection, RunQueryDsl,
    async_connection_wrapper::AsyncConnectionWrapper,
};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};

use crate::{PoolHandle, build_pool};

/// Holds Argos-only data such as tracks, beside the car database on the same server
pub const ARGOS_DATABASE_NAME: &str = "argos_experimental";

const ARGOS_MIGRATIONS: EmbeddedMigrations = embed_migrations!("argos_migrations");

/// The URL of the database `database_name` on the server of `database_url`, with the same credentials and options
pub fn database_url_with_name(
    database_url: &str,
    database_name: &str,
) -> Result<String, url::ParseError> {
    let mut url = url::Url::parse(database_url)?;
    url.set_path(database_name);
    Ok(url.into())
}

/// A pool for the database `database_name` on the server of `database_url`, which is created and migrated first if needed
pub async fn connect(
    database_url: &str,
    database_name: &str,
) -> Result<PoolHandle, Box<dyn std::error::Error + Send + Sync>> {
    let argos_database_url = database_url_with_name(database_url, database_name)?;
    create_database_if_missing(
        &mut AsyncPgConnection::establish(database_url).await?,
        database_name,
    )
    .await?;

    let mut async_wrapper: AsyncConnectionWrapper<AsyncPgConnection> =
        AsyncConnectionWrapper::from(AsyncPgConnection::establish(&argos_database_url).await?);
    tokio::task::spawn_blocking(move || {
        async_wrapper
            .run_pending_migrations(ARGOS_MIGRATIONS)
            .map(|_| ())
    })
    .await??;

    Ok(build_pool(&argos_database_url).await?)
}

async fn create_database_if_missing(
    connection: &mut AsyncPgConnection,
    database_name: &str,
) -> Result<(), diesel::result::Error> {
    let exists: bool = diesel::select(
        diesel::dsl::sql::<Bool>("EXISTS (SELECT FROM pg_database WHERE datname = ")
            .bind::<Text, _>(database_name)
            .sql(")"),
    )
    .get_result(connection)
    .await?;
    if !exists {
        diesel::sql_query(format!("CREATE DATABASE \"{database_name}\""))
            .execute(connection)
            .await?;
    }
    Ok(())
}
