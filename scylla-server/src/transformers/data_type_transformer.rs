use serde::Serialize;

use crate::services::{data_type_service, node_service};

/// The struct defining the data type format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicDataType {
    pub name: String,
    pub unit: String,
}

impl From<&data_type_service::public_datatype::Data> for PublicDataType {
    fn from(value: &data_type_service::public_datatype::Data) -> Self {
        PublicDataType {
            name: value.name.clone(),
            unit: value.unit.clone(),
        }
    }
}

impl From<&node_service::public_node::data_types::Data> for PublicDataType {
    fn from(value: &node_service::public_node::data_types::Data) -> Self {
        PublicDataType {
            name: value.name.clone(),
            unit: value.unit.clone(),
        }
    }
}
