use prisma_client_rust::QueryError;
use scylla_server_rust::{
    controller::system_controller::SystemSend,
    prisma,
    services::{run_service, system_service},
};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

const DATA_TYPE_NAME: &str = "test";

#[tokio::test]
async fn test_upsert_system_create() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    let res_c = system_service::upsert_system(
        &db,
        DATA_TYPE_NAME.to_owned(),
        run_service::create_run(&db, 101).await?.id,
    )
    .await?;

    let res = db
        .system()
        .find_unique(prisma::system::name::equals(DATA_TYPE_NAME.to_owned()))
        .exec()
        .await?
        .expect("System should exist, was just upserted!");

    assert_eq!(SystemSend::from(&res_c), SystemSend::from(&res));

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
        DATA_TYPE_NAME.to_owned(),
        run_service::create_run(&db, 101).await?.id,
    )
    .await?;

    let sys = system_service::get_all_systems(&db).await?;

    sys.iter()
        .find(|&f| f.name == DATA_TYPE_NAME.to_owned())
        .expect("System of the added name should exist in the list of systems");

    Ok(())
}
