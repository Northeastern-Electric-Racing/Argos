#[path = "test_utils.rs"]
mod test_utils;

use diesel::{
    query_dsl::methods::{FilterDsl, SelectDsl},
    ExpressionMethods, SelectableHelper,
};
use diesel_async::RunQueryDsl;
use scylla_server::{
    models::DataType, schema::data_type, services::data_type_service,
    transformers::data_type_transformer::PublicDataType,
};
use test_utils::cleanup_and_prepare;

#[tokio::test]
async fn test_get_all_datatypes() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // ensure datatypes is empty
    assert!(data_type_service::get_all_data_types(&mut db)
        .await?
        .is_empty());

    Ok(())
}

#[tokio::test]
async fn test_datatype_create() -> Result<(), diesel::result::Error> {
    let data_type_name: String = "test".to_owned();
    let unit: String = "testUnitCreation".to_owned();

    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // make node
    // node_service::upsert_node(&mut db, node_name.clone()).await?;
    // upsert
    data_type_service::upsert_data_type(&mut db, data_type_name.clone(), unit.clone())
        .await?;

    // fetch
    let data = data_type::table
        .filter(data_type::name.eq(data_type_name.clone()))
        .select(DataType::as_select())
        .get_result(&mut db)
        .await?;

    assert_eq!(
        PublicDataType::from(data),
        PublicDataType {
            name: data_type_name,
            unit
        }
    );

    Ok(())
}
