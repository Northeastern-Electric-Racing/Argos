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

/// Sends a configuration to the car over MQTT
/// * `key` - The key of the configuration, as defined in the cangen YAML
/// * `data_query` - The data of the configuration, a URI query list of data=<f32>.  If empty or too short, filled with cangen YAMl defaults
/// * `client` - The MQTT client to be used to send the data
///
/// More info: This follows the specification of sending a command_data object over siren to topic CALYPSO_BIDIR_CMD_PREFIX/<key>
pub async fn send_config_command(
    Path(key): Path<String>,
    Query(data_query): Query<ConfigRequest>,
    Extension(client): Extension<Option<Arc<AsyncClient>>>,
) -> Result<(), ScyllaError> {
    info!(
        "Sending car config with key: {}, and values: {:?}",
        key, data_query.data
    );
    // disable scylla if not prod, as there will be None mqtt client
    let Some(client) = client else {
        return Err(ScyllaError::NotProd(
            "Car config sending is disabled in mock mode!".to_string(),
        ));
    };

    // the protobuf calypso converts into CAN
    let mut payload = CommandData::new();
    // empty "data" in the protobuf tells calypso to use the default value
    if let Some(data) = data_query.data {
        payload.data = data;
    }
    let Ok(bytes) = payload.write_to_bytes() else {
        return Err(ScyllaError::InvalidEncoding(
            "Payload could not be written!".to_string(),
        ));
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
        return Err(ScyllaError::CommFailure(
            "Siren publish for instruction failed!".to_string(),
        ));
    }

    Ok(())
}
