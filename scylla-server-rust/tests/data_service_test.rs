#[path = "test_utils.rs"]
mod test_utils;

use prisma_client_rust::QueryError;
use protobuf::SpecialFields;
use scylla_server_rust::{
    controller::data_controller::DataSend,
    serverdata::ServerData,
    services::{data_service, data_type_service, node_service, run_service},
};
use test_utils::cleanup_and_prepare;

const DATA_TYPE_NAME: &str = "test";

#[tokio::test]
async fn test_data_service() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    run_service::create_run_with_id(&db, 0, 0).await?;
    node_service::upsert_node(&db, DATA_TYPE_NAME.to_owned()).await?;
    data_type_service::upsert_data_type(
        &db,
        DATA_TYPE_NAME.to_owned(),
        "joe_mama".to_owned(),
        DATA_TYPE_NAME.to_owned(),
    )
    .await?;
    data_service::get_data(&db, DATA_TYPE_NAME.to_owned(), 0).await?;

    Ok(())
}

#[tokio::test]
async fn test_data_add() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    node_service::upsert_node(&db, DATA_TYPE_NAME.to_owned()).await?;
    data_type_service::upsert_data_type(
        &db,
        DATA_TYPE_NAME.to_owned(),
        "joe mama".to_owned(),
        DATA_TYPE_NAME.to_owned(),
    )
    .await?;
    let run_data = run_service::create_run(&db, 999).await?;

    let data = data_service::add_data(
        &db,
        ServerData {
            value: vec!["0".to_owned()],
            unit: "A".to_owned(),
            special_fields: SpecialFields::new(),
        },
        1000,
        DATA_TYPE_NAME.to_owned(),
        run_data.id,
    )
    .await?;

    assert_eq!(
        DataSend::from(&data),
        DataSend {
            time: 1000,
            values: vec!["0".to_owned()]
        }
    );

    Ok(())
}

#[tokio::test]
async fn test_data_fetch_empty() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // should be empty, nothing was added to run
    let data = data_service::get_data(&db, DATA_TYPE_NAME.to_owned(), 0).await?;

    assert!(data.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_data_no_prereqs() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // should err out as data type name doesnt exist yet
    data_service::add_data(
        &db,
        ServerData {
            value: vec!["0".to_owned()],
            unit: "A".to_owned(),
            special_fields: SpecialFields::new(),
        },
        1000,
        DATA_TYPE_NAME.to_owned(),
        0,
    )
    .await
    .expect_err("Should have errored, datatype doesnt exist!");

    // now add the node, datatype, and run
    node_service::upsert_node(&db, DATA_TYPE_NAME.to_owned()).await?;
    data_type_service::upsert_data_type(
        &db,
        DATA_TYPE_NAME.to_owned(),
        "ur mom".to_owned(),
        DATA_TYPE_NAME.to_owned(),
    )
    .await?;
    run_service::create_run_with_id(&db, 1000, 0).await?;

    // now shouldnt fail as it and node does exist
    data_service::add_data(
        &db,
        ServerData {
            value: vec!["0".to_owned()],
            unit: "A".to_owned(),
            special_fields: SpecialFields::new(),
        },
        1000,
        DATA_TYPE_NAME.to_owned(),
        0,
    )
    .await?;

    Ok(())
}
