use std::sync::atomic::Ordering;

use axum::{extract::Path, Json};
use serde::Serialize;

use crate::{error::ScyllaError, BATCH_UPSERT_TIME, DATA_UPLOAD_DISABLE};

/// holding all of scylla's settings
#[derive(Serialize)]
pub struct ScyllaSettings {
    pub data_upload_disabled: bool,
    pub batch_upsert_time: u16,
}

/// gets uploading data status
#[axum::debug_handler]
pub async fn get_settings() -> Result<Json<ScyllaSettings>, ScyllaError> {
    Ok(Json::from(ScyllaSettings {
        data_upload_disabled: DATA_UPLOAD_DISABLE.load(Ordering::Relaxed),
        batch_upsert_time: BATCH_UPSERT_TIME.load(Ordering::Relaxed),
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
pub async fn batch_upsert_set(Path(time): Path<u16>) -> Result<(), ScyllaError> {
    BATCH_UPSERT_TIME.store(time, Ordering::Relaxed);
    Ok(())
}
