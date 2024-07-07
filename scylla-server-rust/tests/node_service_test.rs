use prisma_client_rust::QueryError;
use scylla_server_rust::{prisma, services::node_service};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

const TEST_KEYWORD: &str = "test";

#[tokio::test]
async fn test_upsert_node() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    node_service::upsert_node(&db, TEST_KEYWORD.to_owned()).await?;

    db.node()
        .find_unique(prisma::node::name::equals(TEST_KEYWORD.to_owned()))
        .exec()
        .await?
        .expect("There should be a node, one was just upserted");

    Ok(())
}

#[tokio::test]
async fn test_get_all_nodes() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // ensure nodes is empty
    assert!(node_service::get_all_nodes(&db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_upsert_node_twice() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    let all_nodes = node_service::get_all_nodes(&db).await?;
    node_service::upsert_node(&db, TEST_KEYWORD.to_owned()).await?;
    node_service::upsert_node(&db, TEST_KEYWORD.to_owned()).await?;
    let all_nodes_after = node_service::get_all_nodes(&db).await?;

    assert_eq!(all_nodes.len(), all_nodes_after.len() - 1);

    Ok(())
}
