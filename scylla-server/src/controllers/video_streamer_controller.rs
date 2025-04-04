use std::{fs, sync::Arc, vec};

use axum::{extract::Path, http::Response, response::IntoResponse, Extension, Json};
use rumqttc::v5::AsyncClient;
use tokio::{fs::File, io::AsyncReadExt};
use tracing::info;

use crate::{
    error::ScyllaError,
    proto::serverdata::{self},
};

#[derive(Clone)]
pub struct VideoSuffix(pub String);

#[derive(Clone)]
pub struct OutputDirectory(pub String);

/// Streams the specified video at the given file path
pub async fn stream_video(
    Path(file_path): Path<String>,
    Extension(output_directory): Extension<OutputDirectory>,
) -> impl IntoResponse {
    info!("Attempting to stream: {}/{}", output_directory.0, file_path);
    match File::open(format!("{}/{}", output_directory.0, file_path)).await {
        Ok(mut file) => {
            let mut buffer = Vec::new();
            if file.read_to_end(&mut buffer).await.is_ok() {
                Response::builder()
                    .header("Content-Type", "video/mp4")
                    .header("Accept-Ranges", "bytes")
                    .body(axum::body::Body::from(buffer))
                    .unwrap()
            } else {
                Response::builder()
                    .status(500)
                    .body("Error reading video file".into())
                    .unwrap()
            }
        }
        Err(_) => Response::builder()
            .status(404)
            .body("Video not found".into())
            .unwrap(),
    }
}

/// Gets all the videos inside the configured output directory
pub async fn get_videos(
    Extension(output_directory): Extension<OutputDirectory>,
    Extension(video_suffix): Extension<VideoSuffix>,
) -> Result<Json<Vec<String>>, ScyllaError> {
    let mut file_paths: Vec<String> = vec![];
    let entries = fs::read_dir(output_directory.0)
        .map_err(|err| ScyllaError::FileError(format!("Error reading directory: {}", err)))?;

    for entry in entries.filter_map(Result::ok) {
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();

        if file_name_str.ends_with(video_suffix.0.as_str()) {
            file_paths.push(file_name_str.to_string())
        }
    }

    Ok(Json::from(file_paths))
}

pub async fn request_updated_videos(
    Extension(mqtt_client): Extension<Arc<AsyncClient>>,
) -> Result<Json<String>, ScyllaError> {
    let mut payload = serverdata::ServerData::new();
    payload.values = vec![1.0];
    mqtt_client
        .publish(
            "Scylla/Video/Send",
            rumqttc::v5::mqttbytes::QoS::ExactlyOnce,
            false,
            protobuf::Message::write_to_bytes(&payload)
                .unwrap_or_else(|e| format!("failed to serialize {}", e).as_bytes().to_vec()),
        )
        .await
        .map_err(|err| ScyllaError::MqttError(format!("Failed to send mqtt message: {}", err)))?;

    Ok(Json::from("Sent Request to update videos".to_string()))
}
