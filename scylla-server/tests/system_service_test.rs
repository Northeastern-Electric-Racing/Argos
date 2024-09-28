use prisma_client_rust::QueryError;
use scylla_server::{
    prisma,
    services::{
        run_service,
        system_service::{self, public_system},
    },
};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_upsert_system_create() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    let run =
        run_service::create_run(&db, chrono::DateTime::from_timestamp_millis(101).unwrap()).await?;

    let _ = system_service::upsert_system(&db, TEST_KEYWORD.to_owned(), run.id).await?;

    let _ = db
        .system()
        .find_unique(prisma::system::name::equals(TEST_KEYWORD.to_owned()))
        .select(public_system::select())
        .exec()
        .await?
        .expect("System should exist, was just upserted!");

    Ok(())
}

#[tokio::test]
async fn test_get_all_systems() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // ensure runs is empty
    assert!(system_service::get_all_systems(&db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_get_upsert_system() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    system_service::upsert_system(
        &db,
        TEST_KEYWORD.to_owned(),
        run_service::create_run(&db, chrono::DateTime::from_timestamp_millis(101).unwrap())
            .await?
            .id,
    )
    .await?;

    let sys = system_service::get_all_systems(&db).await?;

    sys.iter()
        .find(|&f| f.name == TEST_KEYWORD.to_owned())
        .expect("System of the added name should exist in the list of systems");

    Ok(())
}
