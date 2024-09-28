use std::cmp::Ordering;

use serde::Serialize;

use crate::{processors::ClientData, services::data_service};

/// The struct defining the data format sent to the client
#[derive(Serialize, Debug)]
pub struct PublicData {
    /// time in MILLISECONDS
    pub time: i64,
    pub values: Vec<f64>,
}
// custom impls to avoid comparing values fields
impl Ord for PublicData {
    fn cmp(&self, other: &Self) -> Ordering {
        self.time.cmp(&other.time)
    }
}

impl PartialOrd for PublicData {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for PublicData {
    fn eq(&self, other: &Self) -> bool {
        self.time == other.time
    }
}

impl Eq for PublicData {}

/// convert the prisma type to the client type for JSON encoding
impl From<&data_service::public_data::Data> for PublicData {
    fn from(value: &data_service::public_data::Data) -> Self {
        PublicData {
            values: value.values.clone(),
            time: value.time.timestamp_millis(),
        }
    }
}

/// convert from the client (socket) type to the client type, for debugging and testing only probably
impl From<ClientData> for PublicData {
    fn from(value: ClientData) -> Self {
        PublicData {
            time: value.timestamp.timestamp_millis(),
            values: value.values.iter().map(|f| *f as f64).collect(),
        }
    }
}
