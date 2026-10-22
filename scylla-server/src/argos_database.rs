use diesel::sql_types::{Bool, Text};
use diesel_async::{AsyncPgConnection, RunQueryDsl};
use diesel_migrations::{EmbeddedMigrations, embed_migrations};

/// Holds Argos-only data such as tracks, beside the car database on the same server
pub const ARGOS_DATABASE_NAME: &str = "argos_experimental";

pub const ARGOS_MIGRATIONS: EmbeddedMigrations = embed_migrations!("argos_migrations");

/// The URL of the database `database_name` on the server of `database_url`, with the same credentials and options
pub fn database_url_with_name(
    database_url: &str,
    database_name: &str,
) -> Result<String, url::ParseError> {
    let mut url = url::Url::parse(database_url)?;
    url.set_path(database_name);
    Ok(url.into())
}

/// Creates the database `database_name` on the server `connection` is connected to, unless it exists
pub async fn create_database_if_missing(
    connection: &mut AsyncPgConnection,
    database_name: &str,
) -> Result<(), diesel::result::Error> {
    if database_exists(connection, database_name).await? {
        return Ok(());
    }
    let created = diesel::sql_query(format!("CREATE DATABASE \"{database_name}\""))
        .execute(connection)
        .await;
    match created {
        // another scylla can create it between the check and the create
        Err(_) if database_exists(connection, database_name).await? => Ok(()),
        created => created.map(|_| ()),
    }
}

async fn database_exists(
    connection: &mut AsyncPgConnection,
    database_name: &str,
) -> Result<bool, diesel::result::Error> {
    diesel::select(
        diesel::dsl::sql::<Bool>("EXISTS (SELECT FROM pg_database WHERE datname = ")
            .bind::<Text, _>(database_name)
            .sql(")"),
    )
    .get_result(connection)
    .await
}
