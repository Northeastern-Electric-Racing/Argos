use std::sync::Arc;

use axum::{extract::Path, Extension};
use axum_extra::extract::Query;
use protobuf::Message;
use rumqttc::v5::AsyncClient;
use serde::Deserialize;
use tracing::{info, warn};

use crate::{command_data::CommandData, error::ScyllaError};

#[derive(Deserialize, Debug)]
pub struct ConfigRequest {
    pub data: Vec<f32>,
}

pub async fn send_config(
    Path(key): Path<String>,
    data_query: Query<ConfigRequest>,
    Extension(client): Extension<Option<Arc<AsyncClient>>>,
) -> Result<(), ScyllaError> {
    info!(
        "Sending car config with key: {}, and values: {:?}",
        key, data_query.0
    );
    let Some(client) = client else {
        return Err(ScyllaError::NotProd);
    };

    let mut payload = CommandData::new();
    payload.data = data_query.0.data;
    let Ok(bytes) = payload.write_to_bytes() else {
        return Err(ScyllaError::ImpossibleEncoding);
    };

    if let Err(err) = client
        .publish(
            format!("Calypso/Bidir/Command/{}", key),
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
