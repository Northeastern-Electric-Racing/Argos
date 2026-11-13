use std::time::Duration;

use crate::test_utils::cleanup_and_prepare;
use axum::{Extension, Json, extract::Path};
use scylla_server::{
    Database,
    controllers::track_controller::{self, AddTrackPayload},
    error::ScyllaError,
    lap_timing::{GeoPoint, LineKind, TimingLine},
    services::track_service,
    track_handler::TracksChanged,
    transformers::track_transformer::PublicTrack,
};

fn line(lat: f64, lon: f64) -> TimingLine {
    TimingLine {
        a: GeoPoint { lat, lon },
        b: GeoPoint {
            lat: lat + 0.0001,
            lon: lon - 0.0001,
        },
    }
}

async fn stored_tracks(db: &mut Database<'_>) -> Result<Vec<PublicTrack>, diesel::result::Error> {
    let tracks = track_service::get_all_tracks(db).await?;
    Ok(tracks.into_iter().map(PublicTrack::from).collect())
}

#[tokio::test]
async fn test_add_and_list_tracks_in_id_order() -> Result<(), diesel::result::Error> {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = argos_pool.get().await.unwrap();

    assert!(track_service::get_all_tracks(&mut db).await?.is_empty());

    let endurance = track_service::add_track(&mut db, "Endurance".to_owned()).await?;
    let accel = track_service::add_track(&mut db, "Accel".to_owned()).await?;

    assert_eq!(
        stored_tracks(&mut db).await?,
        vec![
            PublicTrack {
                id: endurance.id,
                name: "Endurance".to_owned(),
                start_line: None,
                finish_line: None,
            },
            PublicTrack {
                id: accel.id,
                name: "Accel".to_owned(),
                start_line: None,
                finish_line: None,
            },
        ]
    );

    Ok(())
}

#[tokio::test]
async fn test_edit_track_line_replaces_only_that_line() -> Result<(), diesel::result::Error> {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = argos_pool.get().await.unwrap();
    let added = track_service::add_track(&mut db, "Accel".to_owned()).await?;
    let finish = line(42.338_5, -71.087_5);
    track_service::edit_track_line(&mut db, added.id, LineKind::Finish, Some(finish)).await?;
    let precise_start = line(42.337_812_345_678, -71.086_712_345_678);

    let edited =
        track_service::edit_track_line(&mut db, added.id, LineKind::Start, Some(precise_start))
            .await?
            .map(PublicTrack::from);

    let stored = stored_tracks(&mut db).await?;
    assert_eq!(
        stored,
        [PublicTrack {
            id: added.id,
            name: "Accel".to_owned(),
            start_line: Some(precise_start),
            finish_line: Some(finish),
        }]
    );
    assert_eq!(edited.as_ref(), stored.first());

    Ok(())
}

#[tokio::test]
async fn test_edit_track_line_with_none_clears_it() -> Result<(), diesel::result::Error> {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = argos_pool.get().await.unwrap();
    let added = track_service::add_track(&mut db, "Accel".to_owned()).await?;
    let finish = line(42.338_5, -71.087_5);
    track_service::edit_track_line(&mut db, added.id, LineKind::Start, Some(line(42.1, -71.1)))
        .await?;
    track_service::edit_track_line(&mut db, added.id, LineKind::Finish, Some(finish)).await?;

    track_service::edit_track_line(&mut db, added.id, LineKind::Start, None).await?;

    assert_eq!(
        stored_tracks(&mut db).await?,
        [PublicTrack {
            id: added.id,
            name: "Accel".to_owned(),
            start_line: None,
            finish_line: Some(finish),
        }]
    );

    Ok(())
}

#[tokio::test]
async fn test_edit_unknown_track_is_empty_result() {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();

    let edited = track_controller::edit_track_line(
        Extension(argos_pool),
        Extension(TracksChanged::default()),
        Path((1, LineKind::Start)),
        Json(None),
    )
    .await;

    assert!(matches!(edited, Err(ScyllaError::EmptyResult)));
}

#[tokio::test]
async fn test_delete_unknown_track_is_empty_result() {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();

    let deleted = track_controller::delete_track(
        Extension(argos_pool),
        Extension(TracksChanged::default()),
        Path(1),
    )
    .await;

    assert!(matches!(deleted, Err(ScyllaError::EmptyResult)));
}

#[tokio::test]
async fn test_delete_track() -> Result<(), diesel::result::Error> {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = argos_pool.get().await.unwrap();

    let kept = track_service::add_track(&mut db, "Kept".to_owned()).await?;
    let deleted = track_service::add_track(&mut db, "Deleted".to_owned()).await?;

    assert!(track_service::delete_track(&mut db, deleted.id).await?);
    assert!(!track_service::delete_track(&mut db, deleted.id).await?);

    let remaining: Vec<i32> = track_service::get_all_tracks(&mut db)
        .await?
        .into_iter()
        .map(|track| track.id)
        .collect();
    assert_eq!(remaining, vec![kept.id]);

    Ok(())
}

#[tokio::test]
async fn test_added_track_wakes_the_track_handler() -> Result<(), ScyllaError> {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();
    let tracks_changed = TracksChanged::default();

    let added = track_controller::add_track(
        Extension(argos_pool),
        Extension(tracks_changed.clone()),
        Json(AddTrackPayload {
            name: "Accel".to_owned(),
        }),
    )
    .await?;

    assert_eq!(added.name, "Accel");
    assert!(
        tokio::time::timeout(Duration::ZERO, tracks_changed.0.notified())
            .await
            .is_ok()
    );
    Ok(())
}
