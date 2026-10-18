use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde::Deserialize;

use crate::{PoolHandle, error::ScyllaError, lap_timing::Lap, services::lap_service};

#[derive(Deserialize)]
pub struct LapsQuery {
    /// ms since epoch; only laps starting at or after it are returned, numbered from 1
    pub since: Option<f64>,
}

/// get the laps a run timed on a track, from the run's stored GPS fixes
pub async fn get_laps(
    State(pool): State<PoolHandle>,
    Path((run_id, track_id)): Path<(i32, i32)>,
    Query(query): Query<LapsQuery>,
) -> Result<Json<Vec<Lap>>, ScyllaError> {
    let mut db = pool.get().await?;
    let laps = lap_service::get_laps(&mut db, run_id, track_id, query.since)
        .await?
        .ok_or(ScyllaError::EmptyResult)?;

    Ok(Json::from(laps))
}
