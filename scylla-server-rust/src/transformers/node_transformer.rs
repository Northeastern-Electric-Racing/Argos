use serde::Serialize;

use crate::services::node_service;

use super::data_type_transformer::PublicDataType;

/// The struct defining the node format sent to the client
#[derive(Serialize, PartialEq)]
pub struct PublicNode {
    name: String,
    #[serde(rename = "dataTypes")]
    data_types: Vec<PublicDataType>,
}

impl From<&node_service::public_node::Data> for PublicNode {
    fn from(value: &node_service::public_node::Data) -> Self {
        PublicNode {
            name: value.name.clone(),
            data_types: value
                .data_types
                .clone()
                .iter()
                .map(PublicDataType::from)
                .collect(),
        }
    }
}
