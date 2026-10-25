use crate::test_utils::cleanup_and_prepare;
use axum::{
    Extension,
    extract::{Path, Query, State},
};
use scylla_server::{
    ArgosPoolHandle, ClientData, Database, PoolHandle,
    controllers::lap_controller::{self, LapsQuery},
    error::ScyllaError,
    lap_timing::{GPS_LOCATION_TOPIC, GeoPoint, Lap, TimingLine},
    models::TrackLines,
    services::{data_service, data_type_service, run_service, track_service},
};

#[tokio::test]
async fn test_laps_for_unknown_track_is_empty_result() {
    let (pool, argos_pool) = cleanup_and_prepare().await.unwrap();

    let laps = lap_controller::get_laps(
        State(pool),
        Extension(argos_pool),
        Path((1, 1)),
        Query(LapsQuery { since: 0.0 }),
    )
    .await;

    assert!(matches!(laps, Err(ScyllaError::EmptyResult)));
}

#[tokio::test]
async fn test_laps_for_track_without_start_line_is_empty() {
    let (pool, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut argos_db = argos_pool.get().await.unwrap();
    let track = track_service::add_track(&mut argos_db, "Skidpad".to_owned())
        .await
        .unwrap();
    drop(argos_db);

    let laps = get_laps(&pool, &argos_pool, 1, track.id, 0.0)
        .await
        .unwrap();

    assert_eq!(laps, vec![]);
}

const START_LON: f64 = -71.0;
const FINISH_LON: f64 = -71.0 + 4.0 * STEP;
const LINE_LAT: f64 = 42.0;
/// A power of two, so every fix is exact in the stored f32 and each crossing falls exactly halfway
const STEP: f64 = 1.0 / 1024.0;
const NORTH_OF_LINES: f64 = LINE_LAT + 4.0 * STEP;
const RUN_START_MS: i64 = 1_712_345_670_000;

fn vertical_line(lon: f64) -> TimingLine {
    TimingLine {
        a: GeoPoint {
            lat: LINE_LAT + STEP,
            lon,
        },
        b: GeoPoint {
            lat: LINE_LAT - STEP,
            lon,
        },
    }
}

async fn insert_locations(
    db: &mut Database<'_>,
    run_id: i32,
    locations: &[(i64, Vec<f64>)],
) -> Result<(), diesel::result::Error> {
    data_type_service::upsert_data_type(db, GPS_LOCATION_TOPIC.to_owned(), "deg".to_owned())
        .await?;
    for (offset_ms, values) in locations {
        data_service::add_data(
            db,
            ClientData {
                values: values.iter().map(|&value| value as f32).collect(),
                unit: "deg".to_owned(),
                run_id,
                name: GPS_LOCATION_TOPIC.to_owned(),
                timestamp: chrono::DateTime::from_timestamp_micros(
                    (RUN_START_MS + offset_ms) * 1000,
                )
                .unwrap(),
            },
        )
        .await?;
    }
    Ok(())
}

async fn track_with_lines(
    argos_db: &mut Database<'_>,
    start_line: TimingLine,
    finish_line: Option<TimingLine>,
) -> Result<i32, diesel::result::Error> {
    let track = track_service::add_track(argos_db, "Endurance".to_owned()).await?;
    track_service::edit_track(
        argos_db,
        track.id,
        TrackLines::new(Some(start_line), finish_line),
    )
    .await?;
    Ok(track.id)
}

fn lap(start_offset_ms: f64, end_offset_ms: f64) -> Lap {
    Lap {
        start_ms: RUN_START_MS as f64 + start_offset_ms,
        end_ms: RUN_START_MS as f64 + end_offset_ms,
        duration_ms: end_offset_ms - start_offset_ms,
    }
}

/// A run that times laps (1 500.5, 11 501.5) and (11 501.5, 21 503.5) on a start-only track
async fn start_only_run(
    db: &mut Database<'_>,
    argos_db: &mut Database<'_>,
) -> Result<(i32, i32), ScyllaError> {
    let run = run_service::create_run(
        db,
        chrono::DateTime::from_timestamp_millis(RUN_START_MS).unwrap(),
    )
    .await?;
    let west = START_LON - STEP;
    let east = START_LON + STEP;
    insert_locations(
        db,
        run.runId,
        &[
            (12_003, vec![LINE_LAT, east]),
            (1_000, vec![LINE_LAT, west]),
            (8_000, vec![NORTH_OF_LINES, west]),
            (6_000, vec![LINE_LAT]),
            (2_001, vec![LINE_LAT, east]),
            (22_007, vec![LINE_LAT, east]),
            (5_000, vec![NORTH_OF_LINES, east]),
            (11_000, vec![LINE_LAT, west]),
            (15_000, vec![NORTH_OF_LINES, east]),
            (21_000, vec![LINE_LAT, west]),
            (18_000, vec![NORTH_OF_LINES, west]),
        ],
    )
    .await?;
    let track_id = track_with_lines(argos_db, vertical_line(START_LON), None).await?;
    Ok((run.runId, track_id))
}

/// A run that times laps (1 500.5, 3 500.5) and (11 501.5, 13 502.5) on a start and finish track
async fn start_finish_run(
    db: &mut Database<'_>,
    argos_db: &mut Database<'_>,
) -> Result<(i32, i32), ScyllaError> {
    let run = run_service::create_run(
        db,
        chrono::DateTime::from_timestamp_millis(RUN_START_MS).unwrap(),
    )
    .await?;
    let west_of_start = START_LON - STEP;
    let east_of_start = START_LON + STEP;
    let west_of_finish = FINISH_LON - STEP;
    let east_of_finish = FINISH_LON + STEP;
    insert_locations(
        db,
        run.runId,
        &[
            (13_000, vec![LINE_LAT, west_of_finish]),
            (1_000, vec![LINE_LAT, west_of_start]),
            (4_001, vec![LINE_LAT, east_of_finish]),
            (9_000, vec![LINE_LAT]),
            (2_001, vec![LINE_LAT, east_of_start]),
            (12_003, vec![LINE_LAT, east_of_start]),
            (3_000, vec![LINE_LAT, west_of_finish]),
            (6_000, vec![NORTH_OF_LINES, east_of_finish]),
            (14_005, vec![LINE_LAT, east_of_finish]),
            (8_000, vec![NORTH_OF_LINES, west_of_start]),
            (11_000, vec![LINE_LAT, west_of_start]),
        ],
    )
    .await?;
    let track_id = track_with_lines(
        argos_db,
        vertical_line(START_LON),
        Some(vertical_line(FINISH_LON)),
    )
    .await?;
    Ok((run.runId, track_id))
}

async fn get_laps(
    pool: &PoolHandle,
    argos_pool: &ArgosPoolHandle,
    run_id: i32,
    track_id: i32,
    since: f64,
) -> Result<Vec<Lap>, ScyllaError> {
    let laps = lap_controller::get_laps(
        State(pool.clone()),
        Extension(argos_pool.clone()),
        Path((run_id, track_id)),
        Query(LapsQuery { since }),
    )
    .await?;
    Ok(laps.0)
}

/// With each lap's start or end as `since`, the full laps starting before it followed by the laps since it are the full laps
async fn assert_since_laps_rebuild_full_laps(
    pool: &PoolHandle,
    argos_pool: &ArgosPoolHandle,
    run_id: i32,
    track_id: i32,
) -> Result<(), ScyllaError> {
    let full = get_laps(pool, argos_pool, run_id, track_id, 0.0).await?;
    assert_eq!(full.len(), 2);
    for since in full.iter().flat_map(|timed| [timed.start_ms, timed.end_ms]) {
        let since_laps = get_laps(pool, argos_pool, run_id, track_id, since).await?;
        let rebuilt: Vec<&Lap> = full
            .iter()
            .filter(|timed| timed.start_ms < since)
            .chain(&since_laps)
            .collect();
        assert_eq!(rebuilt, full.iter().collect::<Vec<_>>(), "since {since}");
    }
    Ok(())
}

#[tokio::test]
async fn test_laps_between_consecutive_start_crossings() -> Result<(), ScyllaError> {
    let (pool, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();
    let mut argos_db = argos_pool.get().await.unwrap();
    let (run_id, track_id) = start_only_run(&mut db, &mut argos_db).await?;
    drop(db);
    drop(argos_db);

    let laps = get_laps(&pool, &argos_pool, run_id, track_id, 0.0).await?;

    assert_eq!(laps, vec![lap(1_500.5, 11_501.5), lap(11_501.5, 21_503.5)]);
    Ok(())
}

#[tokio::test]
async fn test_laps_from_start_to_finish_crossing() -> Result<(), ScyllaError> {
    let (pool, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();
    let mut argos_db = argos_pool.get().await.unwrap();
    let (run_id, track_id) = start_finish_run(&mut db, &mut argos_db).await?;
    drop(db);
    drop(argos_db);

    let laps = get_laps(&pool, &argos_pool, run_id, track_id, 0.0).await?;

    assert_eq!(laps, vec![lap(1_500.5, 3_500.5), lap(11_501.5, 13_502.5)]);
    Ok(())
}

#[tokio::test]
async fn test_laps_since_rebuild_start_only_laps() -> Result<(), ScyllaError> {
    let (pool, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();
    let mut argos_db = argos_pool.get().await.unwrap();
    let (run_id, track_id) = start_only_run(&mut db, &mut argos_db).await?;
    drop(db);
    drop(argos_db);

    assert_since_laps_rebuild_full_laps(&pool, &argos_pool, run_id, track_id).await
}

#[tokio::test]
async fn test_laps_since_rebuild_start_finish_laps() -> Result<(), ScyllaError> {
    let (pool, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();
    let mut argos_db = argos_pool.get().await.unwrap();
    let (run_id, track_id) = start_finish_run(&mut db, &mut argos_db).await?;
    drop(db);
    drop(argos_db);

    assert_since_laps_rebuild_full_laps(&pool, &argos_pool, run_id, track_id).await
}
