use std::{collections::BTreeMap, sync::Arc, time::Duration};

use diesel_async::pooled_connection::AsyncDieselConnectionManager;
use scylla_server::{
    ArgosPoolHandle, ClientData, PoolHandle,
    lap_timing::{GPS_LOCATION_TOPIC, GeoPoint, GpsFix, Lap, METRES_PER_DEGREE, TimingLine},
    track_handler::{LiveRun, LiveRunHandle, RunLaps, TracksChanged, track_handler},
    transformers::track_transformer::PublicTrack,
};
use socketioxide::{SocketIo, extract::SocketRef};
use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;

const LINE_LON: f64 = -71.0;
/// A power of two, so a fix either side of the line crosses it exactly halfway in time; about 10 m east-west here
const STEP: f64 = 1.0 / 8192.0;

fn track(id: i32, start_line: Option<TimingLine>) -> PublicTrack {
    PublicTrack {
        id,
        name: "Endurance".to_owned(),
        start_line,
        finish_line: None,
    }
}

fn start_line(lon: f64) -> TimingLine {
    TimingLine {
        a: GeoPoint {
            lat: 42.0 + STEP,
            lon,
        },
        b: GeoPoint {
            lat: 42.0 - STEP,
            lon,
        },
    }
}

/// A fix west of the line at 0, 4, 8, … s and east of it at 2, 6, 10, … s, so fixes 2 s apart cross it halfway between
fn fix(second: i64) -> GpsFix {
    let side = if (second / 2) % 2 == 0 { -STEP } else { STEP };
    GpsFix {
        point: GeoPoint {
            lat: 42.0,
            lon: LINE_LON + side,
        },
        time_ms: second as f64 * 1000.0,
    }
}

fn push_seconds(live_run: &mut LiveRun, run_id: i32, seconds: &[i64]) {
    for &second in seconds {
        live_run.push(run_id, fix(second));
    }
}

fn lap(start_ms: f64, end_ms: f64) -> Lap {
    Lap {
        start_ms,
        end_ms,
        duration_ms: end_ms - start_ms,
    }
}

#[test]
fn laps_are_timed_on_every_track_with_a_start_line_as_fixes_arrive() {
    let mut live_run = LiveRun::default();
    live_run.set_tracks(&[
        track(7, Some(start_line(LINE_LON))),
        track(8, Some(start_line(LINE_LON + 1.0))),
        track(9, None),
    ]);

    push_seconds(&mut live_run, 3, &[0, 2, 4, 6]);

    assert_eq!(
        live_run.run_laps(),
        RunLaps {
            run_id: 3,
            laps: BTreeMap::from([
                (7, &[lap(1000.0, 3000.0), lap(3000.0, 5000.0)][..]),
                (8, &[][..]),
            ]),
        }
    );
}

#[test]
fn a_new_run_starts_timing_over() {
    let mut live_run = LiveRun::default();
    live_run.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);
    push_seconds(&mut live_run, 3, &[0, 2, 4]);

    push_seconds(&mut live_run, 4, &[6, 8, 10]);

    assert_eq!(
        live_run.run_laps(),
        RunLaps {
            run_id: 4,
            laps: BTreeMap::from([(7, &[lap(7000.0, 9000.0)][..])]),
        }
    );
}

#[test]
fn a_fix_no_newer_than_the_last_is_dropped() {
    let mut live_run = LiveRun::default();
    live_run.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);

    push_seconds(&mut live_run, 3, &[0, 2, 4]);
    // where the last fix was, so only its time gives it away
    live_run.push(3, fix_at(fix(4).point, 3000.0));
    push_seconds(&mut live_run, 3, &[6]);

    assert_eq!(
        live_run.run_laps().laps[&7],
        [lap(1000.0, 3000.0), lap(3000.0, 5000.0)]
    );
}

#[test]
fn setting_the_tracks_times_the_run_so_far() {
    let mut live_run = LiveRun::default();
    push_seconds(&mut live_run, 3, &[0, 2, 4]);
    assert_eq!(live_run.run_laps().laps, BTreeMap::new());

    live_run.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);

    assert_eq!(live_run.run_laps().laps[&7], [lap(1000.0, 3000.0)]);
}

/// A fix at `point` at `time_ms`
fn fix_at(point: GeoPoint, time_ms: f64) -> GpsFix {
    GpsFix { point, time_ms }
}

#[test]
fn a_gps_jump_is_dropped_with_the_fix_after_it() {
    let mut live_run = LiveRun::default();
    live_run.push(3, fix(0));
    // a kilometre in a second; the next fix is just as far from it, so it goes too
    live_run.push(
        3,
        fix_at(
            GeoPoint {
                lat: 42.01,
                lon: LINE_LON,
            },
            1000.0,
        ),
    );
    push_seconds(&mut live_run, 3, &[2, 4]);

    assert_eq!(live_run.trace(3), [fix(0), fix(4)]);
}

/// A fix `metres` east of the line, level with its middle, at `time_ms`
fn east_of_line(metres: f64, time_ms: f64) -> GpsFix {
    fix_at(
        GeoPoint {
            lat: 42.0,
            lon: LINE_LON + metres / (METRES_PER_DEGREE * 42_f64.to_radians().cos()),
        },
        time_ms,
    )
}

#[test]
fn a_fix_past_the_speed_limit_by_gps_jitter_is_kept() {
    let mut live_run = LiveRun::default();
    // 5 m in 0.1 s: past the 4 m that 40 m/s allows, within it plus the jitter allowance
    let fixes = [east_of_line(-10.0, 0.0), east_of_line(-5.0, 100.0)];
    for fix in fixes {
        live_run.push(3, fix);
    }

    assert_eq!(live_run.trace(3), fixes);
}

#[test]
fn a_jump_past_the_speed_limit_and_gps_jitter_is_dropped_and_times_no_lap() {
    let mut live_run = LiveRun::default();
    live_run.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);
    // a lap opens at 1 s; kept, the 6.5 m jump in 0.1 s would cross back at 3.015 s and close it
    let fixes = [
        east_of_line(-10.0, 0.0),
        east_of_line(10.0, 2000.0),
        east_of_line(1.0, 3000.0),
    ];
    for fix in fixes {
        live_run.push(3, fix);
    }
    live_run.push(3, east_of_line(-5.5, 3100.0));

    assert_eq!(live_run.trace(3), fixes);
    assert_eq!(live_run.run_laps().laps[&7], []);
}

#[test]
fn a_fix_with_its_clock_far_ahead_doesnt_hold_back_the_fixes_after_it() {
    let mut live_run = LiveRun::default();
    live_run.push(3, fix(0));
    live_run.push(3, fix_at(fix(0).point, 3_600_000.0));
    push_seconds(&mut live_run, 3, &[2, 4]);

    assert_eq!(live_run.trace(3), [fix(0), fix(4)]);
}

#[test]
fn a_fix_off_the_globe_or_at_0_0_is_dropped() {
    let mut live_run = LiveRun::default();
    live_run.push(3, fix(0));
    live_run.push(
        3,
        fix_at(
            GeoPoint {
                lat: f64::NAN,
                lon: LINE_LON,
            },
            1000.0,
        ),
    );
    live_run.push(3, fix_at(GeoPoint { lat: 0.0, lon: 0.0 }, 1500.0));
    push_seconds(&mut live_run, 3, &[2]);

    assert_eq!(live_run.trace(3), [fix(0), fix(2)]);
}

#[test]
fn the_trace_is_the_live_runs_fixes_so_far() {
    let mut live_run = LiveRun::default();
    push_seconds(&mut live_run, 3, &[0, 2, 4]);

    assert_eq!(live_run.trace(3), [fix(0), fix(2), fix(4)]);
    assert_eq!(live_run.trace(2), []);
}

#[test]
fn a_long_runs_trace_keeps_every_nth_fix() {
    let mut live_run = LiveRun::default();
    push_seconds(&mut live_run, 3, &(0..20_001).collect::<Vec<_>>());

    let trace = live_run.trace(3);

    assert_eq!(trace.len(), 6_667);
    assert_eq!(trace[..2], [fix(0), fix(3)]);
}

/// The live run's trace once the track handler has read one GPS fix behind a burst of other data, as busy as the car,
/// with `argos_pool` for its tracks
async fn trace_after_one_fix(argos_pool: ArgosPoolHandle) -> Vec<GpsFix> {
    let (data_send, data_recv) = broadcast::channel(10_000);
    let (_, io) = SocketIo::new_layer();
    // as main.rs does; the handler's sends go to the default namespace
    io.ns("/", async |_: SocketRef| {});
    let live_run = LiveRunHandle::default();
    let handler = tokio::spawn(track_handler(
        CancellationToken::new(),
        data_recv,
        argos_pool,
        TracksChanged::default(),
        live_run.clone(),
        io,
    ));
    // the handler loads the tracks as it starts, so this data arrives while that load is under way
    tokio::time::sleep(Duration::from_millis(100)).await;
    let other_data = std::iter::repeat_n(("BMS/Pack/Voltage", vec![400.0]), 5_000);
    for (name, values) in other_data.chain([(GPS_LOCATION_TOPIC, vec![42.5, -71.25])]) {
        data_send
            .send(ClientData {
                run_id: 3,
                name: name.to_owned(),
                unit: String::new(),
                values,
                timestamp: chrono::DateTime::from_timestamp_millis(1_000).unwrap(),
            })
            .unwrap();
    }

    // the handler stops once it has read every message on the closed channel
    drop(data_send);
    handler.await.unwrap();
    live_run.0.lock().await.trace(3)
}

#[tokio::test]
async fn the_track_handler_keeps_the_live_runs_gps_fixes() {
    assert_eq!(
        trace_after_one_fix(ArgosPoolHandle::default()).await,
        [GpsFix::new(42.5, -71.25, 1_000_000)]
    );
}

#[tokio::test]
async fn the_track_handler_keeps_taking_gps_fixes_while_the_tracks_database_hangs() {
    // accepts connections and never answers, like a database that has stopped responding
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!(
        "postgres://postgres@{}/argos",
        listener.local_addr().unwrap()
    );
    let hung = PoolHandle::builder().build_unchecked(AsyncDieselConnectionManager::new(url));

    let trace = tokio::time::timeout(
        Duration::from_secs(5),
        trace_after_one_fix(ArgosPoolHandle(Arc::new(hung.into()))),
    )
    .await;

    assert_eq!(
        trace.expect("GPS intake stalled behind the tracks load"),
        [GpsFix::new(42.5, -71.25, 1_000_000)]
    );
}
