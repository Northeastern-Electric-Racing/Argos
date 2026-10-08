use chrono::serde::ts_milliseconds;

pub mod controllers;
pub mod error;
pub mod services;

pub mod argos_inserter;
pub mod db_handler;
pub mod mqtt_processor;
pub mod zenoh_processor;

pub mod metadata_structs;
pub mod rule_structs;
pub mod socket_handler;

#[allow(non_snake_case)]
pub mod models;
#[allow(non_snake_case)]
pub mod schema;

#[allow(clippy::pedantic)]
pub mod proto;

pub mod transformers;

/// The type descriptor of the database passed to the middlelayer through axum state
pub type Database<'a> =
    diesel_async::pooled_connection::bb8::PooledConnection<'a, diesel_async::AsyncPgConnection>;

pub type PoolHandle = diesel_async::pooled_connection::bb8::Pool<diesel_async::AsyncPgConnection>;

#[derive(clap::ValueEnum, Debug, PartialEq, Copy, Clone, Default)]
#[repr(u8)]
#[clap(rename_all = "kebab_case")]
pub enum RateLimitMode {
    /// static rate limiting based on a set value
    Static,
    /// no rate limiting
    #[default]
    None,
}
impl TryFrom<u8> for RateLimitMode {
    type Error = &'static str;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(RateLimitMode::Static),
            1 => Ok(RateLimitMode::None),
            _ => Err("Invalid enum!"),
        }
    }
}

// GLOBAL VARIABLES

/// Atomic to keep track the current run id across EVERYTHING (very scary)
pub static RUN_ID: std::sync::atomic::AtomicI32 = std::sync::atomic::AtomicI32::new(-1);

/// true if data upload (batching) should be disabled
pub static DATA_UPLOAD_DISABLE: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

/// the amount of time in between batch upserts
pub static BATCH_UPSERT_TIME: std::sync::atomic::AtomicU16 = std::sync::atomic::AtomicU16::new(10);

/// the `RateLimitMode` to use
pub static RATE_LIMIT_MODE: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(1);
/// the value to rate limit in static mode, (in ms)
pub static STATIC_RATE_LIMIT_VALUE: std::sync::atomic::AtomicU16 =
    std::sync::atomic::AtomicU16::new(100);

/// the percentage of messages to discard in send over the socket to the client
pub static SOCKET_DISCARD_PERCENT: std::sync::atomic::AtomicU8 =
    std::sync::atomic::AtomicU8::new(0);

/// Represents the client data
/// This has the dual purposes of
/// * - representing the packet sent over the socket for live data
/// * - representing the struct for the service layer to unpack for insertion
///     Note: node name is only considered for database storage and convenience, it is not serialized in a socket packet
#[derive(serde::Serialize, Clone, Debug)]
pub struct ClientData {
    #[serde(rename = "runId")]
    pub run_id: i32,
    pub name: String,
    pub unit: String,
    pub values: Vec<f32>,
    /// Client expects time in milliseconds, so serialize as such
    #[serde(with = "ts_milliseconds")]
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// this is the main conversion code to insert data.
///
/// it is essential this conversion does no re-allocate
impl From<ClientData> for models::DataInsert {
    fn from(val: ClientData) -> Self {
        models::DataInsert {
            values: val.values,
            dataTypeName: val.name,
            time: val.timestamp.timestamp_micros(),
            runId: val.run_id,
        }
    }
}

/// A sendable, for now command data only
pub struct SirenSendable {
    pub command_data: proto::command_data::CommandData,
    pub topic: String,
}
