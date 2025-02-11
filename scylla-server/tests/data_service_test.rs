#[path = "test_utils.rs"]
mod test_utils;

use scylla_server::{
    models::Data,
    services::{data_service, data_type_service, run_service},
    transformers::data_transformer::PublicData,
    ClientData,
};
use test_utils::cleanup_and_prepare;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_data_service() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    run_service::create_run_with_id(
        &mut db,
        chrono::DateTime::from_timestamp_millis(0).unwrap(),
        0,
    )
    .await?;
    // node_service::upsert_node(&db, TEST_KEYWORD.to_owned()).await?;
    data_type_service::upsert_data_type(
        &mut db,
        TEST_KEYWORD.to_owned(),
        "joe_mama".to_owned(),
    )
    .await?;
    data_service::get_data(&mut db, TEST_KEYWORD.to_owned(), 0).await?;

    Ok(())
}

#[tokio::test]
async fn test_data_add() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // node_service::upsert_node(&db, TEST_KEYWORD.to_owned()).await?;
    data_type_service::upsert_data_type(
        &mut db,
        TEST_KEYWORD.to_owned(),
        "joe mama".to_owned(),
    )
    .await?;
    let run_data = run_service::create_run(
        &mut db,
        chrono::DateTime::from_timestamp_millis(999).unwrap(),
    )
    .await?;

    let data: Data = data_service::add_data(
        &mut db,
        ClientData {
            values: vec![0f32],
            unit: "A".to_owned(),
            run_id: run_data.runId,
            name: TEST_KEYWORD.to_owned(),
            timestamp: chrono::DateTime::from_timestamp_millis(1000).unwrap(),
        },
    )
    .await?;

    assert_eq!(
        PublicData::from(data),
        PublicData {
            time_ms: 1000,
            values: vec![0f32]
        }
    );

    Ok(())
}

#[tokio::test]
async fn test_data_fetch_empty() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // should be empty, nothing was added to run
    let data = data_service::get_data(&mut db, TEST_KEYWORD.to_owned(), 0).await?;

    assert!(data.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_data_no_prereqs() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // should err out as data type name doesnt exist yet
    data_service::add_data(
        &mut db,
        ClientData {
            values: vec![0f32],
            unit: "A".to_owned(),
            run_id: 0,
            name: TEST_KEYWORD.to_owned(),
            timestamp: chrono::DateTime::from_timestamp_millis(1000).unwrap(),
        },
    )
    .await
    .expect_err("Should have errored, datatype doesnt exist!");

    // now add the node, datatype, and run
    // node_service::upsert_node(&db, TEST_KEYWORD.to_owned()).await?;
    data_type_service::upsert_data_type(
        &mut db,
        TEST_KEYWORD.to_owned(),
        "ur mom".to_owned(),
    )
    .await?;
    run_service::create_run_with_id(
        &mut db,
        chrono::DateTime::from_timestamp_millis(1000).unwrap(),
        0,
    )
    .await?;

    // now shouldnt fail as it and node does exist
    data_service::add_data(
        &mut db,
        ClientData {
            values: vec![0f32],
            unit: "A".to_owned(),
            run_id: 0,
            name: TEST_KEYWORD.to_owned(),
            timestamp: chrono::DateTime::from_timestamp_millis(1000).unwrap(),
        },
    )
    .await?;

    Ok(())
}
