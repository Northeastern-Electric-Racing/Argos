use prisma_client_rust::QueryError;
use scylla_server_rust::{
    controllers::system_controller::PublicSystem,
    prisma,
    services::{run_service, system_service},
};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_upsert_system_create() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    let res_c = system_service::upsert_system(
        &db,
        TEST_KEYWORD.to_owned(),
        run_service::create_run(&db, 101).await?.id,
    )
    .await?;

    let res = db
        .system()
        .find_unique(prisma::system::name::equals(TEST_KEYWORD.to_owned()))
        .exec()
        .await?
        .expect("System should exist, was just upserted!");

    assert_eq!(PublicSystem::from(&res_c), PublicSystem::from(&res));

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
        run_service::create_run(&db, 101).await?.id,
    )
    .await?;

    let sys = system_service::get_all_systems(&db).await?;

    sys.iter()
        .find(|&f| f.name == TEST_KEYWORD.to_owned())
        .expect("System of the added name should exist in the list of systems");

    Ok(())
}
