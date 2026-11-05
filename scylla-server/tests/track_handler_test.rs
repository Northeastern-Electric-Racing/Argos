use std::collections::BTreeMap;

use scylla_server::{
    lap_timing::{GeoPoint, GpsFix, Lap, TimingLine},
    track_handler::{LiveLaps, RunLaps},
    transformers::track_transformer::PublicTrack,
};

const LINE_LON: f64 = -71.0;
/// A power of two, so a fix either side of the line crosses it exactly halfway in time
const STEP: f64 = 1.0 / 1024.0;

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

/// A fix west of the line on even seconds and east of it on odd ones, so consecutive fixes cross it halfway between
fn fix(second: i64) -> GpsFix {
    let side = if second % 2 == 0 { -STEP } else { STEP };
    GpsFix {
        point: GeoPoint {
            lat: 42.0,
            lon: LINE_LON + side,
        },
        time_ms: second as f64 * 1000.0,
    }
}

fn push_seconds(live_laps: &mut LiveLaps, run_id: i32, seconds: &[i64]) {
    for &second in seconds {
        live_laps.push(run_id, fix(second));
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
    let mut live_laps = LiveLaps::default();
    live_laps.set_tracks(&[
        track(7, Some(start_line(LINE_LON))),
        track(8, Some(start_line(LINE_LON + 1.0))),
        track(9, None),
    ]);

    push_seconds(&mut live_laps, 3, &[0, 3, 8, 13]);

    assert_eq!(
        live_laps.run_laps(),
        RunLaps {
            run_id: 3,
            laps: BTreeMap::from([
                (7, &[lap(1500.0, 5500.0), lap(5500.0, 10_500.0)][..]),
                (8, &[][..]),
            ]),
        }
    );
}

#[test]
fn a_new_run_starts_timing_over() {
    let mut live_laps = LiveLaps::default();
    live_laps.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);
    push_seconds(&mut live_laps, 3, &[0, 3, 8]);

    push_seconds(&mut live_laps, 4, &[13, 18, 23]);

    assert_eq!(
        live_laps.run_laps(),
        RunLaps {
            run_id: 4,
            laps: BTreeMap::from([(7, &[lap(15_500.0, 20_500.0)][..])]),
        }
    );
}

#[test]
fn a_fix_no_newer_than_the_last_is_dropped() {
    let mut live_laps = LiveLaps::default();
    live_laps.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);

    push_seconds(&mut live_laps, 3, &[0, 3, 8, 5, 13]);

    assert_eq!(
        live_laps.run_laps().laps[&7],
        [lap(1500.0, 5500.0), lap(5500.0, 10_500.0)]
    );
}

#[test]
fn setting_the_tracks_times_the_run_so_far() {
    let mut live_laps = LiveLaps::default();
    push_seconds(&mut live_laps, 3, &[0, 3, 8]);
    assert_eq!(live_laps.run_laps().laps, BTreeMap::new());

    live_laps.set_tracks(&[track(7, Some(start_line(LINE_LON)))]);

    assert_eq!(live_laps.run_laps().laps[&7], [lap(1500.0, 5500.0)]);
}
