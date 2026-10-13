use crate::test_utils::cleanup_and_prepare;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use scylla_server::{
    controllers::track_controller::{self, EditTrackPayload},
    error::ScyllaError,
    lap_timing::{GeoPoint, TimingLine},
    models::TrackLines,
    services::track_service,
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

#[tokio::test]
async fn test_add_and_list_tracks_in_id_order() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    assert!(track_service::get_all_tracks(&mut db).await?.is_empty());

    let endurance = track_service::add_track(&mut db, "Endurance".to_owned()).await?;
    let accel = track_service::add_track(&mut db, "Accel".to_owned()).await?;

    let listed: Vec<PublicTrack> = track_service::get_all_tracks(&mut db)
        .await?
        .into_iter()
        .map(PublicTrack::from)
        .collect();
    assert_eq!(
        listed,
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
    assert!(endurance.id < accel.id);

    Ok(())
}

#[tokio::test]
async fn test_edit_track_overwrites_both_lines() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    let added = track_service::add_track(&mut db, "Accel".to_owned()).await?;
    track_service::edit_track(
        &mut db,
        added.id,
        TrackLines::new(
            Some(line(42.337_812_345_678, -71.086_712_345_678)),
            Some(line(42.338_5, -71.087_5)),
        ),
    )
    .await?;

    let edited = track_service::edit_track(
        &mut db,
        added.id,
        TrackLines::new(Some(line(42.1, -71.1)), None),
    )
    .await?
    .expect("track should exist");

    let expected = PublicTrack {
        id: added.id,
        name: "Accel".to_owned(),
        start_line: Some(line(42.1, -71.1)),
        finish_line: None,
    };
    assert_eq!(PublicTrack::from(edited), expected);
    assert_eq!(
        track_service::get_track_by_id(&mut db, added.id)
            .await?
            .map(PublicTrack::from),
        Some(expected)
    );

    Ok(())
}

#[tokio::test]
async fn test_edit_unknown_track_saves_nothing() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    let edited =
        track_service::edit_track(&mut db, 1, TrackLines::new(Some(line(42.1, -71.1)), None))
            .await?;

    assert_eq!(edited, None);
    assert!(track_service::get_all_tracks(&mut db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_edit_unknown_track_is_empty_result() {
    let pool = cleanup_and_prepare().await.unwrap();

    let edited = track_controller::edit_track(
        State(pool),
        Path(1),
        Json(EditTrackPayload {
            start_line: None,
            finish_line: None,
        }),
    )
    .await;

    assert!(matches!(edited, Err(ScyllaError::EmptyResult)));
}

#[tokio::test]
async fn test_delete_unknown_track_is_empty_result() {
    let pool = cleanup_and_prepare().await.unwrap();

    let deleted = track_controller::delete_track(State(pool), Path(1)).await;

    assert!(matches!(deleted, Err(ScyllaError::EmptyResult)));
}

#[tokio::test]
async fn test_edit_track_accepts_boundary_coordinates() -> Result<(), ScyllaError> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await?;
    let added = track_service::add_track(&mut db, "Accel".to_owned()).await?;
    drop(db);
    let corners = TimingLine {
        a: GeoPoint {
            lat: 90.0,
            lon: 180.0,
        },
        b: GeoPoint {
            lat: -90.0,
            lon: -180.0,
        },
    };

    let edited = track_controller::edit_track(
        State(pool),
        Path(added.id),
        Json(EditTrackPayload {
            start_line: Some(corners),
            finish_line: Some(line(42.1, -71.1)),
        }),
    )
    .await?;

    assert_eq!(
        edited.0,
        PublicTrack {
            id: added.id,
            name: "Accel".to_owned(),
            start_line: Some(corners),
            finish_line: Some(line(42.1, -71.1)),
        }
    );
    Ok(())
}

#[tokio::test]
async fn test_edit_track_rejects_out_of_range_coordinates() -> Result<(), ScyllaError> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await?;
    let added = track_service::add_track(&mut db, "Accel".to_owned()).await?;

    for (lat, lon) in [
        (90.000_1, 0.0),
        (-90.000_1, 0.0),
        (0.0, 180.000_1),
        (0.0, -180.000_1),
        (f64::NAN, 0.0),
        (0.0, f64::INFINITY),
    ] {
        let bad_point = TimingLine {
            a: GeoPoint {
                lat: 42.1,
                lon: -71.1,
            },
            b: GeoPoint { lat, lon },
        };
        let edited = track_controller::edit_track(
            State(pool.clone()),
            Path(added.id),
            Json(EditTrackPayload {
                start_line: Some(line(42.1, -71.1)),
                finish_line: Some(bad_point),
            }),
        )
        .await;

        assert!(
            matches!(
                edited,
                Err(ScyllaError::HttpError(StatusCode::BAD_REQUEST, _))
            ),
            "({lat}, {lon}) should be rejected"
        );
    }
    assert_eq!(
        track_service::get_track_by_id(&mut db, added.id)
            .await?
            .map(PublicTrack::from),
        Some(PublicTrack {
            id: added.id,
            name: "Accel".to_owned(),
            start_line: None,
            finish_line: None,
        })
    );
    Ok(())
}

#[tokio::test]
async fn test_delete_track() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

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
