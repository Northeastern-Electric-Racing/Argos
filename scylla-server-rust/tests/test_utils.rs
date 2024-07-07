use std::sync::Arc;

use prisma_client_rust::QueryError;
use scylla_server_rust::{prisma::PrismaClient, Database};

pub async fn cleanup_and_prepare() -> Result<Database, QueryError> {
    let client = Arc::new(PrismaClient::_builder().build().await.unwrap());

    client.data().delete_many(vec![]).exec().await?;

    client.data_type().delete_many(vec![]).exec().await?;

    client.driver().delete_many(vec![]).exec().await?;

    client.location().delete_many(vec![]).exec().await?;

    client.node().delete_many(vec![]).exec().await?;

    client.run().delete_many(vec![]).exec().await?;

    client.system().delete_many(vec![]).exec().await?;

    Ok(client)
}
