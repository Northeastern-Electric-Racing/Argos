use prisma_client_rust::QueryError;
use scylla_server_rust::services::{driver_service, run_service};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_get_all_drivers() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // ensure drivers is empty
    assert!(driver_service::get_all_drivers(&db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_create_driver() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    driver_service::upsert_driver(
        &db,
        TEST_KEYWORD.to_owned(),
        run_service::create_run(&db, 10001).await?.id,
    )
    .await?;

    // ensure drivers is now not empty
    assert!(!driver_service::get_all_drivers(&db).await?.is_empty());

    Ok(())
}
