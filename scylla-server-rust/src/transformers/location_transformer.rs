use serde::Serialize;

use crate::services::location_service;

use super::run_transformer::PublicRun;

/// The struct defining the location format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicLocation {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub radius: f64,
    pub runs: Vec<PublicRun>,
}

impl From<&location_service::public_location::Data> for PublicLocation {
    fn from(value: &location_service::public_location::Data) -> Self {
        PublicLocation {
            name: value.name.clone(),
            latitude: value.latitude,
            longitude: value.longitude,
            radius: value.radius,
            runs: value.runs.clone().iter().map(PublicRun::from).collect(),
        }
    }
}
