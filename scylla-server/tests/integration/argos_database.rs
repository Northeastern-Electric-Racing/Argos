use std::time::{SystemTime, UNIX_EPOCH};

use crate::test_utils::cleanup_and_prepare;
use diesel::prelude::*;
use diesel_async::{AsyncConnection, AsyncPgConnection, RunQueryDsl};
use scylla_server::{
    PoolHandle,
    argos_database::{self, ARGOS_DATABASE_NAME},
    argos_schema::track,
};

async fn count_tracks(argos_pool: &PoolHandle) -> Result<i64, String> {
    let mut argos_db = argos_pool.get().await.map_err(|e| e.to_string())?;
    track::table
        .count()
        .get_result(&mut argos_db)
        .await
        .map_err(|e| e.to_string())
}

#[tokio::test]
async fn test_connect_creates_and_migrates_a_missing_argos_database() {
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

    let track_count = match argos_database::connect(&db_url, &database_name).await {
        Ok(argos_pool) => count_tracks(&argos_pool).await,
        Err(e) => Err(e.to_string()),
    };
    let reconnected = argos_database::connect(&db_url, &database_name).await;
    let mut server = AsyncPgConnection::establish(&db_url).await.unwrap();
    diesel::sql_query(format!(
        "DROP DATABASE IF EXISTS \"{database_name}\" WITH (FORCE)"
    ))
    .execute(&mut server)
    .await
    .unwrap();

    assert_eq!(track_count, Ok(0));
    assert!(reconnected.is_ok());
}
