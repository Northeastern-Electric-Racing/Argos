use std::sync::atomic::Ordering;

use axum::{extract::Path, Json};
use serde::Serialize;

use crate::{
    error::ScyllaError, BATCH_UPSERT_TIME, DATA_UPLOAD_DISABLE, RATE_LIMIT_MODE,
    SOCKET_DISCARD_PERCENT, STATIC_RATE_LIMIT_VALUE,
};

/// holding all of scylla's settings
#[derive(Serialize)]
pub struct ScyllaSettings {
    pub data_upload_disabled: bool,
    pub batch_upsert_time: u16,
    pub ratelimit_mode: u8,
    pub static_ratelimit_time: u16,
    pub socket_discard_percent: u8,
}

/// gets uploading data status
#[axum::debug_handler]
pub async fn get_settings() -> Result<Json<ScyllaSettings>, ScyllaError> {
    Ok(Json::from(ScyllaSettings {
        data_upload_disabled: DATA_UPLOAD_DISABLE.load(Ordering::Relaxed),
        batch_upsert_time: BATCH_UPSERT_TIME.load(Ordering::Relaxed),
        ratelimit_mode: RATE_LIMIT_MODE.load(Ordering::Relaxed),
        static_ratelimit_time: STATIC_RATE_LIMIT_VALUE.load(Ordering::Relaxed),
        socket_discard_percent: SOCKET_DISCARD_PERCENT.load(Ordering::Relaxed),
    }))
}

/// disable uploading data
pub async fn disable_data_upload() -> Result<(), ScyllaError> {
    DATA_UPLOAD_DISABLE.store(true, Ordering::Relaxed);
    Ok(())
}

/// enables uploading data
pub async fn enable_data_upload() -> Result<(), ScyllaError> {
    DATA_UPLOAD_DISABLE.store(false, Ordering::Relaxed);
    Ok(())
}

/// sets the batch upsert time in seconds
pub async fn batch_upsert_set(Path(time_sec): Path<u16>) -> Result<(), ScyllaError> {
    BATCH_UPSERT_TIME.store(time_sec, Ordering::Relaxed);
    Ok(())
}

pub async fn rate_limit_mode_set(Path(mode_idex): Path<u8>) -> Result<(), ScyllaError> {
    RATE_LIMIT_MODE.store(mode_idex, Ordering::Relaxed);
    Ok(())
}

/// sets the static rate limit time in milliseconds
pub async fn static_ratelimit_time_set(Path(time_ms): Path<u16>) -> Result<(), ScyllaError> {
    STATIC_RATE_LIMIT_VALUE.store(time_ms, Ordering::Relaxed);
    Ok(())
}

/// sets the socket IO discard percentage
pub async fn socket_discard_percent_set(Path(discard_perc): Path<u8>) -> Result<(), ScyllaError> {
    SOCKET_DISCARD_PERCENT.store(discard_perc, Ordering::Relaxed);
    Ok(())
}
