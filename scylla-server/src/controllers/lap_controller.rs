use axum::{
    Extension, Json,
    extract::{Path, State},
};

use crate::{
    ArgosPoolHandle, PoolHandle,
    error::ScyllaError,
    lap_timing::Lap,
    services::{lap_service, track_service},
};

/// get the laps a run timed on a track, from the run's stored GPS fixes
pub async fn get_laps(
    State(pool): State<PoolHandle>,
    Extension(argos_pool): Extension<ArgosPoolHandle>,
    Path((run_id, track_id)): Path<(i32, i32)>,
) -> Result<Json<Vec<Lap>>, ScyllaError> {
    let mut argos_db = argos_pool.get().await?;
    let track = track_service::get_track_by_id(&mut argos_db, track_id)
        .await?
        .ok_or(ScyllaError::EmptyResult)?;
    let mut db = pool.get().await?;
    let laps = lap_service::get_laps(&mut db, run_id, &track).await?;

    Ok(Json::from(laps))
}
