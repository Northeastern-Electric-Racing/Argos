use std::{fs, io::SeekFrom, sync::Arc, vec};

use axum::{
    body::{Body, BodyDataStream},
    extract::Path,
    http::{header, HeaderMap, Response, StatusCode},
    Extension, Json,
};
use rumqttc::v5::AsyncClient;
use tokio::{
    fs::File as TokioFile,
    io::{AsyncReadExt, AsyncSeekExt},
};
use tokio_util::io::ReaderStream;
use tracing::info;

use crate::{
    error::ScyllaError,
    proto::serverdata::{self},
};

#[derive(Clone)]
pub struct VideoSuffix(pub String);

#[derive(Clone)]
pub struct OutputDirectory(pub String);

const INITIAL_CHUNK_SIZE: u64 = 1_048_576; // 1 MB for faster initial load

pub async fn stream_video(
    Path(file_path): Path<String>,
    Extension(output_directory): Extension<OutputDirectory>,
    headers: HeaderMap,
) -> Result<Response<BodyDataStream>, StatusCode> {
    info!("Attempting to stream: {}/{}", output_directory.0, file_path);

    let mut file = TokioFile::open(format!("{}/{}", output_directory.0, file_path))
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    let file_length = file
        .metadata()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .len();

    let range = headers
        .get(header::RANGE)
        .and_then(|range_header| range_header.to_str().ok());
    let (start, end) = match range {
        Some(range) if range.starts_with("bytes=") => {
            let parts: Vec<&str> = range["bytes=".len()..].split('-').collect();
            let start = parts[0].parse::<u64>().unwrap_or(0);
            let end = parts
                .get(1)
                .and_then(|&s| s.parse::<u64>().ok())
                .unwrap_or(file_length - 1);
            (start, end)
        }
        _ => (0, INITIAL_CHUNK_SIZE.min(file_length) - 1),
    };

    if start >= file_length || end >= file_length || start > end {
        return Err(StatusCode::RANGE_NOT_SATISFIABLE);
    }

    // Seek to the start position for the requested range
    file.seek(SeekFrom::Start(start))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create a stream that reads from the file in chunks
    let stream = ReaderStream::new(file.take(end - start + 1));
    let body = Body::into_data_stream(Body::from_stream(stream));

    // Build the response with individual headers and the streaming body
    let response = Response::builder()
        .status(StatusCode::PARTIAL_CONTENT)
        .header(header::CONTENT_TYPE, "video/mp4")
        .header(header::CONTENT_LENGTH, (end - start + 1).to_string())
        .header(
            header::CONTENT_RANGE,
            format!("bytes {}-{}/{}", start, end, file_length),
        )
        .header(header::ACCEPT_RANGES, "bytes")
        .body(body)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(response)
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

    payload.values = vec![0.0];
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
