use axum::{
    Json,
    extract::{Path, State},
};

use crate::{PoolHandle, error::ScyllaError, lap_timing::Lap, services::lap_service};

/// get the laps a run timed on a track, from the run's stored GPS fixes
pub async fn get_laps(
    State(pool): State<PoolHandle>,
    Path((run_id, track_id)): Path<(i32, i32)>,
) -> Result<Json<Vec<Lap>>, ScyllaError> {
    let mut db = pool.get().await?;
    let laps = lap_service::get_laps(&mut db, run_id, track_id)
        .await?
        .ok_or(ScyllaError::EmptyResult)?;

    Ok(Json::from(laps))
}
