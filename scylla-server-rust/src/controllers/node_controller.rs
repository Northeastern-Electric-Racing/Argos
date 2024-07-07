use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::node_service, Database};

use super::data_type_controller::PublicDataType;

/// The struct defining the node format sent to the client
#[derive(Serialize, PartialEq)]
pub struct PublicNode {
    name: String,
    #[serde(rename = "dataTypes")]
    data_types: Vec<PublicDataType>,
}

impl From<&prisma::node::Data> for PublicNode {
    fn from(value: &prisma::node::Data) -> Self {
        PublicNode {
            name: value.name.clone(),
            data_types: value
                .data_types
                .clone()
                .unwrap_or_default()
                .iter()
                .map(PublicDataType::from)
                .collect(),
        }
    }
}

pub async fn get_all_nodes(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicNode>>, ScyllaError> {
    let node_data = node_service::get_all_nodes(&db).await?;

    let transformed_node_data: Vec<PublicNode> = node_data.iter().map(PublicNode::from).collect();

    Ok(Json::from(transformed_node_data))
}
