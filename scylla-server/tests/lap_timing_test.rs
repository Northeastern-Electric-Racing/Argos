use scylla_server::lap_timing::{
    GeoPoint, GpsFix, Lap, METRES_PER_DEGREE, TimingLine, crossing_times_ms, laps, laps_since,
};

const REFERENCE: GeoPoint = GeoPoint {
    lat: 42.0,
    lon: -84.0,
};

fn offset(east_m: f64, north_m: f64) -> GeoPoint {
    GeoPoint {
        lat: REFERENCE.lat + north_m / METRES_PER_DEGREE,
        lon: REFERENCE.lon + east_m / (METRES_PER_DEGREE * REFERENCE.lat.to_radians().cos()),
    }
}

fn fix(east_m: f64, north_m: f64, time_ms: f64) -> GpsFix {
    GpsFix {
        point: offset(east_m, north_m),
        time_ms,
    }
}

/// A north-to-south line through the reference
fn start_line() -> TimingLine {
    TimingLine {
        a: offset(0.0, 6.0),
        b: offset(0.0, -6.0),
    }
}

/// A west-to-east line through the reference
fn finish_line() -> TimingLine {
    TimingLine {
        a: offset(-6.0, 0.0),
        b: offset(6.0, 0.0),
    }
}

fn lap(number: u32, start_ms: f64, end_ms: f64) -> Lap {
    Lap {
        number,
        start_ms,
        end_ms,
        duration_ms: end_ms - start_ms,
    }
}

/// Fixes along `route` of (east m, north m, ms after `time_ms`); each route below starts and ends
/// at the same point and passes the other legs beyond the lines' ends, so it crosses once at `time_ms`
fn drive(time_ms: f64, route: &[(f64, f64, f64)]) -> Vec<GpsFix> {
    route
        .iter()
        .map(|&(east_m, north_m, offset_ms)| fix(east_m, north_m, time_ms + offset_ms))
        .collect()
}

fn cross_start(time_ms: f64) -> Vec<GpsFix> {
    drive(
        time_ms,
        &[
            (-10.0, -10.0, -200.0),
            (-1.0, -3.0, -50.0),
            (1.0, -3.0, 50.0),
            (1.0, -10.0, 100.0),
            (-10.0, -10.0, 200.0),
        ],
    )
}

fn cross_start_backwards(time_ms: f64) -> Vec<GpsFix> {
    drive(
        time_ms,
        &[
            (-10.0, -10.0, -200.0),
            (1.0, -10.0, -100.0),
            (1.0, -3.0, -50.0),
            (-1.0, -3.0, 50.0),
            (-10.0, -10.0, 200.0),
        ],
    )
}

fn cross_finish(time_ms: f64) -> Vec<GpsFix> {
    drive(
        time_ms,
        &[
            (-10.0, -10.0, -200.0),
            (3.0, -10.0, -100.0),
            (3.0, -1.0, -50.0),
            (3.0, 1.0, 50.0),
            (10.0, 1.0, 100.0),
            (10.0, -10.0, 150.0),
            (-10.0, -10.0, 200.0),
        ],
    )
}

fn cross_finish_backwards(time_ms: f64) -> Vec<GpsFix> {
    drive(
        time_ms,
        &[
            (-10.0, -10.0, -200.0),
            (10.0, -10.0, -150.0),
            (10.0, 1.0, -100.0),
            (3.0, 1.0, -50.0),
            (3.0, -1.0, 50.0),
            (3.0, -10.0, 100.0),
            (-10.0, -10.0, 200.0),
        ],
    )
}

#[test]
fn crossing_halfway_between_fixes_interpolates_to_the_midpoint_time() {
    let fixes = [fix(-1.0, 0.0, 1000.0), fix(1.0, 0.0, 1100.0)];

    assert_eq!(crossing_times_ms(&fixes, start_line()), vec![1050.0]);
}

#[test]
fn crossing_a_quarter_of_the_way_interpolates_a_quarter_of_the_time() {
    let fixes = [fix(-1.0, 0.0, 1000.0), fix(3.0, 0.0, 1100.0)];

    let crossings = crossing_times_ms(&fixes, start_line());

    assert_eq!(crossings.len(), 1);
    assert!((crossings[0] - 1025.0).abs() < 1e-6, "got {}", crossings[0]);
}

#[test]
fn crossing_in_the_reverse_direction_interpolates_to_the_midpoint_time() {
    let fixes = [fix(1.0, 0.0, 1000.0), fix(-1.0, 0.0, 1100.0)];

    assert_eq!(crossing_times_ms(&fixes, start_line()), vec![1050.0]);
}

#[test]
fn a_fix_exactly_on_the_line_counts_once() {
    let fixes = [
        fix(-1.0, 0.0, 1000.0),
        fix(0.0, 0.0, 1100.0),
        fix(1.0, 0.0, 1200.0),
    ];

    assert_eq!(crossing_times_ms(&fixes, start_line()), vec![1100.0]);
}

#[test]
fn touching_the_line_and_turning_back_counts_once() {
    let fixes = [
        fix(-1.0, 0.0, 1000.0),
        fix(0.0, 0.0, 1100.0),
        fix(-1.0, 0.0, 1200.0),
    ];

    assert_eq!(crossing_times_ms(&fixes, start_line()), vec![1100.0]);
}

#[test]
fn passing_beyond_the_line_end_is_a_near_miss() {
    let fixes = [fix(-1.0, 7.0, 1000.0), fix(1.0, 7.0, 1100.0)];

    assert_eq!(crossing_times_ms(&fixes, start_line()), Vec::<f64>::new());
}

#[test]
fn driving_alongside_without_reaching_the_line_is_no_crossing() {
    let fixes = [fix(-5.0, 0.0, 1000.0), fix(-2.0, 0.0, 1100.0)];

    assert_eq!(crossing_times_ms(&fixes, start_line()), Vec::<f64>::new());
}

#[test]
fn fewer_than_two_fixes_time_no_laps() {
    assert_eq!(laps(&[], start_line(), None), vec![]);
    assert_eq!(laps(&[fix(0.0, 0.0, 1000.0)], start_line(), None), vec![]);
}

#[test]
fn start_line_only_times_a_lap_between_each_pair_of_crossings() {
    let fixes: Vec<GpsFix> = [
        cross_start(1000.0),
        cross_start_backwards(5000.0),
        cross_start(9000.0),
        cross_start(20000.0),
    ]
    .concat();

    assert_eq!(
        laps(&fixes, start_line(), None),
        vec![
            lap(1, 1000.0, 5000.0),
            lap(2, 5000.0, 9000.0),
            lap(3, 9000.0, 20000.0)
        ]
    );
}

#[test]
fn a_single_start_crossing_times_no_laps() {
    assert_eq!(laps(&cross_start(1000.0), start_line(), None), vec![]);
}

#[test]
fn separate_finish_line_closes_the_run_opened_at_the_start_line() {
    let fixes: Vec<GpsFix> = [
        cross_finish(500.0),
        cross_start(1000.0),
        cross_finish(4000.0),
        cross_finish_backwards(5000.0),
        cross_finish(6000.0),
    ]
    .concat();

    assert_eq!(
        laps(&fixes, start_line(), Some(finish_line())),
        vec![lap(1, 1000.0, 4000.0)]
    );
}

#[test]
fn finish_crossing_without_an_open_run_is_ignored() {
    let fixes = cross_finish(4000.0);

    assert_eq!(laps(&fixes, start_line(), Some(finish_line())), vec![]);
}

#[test]
fn start_crossing_while_a_run_is_open_restarts_it() {
    let fixes: Vec<GpsFix> = [
        cross_start(1000.0),
        cross_start(3000.0),
        cross_finish(6000.0),
    ]
    .concat();

    assert_eq!(
        laps(&fixes, start_line(), Some(finish_line())),
        vec![lap(1, 3000.0, 6000.0)]
    );
}

#[test]
fn finish_line_equal_to_the_start_line_chains_laps() {
    let fixes: Vec<GpsFix> = [
        cross_start(1000.0),
        cross_start(9000.0),
        cross_start(20000.0),
    ]
    .concat();

    assert_eq!(
        laps(&fixes, start_line(), Some(start_line())),
        vec![lap(1, 1000.0, 9000.0), lap(2, 9000.0, 20000.0)]
    );
}

#[test]
fn finish_and_start_crossed_at_the_same_time_close_the_lap_before_opening_the_next() {
    let through_both_lines = drive(
        5000.0,
        &[
            (-10.0, -10.0, -200.0),
            (-1.0, -1.0, -50.0),
            (1.0, 1.0, 50.0),
            (10.0, 10.0, 100.0),
            (10.0, -10.0, 150.0),
            (-10.0, -10.0, 200.0),
        ],
    );
    let fixes: Vec<GpsFix> = [
        cross_start(1000.0),
        through_both_lines,
        cross_finish(9000.0),
    ]
    .concat();

    assert_eq!(
        laps(&fixes, start_line(), Some(finish_line())),
        vec![lap(1, 1000.0, 5000.0), lap(2, 5000.0, 9000.0)]
    );
}

#[test]
fn laps_since_keeps_laps_starting_at_or_after_it_numbered_from_one() {
    let timed = vec![
        lap(1, 1000.0, 9000.0),
        lap(2, 9000.0, 20000.0),
        lap(3, 20000.0, 31000.0),
    ];

    assert_eq!(
        laps_since(timed, 9000.0),
        vec![lap(1, 9000.0, 20000.0), lap(2, 20000.0, 31000.0)]
    );
}

#[test]
fn laps_since_after_the_last_start_is_empty() {
    let timed = vec![lap(1, 1000.0, 9000.0), lap(2, 9000.0, 20000.0)];

    assert_eq!(laps_since(timed, 9000.5), vec![]);
}
