use prisma_client_rust::QueryError;

use crate::{prisma, Database};

/// Gets all nodes
/// * `db` - The prisma client to make the call to
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_nodes(db: &Database) -> Result<Vec<prisma::node::Data>, QueryError> {
    db.node().find_many(vec![]).exec().await
}

/// Upserts a node, either creating or updating one depending on its existence
/// * `db` - The prisma client to make the call to
/// * `node_name` - The name of the node linked to the data type
/// returns: A result containing the data or the QueryError propogated by the db
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
