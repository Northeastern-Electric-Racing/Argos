use axum::http::StatusCode;
use scylla_server::{
    ArgosPoolHandle,
    argos_database::{ARGOS_DATABASE_NAME, database_url_with_name},
    error::ScyllaError,
};

#[test]
fn database_url_keeps_the_query() {
    assert_eq!(
        database_url_with_name(
            "postgresql://scylla:p%40ss@odyssey-db:6543/odyssey?sslmode=disable&connect_timeout=10",
            ARGOS_DATABASE_NAME
        ),
        Ok(
            "postgresql://scylla:p%40ss@odyssey-db:6543/argos_experimental?sslmode=disable&connect_timeout=10"
                .to_owned()
        )
    );
}

#[test]
fn database_url_without_a_database_gains_one() {
    assert_eq!(
        database_url_with_name(
            "postgresql://postgres:password@127.0.0.1:5432",
            ARGOS_DATABASE_NAME
        ),
        Ok("postgresql://postgres:password@127.0.0.1:5432/argos_experimental".to_owned())
    );
}

#[test]
fn database_url_that_is_not_a_url_is_an_error() {
    assert!(database_url_with_name("not a url", ARGOS_DATABASE_NAME).is_err());
}

#[tokio::test]
async fn an_unavailable_argos_database_is_service_unavailable() {
    let connection = ArgosPoolHandle(None).get().await;

    assert!(matches!(
        connection,
        Err(ScyllaError::HttpError(StatusCode::SERVICE_UNAVAILABLE, _))
    ));
}
