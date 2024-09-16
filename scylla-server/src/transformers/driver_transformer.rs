use serde::Serialize;

use crate::services::driver_service;

use super::run_transformer::PublicRun;

/// The struct defining the driver format sent to the client
#[derive(Serialize, PartialEq)]
pub struct PublicDriver {
    username: String,
    runs: Vec<PublicRun>,
}

impl From<&driver_service::public_driver::Data> for PublicDriver {
    fn from(value: &driver_service::public_driver::Data) -> Self {
        PublicDriver {
            username: value.username.clone(),
            runs: value.runs.clone().iter().map(PublicRun::from).collect(),
        }
    }
}
