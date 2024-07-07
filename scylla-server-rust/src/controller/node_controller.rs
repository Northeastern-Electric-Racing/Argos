use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::node_service, Database};

use super::data_type_controller::DataTypeSend;

#[derive(Serialize, PartialEq)]
pub struct NodeSend {
    name: String,
    #[serde(rename = "dataTypes")]
    data_types: Vec<DataTypeSend>,
}

impl From<&prisma::node::Data> for NodeSend {
    fn from(value: &prisma::node::Data) -> Self {
        NodeSend {
            name: value.name.clone(),
            data_types: value
                .data_types
                .clone()
                .unwrap_or_default()
                .iter()
                .map(DataTypeSend::from)
                .collect(),
        }
    }
}

pub async fn get_all_nodes(State(db): State<Database>) -> Result<Json<Vec<NodeSend>>, ScyllaError> {
    let data = node_service::get_all_nodes(&db).await?;

    let transformed_data: Vec<NodeSend> = data.iter().map(NodeSend::from).collect();

    Ok(Json::from(transformed_data))
}
