use prisma_client_rust::QueryError;
use scylla_server::{
    prisma,
    services::{location_service, run_service},
};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_get_all_locations_and_upsert() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    location_service::upsert_location(
        &db,
        TEST_KEYWORD.to_owned(),
        100.0,
        200.0,
        300.0,
        run_service::create_run(&db, 10001).await?.id,
    )
    .await?;

    db.location()
        .find_unique(prisma::location::name::equals(TEST_KEYWORD.to_owned()))
        .exec()
        .await?
        .expect("Location exist as was just upserted");

    Ok(())
}
