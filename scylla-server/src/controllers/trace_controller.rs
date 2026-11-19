use axum::{Extension, Json, extract::Path};

use crate::{lap_timing::GpsFix, track_handler::LiveRunHandle};

/// get the live run's driving trace so far, or none if the run with the given id isn't live
pub async fn get_trace(
    Extension(LiveRunHandle(live_run)): Extension<LiveRunHandle>,
    Path(run_id): Path<i32>,
) -> Json<Vec<GpsFix>> {
    Json::from(live_run.lock().await.trace(run_id))
}
