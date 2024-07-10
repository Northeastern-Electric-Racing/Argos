pub mod db_handler;
pub mod mock_reciever;
pub mod mqtt_reciever;
pub mod socket_handler;

/// Represents the client data
/// This has the dual purposes of
/// * - representing the packet sent over the socket for live data
/// * - representing the struct for the service layer to unpack for insertion
/// Note: node name is only considered for database storage and convenience, it is not serialized in a socket packet
#[derive(serde::Serialize, Clone, Debug)]
pub struct ClientData {
    pub run_id: i32,
    pub name: String,
    pub unit: String,
    pub values: Vec<String>,
    pub timestamp: i64,

    #[serde(skip_serializing)]
    pub node: String,
}
