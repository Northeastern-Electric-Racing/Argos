use serde::Serialize;

/// The struct defining the run format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicRun {
    pub id: i32,
    #[serde(rename = "locationName")]
    pub location_name: String,
    #[serde(rename = "driverName")]
    pub driver_name: String,
    #[serde(rename = "time")]
    pub time_ms: i64,
    pub notes: String,
}

impl From<crate::models::Run> for PublicRun {
    fn from(value: crate::models::Run) -> Self {
        PublicRun {
            id: value.runId,
            driver_name: value.driverName,
            location_name: value.locationName,
            time_ms: value.time.timestamp_millis(),
            notes: value.notes,
        }
    }
}
