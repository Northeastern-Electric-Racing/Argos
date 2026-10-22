use std::time::{SystemTime, UNIX_EPOCH};

use crate::test_utils::{cleanup_and_prepare, prepare_argos_database};
use diesel::prelude::*;
use diesel_async::{AsyncConnection, AsyncPgConnection, RunQueryDsl};
use scylla_server::{
    argos_database::{ARGOS_DATABASE_NAME, database_url_with_name},
    argos_schema::track,
};

async fn count_tracks(argos_db_url: &str) -> Result<i64, String> {
    let mut argos_db = AsyncPgConnection::establish(argos_db_url)
        .await
        .map_err(|e| e.to_string())?;
    track::table
        .count()
        .get_result(&mut argos_db)
        .await
        .map_err(|e| e.to_string())
}

#[tokio::test]
async fn test_setup_creates_and_migrates_a_missing_argos_database() {
    // waits for Postgres
    cleanup_and_prepare().await.unwrap();
    let db_url = std::env::var("DATABASE_URL").unwrap();
    // a throwaway name, so the shared argos_experimental and its connections are left alone
    let database_name = format!(
        "{ARGOS_DATABASE_NAME}_test_{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    let throwaway_db_url = database_url_with_name(&db_url, &database_name).unwrap();

    let connected_before_setup = AsyncPgConnection::establish(&throwaway_db_url)
        .await
        .is_ok();
    let first_setup = prepare_argos_database(&db_url, &database_name).await;
    let second_setup = prepare_argos_database(&db_url, &database_name).await;
    let track_count = count_tracks(&throwaway_db_url).await;
    let mut server = AsyncPgConnection::establish(&db_url).await.unwrap();
    diesel::sql_query(format!("DROP DATABASE \"{database_name}\" WITH (FORCE)"))
        .execute(&mut server)
        .await
        .unwrap();

    assert!(!connected_before_setup);
    assert_eq!(first_setup, Ok(throwaway_db_url.clone()));
    assert_eq!(second_setup, Ok(throwaway_db_url));
    assert_eq!(track_count, Ok(0));
}
