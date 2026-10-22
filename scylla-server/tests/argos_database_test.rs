use scylla_server::argos_database::{ARGOS_DATABASE_NAME, database_url_with_name};

#[test]
fn database_url_swaps_only_the_database_name() {
    assert_eq!(
        database_url_with_name(
            "postgresql://postgres:password@127.0.0.1:5432/postgres",
            ARGOS_DATABASE_NAME
        ),
        Ok("postgresql://postgres:password@127.0.0.1:5432/argos_experimental".to_owned())
    );
}

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
fn database_url_rejects_a_key_value_connection_string() {
    assert_eq!(
        database_url_with_name(
            "host=127.0.0.1 user=postgres dbname=postgres",
            ARGOS_DATABASE_NAME
        ),
        Err(url::ParseError::RelativeUrlWithoutBase)
    );
}
