use std::time::Duration;

use crate::test_utils::cleanup_and_prepare;
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use scylla_server::{
    ArgosPoolHandle, ClientData,
    argos_schema::lap,
    error::ScyllaError,
    lap_timing::{GPS_LOCATION_TOPIC, GeoPoint, LineKind, TimingLine},
    services::track_service,
    track_handler::{LiveRunHandle, TracksChanged, track_handler},
};
use socketioxide::{SocketIo, extract::SocketRef};
use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;

/// A fix of `run_id` each second, 10 m west of longitude -71 for 4 s, then 10 m east of it for 4 s, and so on
fn gps(run_id: i32, second: i64) -> ClientData {
    let east = if (second / 4) % 2 == 0 { -1.0 } else { 1.0 };
    ClientData {
        run_id,
        name: GPS_LOCATION_TOPIC.to_owned(),
        unit: String::new(),
        values: vec![42.0, -71.0 + east * 0.000_12],
        timestamp: chrono::DateTime::from_timestamp_millis(second * 1000).unwrap(),
    }
}

/// The saved laps as (run, track, duration in ms), once there are any
async fn saved_laps(argos_pool: &ArgosPoolHandle) -> Result<Vec<(i32, i32, f64)>, ScyllaError> {
    for _ in 0..50 {
        let laps: Vec<(i32, i32, f64, f64)> = lap::table
            .select((lap::runId, lap::trackId, lap::startMs, lap::endMs))
            .load(&mut argos_pool.get().await?)
            .await?;
        if !laps.is_empty() {
            return Ok(laps
                .into_iter()
                .map(|(run, track, start, end)| (run, track, (end - start).round()))
                .collect());
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    Ok(Vec::new())
}

#[tokio::test]
async fn test_a_runs_laps_are_saved_when_the_next_run_starts() -> Result<(), ScyllaError> {
    let (_, argos_pool) = cleanup_and_prepare().await.unwrap();
    let mut db = argos_pool.get().await?;
    let added = track_service::add_track(&mut db, "Loop".to_owned()).await?;
    let start_line = TimingLine {
        a: GeoPoint {
            lat: 42.001,
            lon: -71.0,
        },
        b: GeoPoint {
            lat: 41.999,
            lon: -71.0,
        },
    };
    track_service::edit_track_line(&mut db, added.id, LineKind::Start, Some(start_line)).await?;
    drop(db);
    let (data_send, data_recv) = broadcast::channel(100);
    let (_, io) = SocketIo::new_layer();
    io.ns("/", async |_: SocketRef| {});
    tokio::spawn(track_handler(
        CancellationToken::new(),
        data_recv,
        argos_pool.clone(),
        TracksChanged::default(),
        LiveRunHandle::default(),
        io,
    ));
    // the handler loads the tracks as it starts
    tokio::time::sleep(Duration::from_millis(200)).await;

    // run 3 crosses the start line at 3.5 s and 7.5 s, one 4 s lap; then run 4 starts
    for second in 0..=8 {
        data_send.send(gps(3, second)).unwrap();
    }
    data_send.send(gps(4, 9)).unwrap();

    assert_eq!(saved_laps(&argos_pool).await?, [(3, added.id, 4000.0)]);
    Ok(())
}
