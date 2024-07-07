use serde::Serialize;

use crate::prisma;

use super::data_type_transformer::PublicDataType;

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
