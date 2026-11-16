use axum::{Extension, Json, extract::Path, http::StatusCode};
use scylla_server::{
    ArgosPoolHandle,
    controllers::track_controller,
    error::ScyllaError,
    lap_timing::{GeoPoint, LineKind, METRES_PER_DEGREE, TimingLine},
    track_handler::TracksChanged,
    transformers::track_transformer::PublicTrack,
};

#[tokio::test]
async fn an_unavailable_argos_database_is_service_unavailable() {
    let argos_pool = ArgosPoolHandle::default();
    let connection = argos_pool.get().await;

    assert!(matches!(
        connection,
        Err(ScyllaError::HttpError(StatusCode::SERVICE_UNAVAILABLE, _))
    ));
}

/// Edits a finish line with no argos database, so only the checks made before it can answer
async fn edit_without_database(a: GeoPoint, b: GeoPoint) -> Result<Json<PublicTrack>, ScyllaError> {
    track_controller::edit_track_line(
        Extension(ArgosPoolHandle::default()),
        Extension(TracksChanged::default()),
        Path((1, LineKind::Finish)),
        Json(Some(TimingLine { a, b })),
    )
    .await
}

#[tokio::test]
async fn an_out_of_range_line_is_rejected_before_the_database() {
    let edited = edit_without_database(
        GeoPoint {
            lat: 42.1,
            lon: -71.1,
        },
        GeoPoint {
            lat: 90.000_1,
            lon: -71.1,
        },
    )
    .await;

    assert!(matches!(
        edited,
        Err(ScyllaError::HttpError(StatusCode::BAD_REQUEST, _))
    ));
}

#[tokio::test]
async fn a_line_under_a_metre_long_is_rejected_before_the_database() {
    // half a metre north to south, as a double-click leaves it
    let a = GeoPoint {
        lat: 42.1,
        lon: -71.1,
    };
    let edited = edit_without_database(
        a,
        GeoPoint {
            lat: a.lat + 0.5 / METRES_PER_DEGREE,
            lon: a.lon,
        },
    )
    .await;

    assert!(matches!(
        edited,
        Err(ScyllaError::HttpError(StatusCode::BAD_REQUEST, _))
    ));
}
