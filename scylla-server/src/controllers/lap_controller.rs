use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use serde::Deserialize;

use crate::{
    ArgosPoolHandle, PoolHandle,
    error::ScyllaError,
    services::{
        lap_service::{self, LapsSince},
        track_service,
    },
};

#[derive(Deserialize)]
pub struct LapsQuery {
    /// ms since epoch; only laps starting at or after it are returned, every lap if 0
    #[serde(default)]
    pub since: f64,
}

/// get the laps a run timed on a track, from the run's stored GPS fixes
pub async fn get_laps(
    State(pool): State<PoolHandle>,
    Extension(argos_pool): Extension<ArgosPoolHandle>,
    Path((run_id, track_id)): Path<(i32, i32)>,
    Query(query): Query<LapsQuery>,
) -> Result<Json<LapsSince>, ScyllaError> {
    let mut argos_db = argos_pool.get().await?;
    let track = track_service::get_track_by_id(&mut argos_db, track_id)
        .await?
        .ok_or(ScyllaError::EmptyResult)?;
    let mut db = pool.get().await?;
    let laps = lap_service::get_laps(&mut db, run_id, &track, query.since).await?;

    Ok(Json::from(laps))
}
