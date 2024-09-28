use chrono::serde::ts_milliseconds;
use chrono::{DateTime, Utc};

pub mod db_handler;
mod mock_data;
pub mod mock_processor;
pub mod mqtt_processor;

/// Represents the client data
/// This has the dual purposes of
/// * - representing the packet sent over the socket for live data
/// * - representing the struct for the service layer to unpack for insertion
///     Note: node name is only considered for database storage and convenience, it is not serialized in a socket packet
#[derive(serde::Serialize, Clone, Debug)]
pub struct ClientData {
    pub run_id: i32,
    pub name: String,
    pub unit: String,
    pub values: Vec<f32>,
    /// Client expects time in milliseconds, so serialize as such
    #[serde(with = "ts_milliseconds")]
    pub timestamp: DateTime<Utc>,

    /// client doesnt parse node
    #[serde(skip_serializing)]
    pub node: String,
}

/// A final location packet
/// This has the purpose of representing the struct for the service layer to unpack for insertion, and therefore is not serialized
#[derive(Debug)]
struct LocationData {
    location_name: String,
    lat: f32,
    long: f32,
    radius: f32,
}
