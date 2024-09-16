#[path = "test_utils.rs"]
mod test_utils;

use prisma_client_rust::QueryError;
use scylla_server::{
    prisma,
    services::{
        data_type_service::{self, public_datatype},
        node_service,
    },
    transformers::data_type_transformer::PublicDataType,
};
use test_utils::cleanup_and_prepare;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_get_all_datatypes() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // ensure datatypes is empty
    assert!(data_type_service::get_all_data_types(&db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_datatype_fail_upsert_no_node() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // should fail since no node exists
    data_type_service::upsert_data_type(
        &db,
        TEST_KEYWORD.to_owned(),
        "hello wurld".to_owned(),
        TEST_KEYWORD.to_owned(),
    )
    .await
    .expect_err("Test should fail, no node exists");

    Ok(())
}

#[tokio::test]
async fn test_datatype_create() -> Result<(), QueryError> {
    let data_type_name: String = "test".to_owned();
    let unit: String = "testUnitCreation".to_owned();
    let node_name: String = "testNode".to_owned();

    let db = cleanup_and_prepare().await?;

    // make node
    node_service::upsert_node(&db, node_name.clone()).await?;
    // upsert
    data_type_service::upsert_data_type(&db, data_type_name.clone(), unit.clone(), node_name)
        .await?;

    // fetch
    let data = db
        .data_type()
        .find_unique(prisma::data_type::name::equals(data_type_name.clone()))
        .select(public_datatype::select())
        .exec()
        .await?
        .expect("This should not be empty");

    assert_eq!(
        PublicDataType::from(&data),
        PublicDataType {
            name: data_type_name,
            unit: unit
        }
    );

    Ok(())
}
