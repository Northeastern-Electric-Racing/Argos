use serde::Serialize;

use crate::{prisma, reciever::ClientData};

/// The struct defining the data format sent to the client
#[derive(Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PublicData {
    pub time: i64,
    pub values: Vec<String>,
}

/// convert the prisma type to the client type for JSON encoding
impl From<&prisma::data::Data> for PublicData {
    fn from(value: &prisma::data::Data) -> Self {
        PublicData {
            values: value.values.iter().map(|f| f.to_string()).collect(),
            time: value.time.timestamp_millis(),
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
