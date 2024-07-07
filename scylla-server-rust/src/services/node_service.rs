use prisma_client_rust::QueryError;

use crate::{prisma, Database};

pub async fn get_all_nodes(db: &Database) -> Result<Vec<prisma::node::Data>, QueryError> {
    db.node().find_many(vec![]).exec().await
}

pub async fn upsert_node(
    db: &Database,
    node_name: String,
) -> Result<prisma::node::Data, QueryError> {
    db.node()
        .upsert(
            prisma::node::name::equals(node_name.clone()),
            prisma::node::create(node_name, vec![]),
            vec![],
        )
        .exec()
        .await
}
