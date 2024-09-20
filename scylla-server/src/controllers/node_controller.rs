use axum::{extract::State, Json};

use crate::{
    error::ScyllaError, services::node_service, transformers::node_transformer::PublicNode,
    Database,
};

/// get a list of nodes
pub async fn get_all_nodes(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicNode>>, ScyllaError> {
    let node_data = node_service::get_all_nodes(&db).await?;

    let transformed_node_data: Vec<PublicNode> = node_data.iter().map(PublicNode::from).collect();

    Ok(Json::from(transformed_node_data))
}
