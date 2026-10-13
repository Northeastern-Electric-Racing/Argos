use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use serde::Deserialize;

use crate::{
    PoolHandle, error::ScyllaError, lap_timing::TimingLine, models::TrackLines,
    services::track_service, transformers::track_transformer::PublicTrack,
};

/// get every track
pub async fn get_all_tracks(
    State(pool): State<PoolHandle>,
) -> Result<Json<Vec<PublicTrack>>, ScyllaError> {
    let mut db = pool.get().await?;
    let tracks = track_service::get_all_tracks(&mut db).await?;

    Ok(Json::from(
        tracks
            .into_iter()
            .map(PublicTrack::from)
            .collect::<Vec<_>>(),
    ))
}

#[derive(Deserialize, Debug, PartialEq)]
pub struct AddTrackPayload {
    pub name: String,
}

/// add a track with no lines
pub async fn add_track(
    State(pool): State<PoolHandle>,
    Json(AddTrackPayload { name }): Json<AddTrackPayload>,
) -> Result<Json<PublicTrack>, ScyllaError> {
    let mut db = pool.get().await?;
    let added = track_service::add_track(&mut db, name).await?;

    Ok(Json::from(PublicTrack::from(added)))
}

#[derive(Deserialize, Debug, PartialEq)]
pub struct EditTrackPayload {
    #[serde(rename = "startLine")]
    pub start_line: Option<TimingLine>,
    #[serde(rename = "finishLine")]
    pub finish_line: Option<TimingLine>,
}

/// replace both lines of the track with the given id
pub async fn edit_track(
    State(pool): State<PoolHandle>,
    Path(track_id): Path<i32>,
    Json(EditTrackPayload {
        start_line,
        finish_line,
    }): Json<EditTrackPayload>,
) -> Result<Json<PublicTrack>, ScyllaError> {
    let out_of_range = [start_line, finish_line]
        .into_iter()
        .flatten()
        .any(|line| !line.a.is_in_range() || !line.b.is_in_range());
    if out_of_range {
        return Err(ScyllaError::HttpError(
            StatusCode::BAD_REQUEST,
            "Line coordinates must be finite with |lat| <= 90 and |lon| <= 180".to_owned(),
        ));
    }

    let mut db = pool.get().await?;
    let edited =
        track_service::edit_track(&mut db, track_id, TrackLines::new(start_line, finish_line))
            .await?
            .ok_or(ScyllaError::EmptyResult)?;

    Ok(Json::from(PublicTrack::from(edited)))
}

/// delete a track given its id
pub async fn delete_track(
    State(pool): State<PoolHandle>,
    Path(track_id): Path<i32>,
) -> Result<Json<String>, ScyllaError> {
    let mut db = pool.get().await?;
    if !track_service::delete_track(&mut db, track_id).await? {
        return Err(ScyllaError::EmptyResult);
    }

    Ok(Json::from("Track deleted!".to_owned()))
}
