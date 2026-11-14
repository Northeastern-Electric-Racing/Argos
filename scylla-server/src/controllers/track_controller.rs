use axum::{Extension, Json, extract::Path, http::StatusCode};
use serde::Deserialize;

use crate::{
    ArgosPoolHandle,
    error::ScyllaError,
    lap_timing::{LineKind, TimingLine},
    services::track_service,
    track_handler::TracksChanged,
    transformers::track_transformer::PublicTrack,
};

#[derive(Deserialize)]
pub struct AddTrackPayload {
    pub name: String,
}

/// add a track with no lines
pub async fn add_track(
    Extension(argos_pool): Extension<ArgosPoolHandle>,
    Extension(TracksChanged(tracks_changed)): Extension<TracksChanged>,
    Json(AddTrackPayload { name }): Json<AddTrackPayload>,
) -> Result<Json<PublicTrack>, ScyllaError> {
    let mut db = argos_pool.get().await?;
    let added = track_service::add_track(&mut db, name).await?;
    tracks_changed.notify_one();

    Ok(Json::from(PublicTrack::from(added)))
}

/// replace one line of the track with the given id, or clear it with null
pub async fn edit_track_line(
    Extension(argos_pool): Extension<ArgosPoolHandle>,
    Extension(TracksChanged(tracks_changed)): Extension<TracksChanged>,
    Path((track_id, kind)): Path<(i32, LineKind)>,
    Json(line): Json<Option<TimingLine>>,
) -> Result<Json<PublicTrack>, ScyllaError> {
    if line.is_some_and(|line| !line.a.is_in_range() || !line.b.is_in_range()) {
        return Err(ScyllaError::HttpError(
            StatusCode::BAD_REQUEST,
            "Line coordinates must be finite with |lat| <= 90 and |lon| <= 180".to_owned(),
        ));
    }

    let mut db = argos_pool.get().await?;
    let edited = track_service::edit_track_line(&mut db, track_id, kind, line)
        .await?
        .ok_or(ScyllaError::EmptyResult)?;
    tracks_changed.notify_one();

    Ok(Json::from(PublicTrack::from(edited)))
}

/// delete a track given its id
pub async fn delete_track(
    Extension(argos_pool): Extension<ArgosPoolHandle>,
    Extension(TracksChanged(tracks_changed)): Extension<TracksChanged>,
    Path(track_id): Path<i32>,
) -> Result<Json<String>, ScyllaError> {
    let mut db = argos_pool.get().await?;
    if !track_service::delete_track(&mut db, track_id).await? {
        return Err(ScyllaError::EmptyResult);
    }
    tracks_changed.notify_one();

    Ok(Json::from("Track deleted!".to_owned()))
}
