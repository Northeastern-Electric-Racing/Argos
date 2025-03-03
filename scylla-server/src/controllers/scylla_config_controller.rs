use std::sync::atomic::Ordering;

use crate::{error::ScyllaError, DATA_UPLOAD_DISABLE};

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

/// gets uploading data status
#[axum::debug_handler]
pub async fn get_data_upload() -> Result<&'static str, ScyllaError> {
    if DATA_UPLOAD_DISABLE.load(Ordering::Relaxed) {
        Ok("disabled")
    } else {
        Ok("enabled")
    }
}
