use serde::Serialize;

use crate::{processors::ClientData, services::data_service};

/// The struct defining the data format sent to the client
#[derive(Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PublicData {
    pub time: i64,
    pub values: Vec<String>,
}

#[derive(Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PublicDataWithDataType {
    pub time: i64,
    pub values: Vec<String>,
    pub dataTypeName: String,
}

/// convert the prisma type to the client type for JSON encoding
impl From<&data_service::public_data::Data> for PublicData {
    fn from(value: &data_service::public_data::Data) -> Self {
        PublicData {
            values: value.values.iter().map(f64::to_string).collect(),
            time: value.time.timestamp_millis(),
        }
    }
}

/// convert the prisma type to the client type for JSON encoding
impl From<&data_service::public_data_with_dataType::Data> for PublicDataWithDataType {
    fn from(value: &data_service::public_data_with_dataType::Data) -> Self {
        PublicDataWithDataType {
            values: value.values.iter().map(f64::to_string).collect(),
            time: value.time.timestamp_millis(),
            dataTypeName: value.data_type_name.clone(),
        }
    }
}

/// convert from the client (socket) type to the client type, for debugging and testing only probably
impl From<ClientData> for PublicData {
    fn from(value: ClientData) -> Self {
        PublicData {
            time: value.timestamp,
            values: value.values,
        }
    }
}
