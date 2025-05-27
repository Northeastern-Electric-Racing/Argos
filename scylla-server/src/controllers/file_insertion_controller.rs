use std::sync::Arc;

use axum::{
    extract::{Multipart, State},
    Extension, Json,
};
use axum_macros::debug_handler;
use chrono::DateTime;
use protobuf::CodedInputStream;
use rangemap::RangeInclusiveMap;
use rumqttc::v5::AsyncClient;
use tokio::{fs, sync::mpsc};
use tracing::{debug, info, trace, warn};

use crate::{
    error::ScyllaError,
    proto::{playback_data, serverdata},
    services::run_service,
    ClientData, PoolHandle,
};

use super::OutputDirectory;

/// Inserts a logger file using http multipart
/// This file is parsed and clientdata values are extracted, the run ID of each variable is inferred, and then data is batch uploaded
// super cool: adding this tag tells you what variable is misbehaving in cases of axum Send+Sync Handler fails
#[debug_handler]
pub async fn insert_logger_file(
    State(pool): State<PoolHandle>,
    Extension(batcher): Extension<mpsc::Sender<Vec<ClientData>>>,
    mut multipart: Multipart,
) -> Result<String, ScyllaError> {
    // create a run ID cache
    let mut db = pool.get().await?;
    debug!("Warming up run ID map!");
    let mut run_iter = run_service::get_all_runs(&mut db)
        .await?
        .into_iter()
        .map(|f| (f.runId, f.time.timestamp_micros() as u64))
        .peekable();
    let mut run_rng: RangeInclusiveMap<u64, i32> = RangeInclusiveMap::new();
    // this actual formulates the list, where keys are ranges of times (us) and the values are the run IDs
    while let Some(it) = run_iter.next() {
        match run_iter.peek() {
            Some(next) => {
                run_rng.insert(it.1..=next.1, it.0);
            }
            // if this is the last item in the list
            None => {
                run_rng.insert(it.1..=u64::MAX, it.0);
                continue;
            }
        }
    }

    // iterate through all files
    debug!("Converting file data to insertable data!");
    while let Ok(Some(field)) = multipart.next_field().await {
        // round up all of the protobuf segments as a giant list
        let Ok(data) = field.bytes().await else {
            warn!("Could not decode logger file insert, perhaps it was interrupted!");
            continue;
        };
        let mut count_bad_run = 0usize;
        let mut insertable_data: Vec<ClientData> = Vec::new();
        {
            // this cannot be used across an await, hence scoped
            let mut stream = CodedInputStream::from_tokio_bytes(&data);
            loop {
                match stream.read_message::<playback_data::PlaybackData>() {
                    Ok(f) => {
                        trace!("Decoded file msg: {}", f);
                        let f = match run_rng.get(&f.time_us) {
                            Some(a) => ClientData {
                                run_id: *a,
                                name: f.topic.clone(),
                                unit: f.unit,
                                values: f.values,
                                timestamp: DateTime::from_timestamp_micros(f.time_us as i64)
                                    .unwrap(),
                            },
                            None => {
                                count_bad_run += 1;
                                continue;
                            }
                        };
                        insertable_data.push(f);
                    }
                    Err(e) => {
                        info!("Exiting from read loop {}", e);
                        break;
                    }
                }
            }
        }
        info!(
            "Inserting {} points. {} points could not be assigned IDs.",
            insertable_data.len(),
            count_bad_run
        );
        if let Err(err) = batcher.send(insertable_data).await {
            warn!("Error sending logger file insert data to batcher! {}", err);
        };
    }
    info!("Finished logger file insert request!");
    Ok("Successfully sent all to batcher!".to_string())
}

/// Writes the files in the multipart to a file on the server named with the multipart file name
pub async fn insert_file(
    Extension(output_directory): Extension<OutputDirectory>,
    mut multipart: Multipart,
) -> Result<String, ScyllaError> {
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().map(|s| s.to_string());

        let Ok(data) = field.bytes().await else {
            warn!("Could not decode file insert");
            continue;
        };

        let Some(name) = name else {
            warn!("Could not get name");
            continue;
        };

        info!("Inserting file: {}", name);

        fs::write(format!("{}/{}", output_directory.0, name), data)
            .await
            .map_err(|e| ScyllaError::FileError(format!("Failed to write file {}", e)))?;
    }

    info!("Finished file insert request!");
    Ok("Successfully wrote data to files".to_string())
}

pub async fn request_logger_insert(
    Extension(mqtt_client): Extension<Arc<AsyncClient>>,
) -> Result<Json<String>, ScyllaError> {
    let mut payload = serverdata::ServerData::new();
    payload.values = vec![1.0];
    mqtt_client
        .publish(
            "Scylla/Logger/Send",
            rumqttc::v5::mqttbytes::QoS::ExactlyOnce,
            false,
            protobuf::Message::write_to_bytes(&payload)
                .unwrap_or_else(|e| format!("failed to serialize {}", e).as_bytes().to_vec()),
        )
        .await
        .map_err(|err| ScyllaError::MqttError(format!("Failed to send mqtt message: {}", err)))?;

    Ok(Json::from(
        "Sent Request to insert logger files".to_string(),
    ))
}
pub async fn request_serial_insert(
    Extension(mqtt_client): Extension<Arc<AsyncClient>>,
) -> Result<Json<String>, ScyllaError> {
    let mut payload = serverdata::ServerData::new();
    payload.values = vec![1.0];
    mqtt_client
        .publish(
            "Scylla/Serial/Send",
            rumqttc::v5::mqttbytes::QoS::ExactlyOnce,
            false,
            protobuf::Message::write_to_bytes(&payload)
                .unwrap_or_else(|e| format!("failed to serialize {}", e).as_bytes().to_vec()),
        )
        .await
        .map_err(|err| ScyllaError::MqttError(format!("Failed to send mqtt message: {}", err)))?;

    Ok(Json::from("Sent Request to insert serial logs".to_string()))
}
