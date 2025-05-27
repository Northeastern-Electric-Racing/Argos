use std::cmp::Ordering;

use serde::Serialize;

use crate::ClientData;

/// The struct defining the data format sent to the client
#[derive(Serialize, Debug)]
pub struct PublicData {
    #[serde(rename = "time")]
    pub time_ms: i64,
    pub values: Vec<f32>,
}

// custom impls to avoid comparing values fields
impl Ord for PublicData {
    fn cmp(&self, other: &Self) -> Ordering {
        self.time_ms.cmp(&other.time_ms)
    }
}

impl PartialOrd for PublicData {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for PublicData {
    fn eq(&self, other: &Self) -> bool {
        self.time_ms == other.time_ms
    }
}

impl Eq for PublicData {}

/// convert the prisma type to the client type for JSON encoding
impl From<crate::models::Data> for PublicData {
    fn from(value: crate::models::Data) -> Self {
        PublicData {
            values: value.values.into_iter().flatten().collect(),
            time_ms: chrono::DateTime::from_timestamp_micros(value.time)
                .unwrap()
                .timestamp_millis(),
        }
    }
}

/// convert from the client (socket) type to the client type, for debugging and testing only probably
impl From<ClientData> for PublicData {
    fn from(value: ClientData) -> Self {
        PublicData {
            time_ms: value.timestamp.timestamp_millis(),
            values: value.values,
        }
    }
}
