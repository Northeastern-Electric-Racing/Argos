use serde::Serialize;

use crate::prisma;

/// The struct defining the run format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicRun {
    pub id: i32,
    #[serde(rename = "locationName")]
    pub location_name: String,
    #[serde(rename = "driverName")]
    pub driver_name: String,
    #[serde(rename = "systemName")]
    pub system_name: String,
    pub time: i64,
}

impl From<&prisma::run::Data> for PublicRun {
    fn from(value: &prisma::run::Data) -> Self {
        PublicRun {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}
