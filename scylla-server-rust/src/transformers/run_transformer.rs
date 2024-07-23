use serde::Serialize;

use crate::services::{
    driver_service::public_driver, location_service::public_location, run_service::public_run,
    system_service::public_system,
};

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

impl From<&public_run::Data> for PublicRun {
    fn from(value: &public_run::Data) -> Self {
        PublicRun {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}

// why are these three needed? basically the nested relations via select do not "share" nested relations elsewhere.
// ultimately this means structs with identical fields have non identical types, and as they are macro generated they cannot be derived together
impl From<&public_driver::runs::Data> for PublicRun {
    fn from(value: &public_driver::runs::Data) -> Self {
        PublicRun {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}

impl From<&public_location::runs::Data> for PublicRun {
    fn from(value: &public_location::runs::Data) -> Self {
        PublicRun {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}

impl From<&public_system::runs::Data> for PublicRun {
    fn from(value: &public_system::runs::Data) -> Self {
        PublicRun {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}
