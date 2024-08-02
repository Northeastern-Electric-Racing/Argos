use std::sync::Arc;

use axum::{extract::Path, Extension};
use axum_extra::extract::Query;
use protobuf::Message;
use rumqttc::v5::AsyncClient;
use serde::Deserialize;
use tracing::{info, warn};

use crate::{command_data::CommandData, error::ScyllaError};

/// the prefix for the calypso topic, so topic of cmd is this plus the key appended on
pub const CALYPSO_BIDIR_CMD_PREFIX: &str = "Calypso/Bidir/Command/";

#[derive(Deserialize, Debug)]
pub struct ConfigRequest {
    pub data: Option<Vec<f32>>,
}

/// This controller recieves two peices of info: the key from the path, and the list of float values from the query params
/// The key is used in accordance with the calypso specification: a command_data object is sent over siren to CALYPSO_BIDIR_CMD_PREFIX/<key>
/// That command_data object is processed and matched via the key to a YAML specification for the encoding and sending of a CAN message.
/// If the data is invalid, too short, etc. the default feild from the YAML is instead sent, as with when the car initially turns on before argos connects.
/// TLDR: This triggers a command <key> with the values <data_query.0.data> for calypso to update the CAN packet sent to the bus.
pub async fn send_config(
    Path(key): Path<String>,
    data_query: Query<ConfigRequest>,
    Extension(client): Extension<Option<Arc<AsyncClient>>>,
) -> Result<(), ScyllaError> {
    info!(
        "Sending car config with key: {}, and values: {:?}",
        key, data_query.0.data
    );
    // disable scylla if not prod, as there will be None mqtt client
    let Some(client) = client else {
        return Err(ScyllaError::NotProd);
    };

    // create a payload object of the values to be parsed by calypso into a CAN packet
    let mut payload = CommandData::new();
    // writing an empty protobuf is OK, that indicates to calypso that the default value should be used
    if let Some(data) = data_query.0.data {
        payload.data = data;
    }
    let Ok(bytes) = payload.write_to_bytes() else {
        return Err(ScyllaError::ImpossibleEncoding);
    };

    // publish the message to the topic that calypso's encoder is susbcribed to
    if let Err(err) = client
        .publish(
            format!("{}{}", CALYPSO_BIDIR_CMD_PREFIX, key),
            rumqttc::v5::mqttbytes::QoS::ExactlyOnce,
            false,
            bytes,
        )
        .await
    {
        warn!("Could not publish instruction: {}", err);
        return Err(ScyllaError::CommFailure);
    }

    Ok(())
}
