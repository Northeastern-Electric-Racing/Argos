use serde::{Deserialize, Serialize};

/// The MQTT topic GPS fixes are published and stored on, as `[lat, lon, ..]` in degrees
pub const GPS_LOCATION_TOPIC: &str = "TPU/GPS/Location";

/// Metres along a meridian per degree of latitude, on a spherical Earth of radius 6371 km
pub const METRES_PER_DEGREE: f64 = 6_371_000.0 * std::f64::consts::PI / 180.0;

/// Shorter laps are dropped, as GPS noise while the car sits on a start line crosses it repeatedly
const MIN_LAP_MS: f64 = 2_000.0;
/// Longer laps are dropped, as they span a stop, such as a break, rather than a lap
const MAX_LAP_MS: f64 = 5.0 * 60_000.0;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
pub struct GeoPoint {
    pub lat: f64,
    pub lon: f64,
}

impl GeoPoint {
    #[must_use]
    pub fn is_in_range(&self) -> bool {
        self.lat.abs() <= 90.0 && self.lon.abs() <= 180.0
    }
}

/// A timing line from A to B, crossed in either direction
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
pub struct TimingLine {
    pub a: GeoPoint,
    pub b: GeoPoint,
}

#[derive(Debug, Clone, Copy)]
pub struct GpsFix {
    pub point: GeoPoint,
    pub time_ms: f64,
}

impl GpsFix {
    /// A fix as scylla receives and stores it: degrees as f32, and microseconds since epoch
    #[must_use]
    pub fn new(lat: f32, lon: f32, time_us: i64) -> Self {
        GpsFix {
            point: GeoPoint {
                lat: f64::from(lat),
                lon: f64::from(lon),
            },
            time_ms: time_us as f64 / 1000.0,
        }
    }
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Lap {
    #[serde(rename = "startMs")]
    pub start_ms: f64,
    #[serde(rename = "endMs")]
    pub end_ms: f64,
    #[serde(rename = "durationMs")]
    pub duration_ms: f64,
}

#[derive(Debug, Clone, Copy)]
struct Metres {
    x: f64,
    y: f64,
}

impl Metres {
    fn minus(self, other: Metres) -> Metres {
        Metres {
            x: self.x - other.x,
            y: self.y - other.y,
        }
    }

    fn cross(self, other: Metres) -> f64 {
        self.x * other.y - self.y * other.x
    }
}

/// Equirectangular projection to metres around a reference point
struct LocalProjection {
    reference: GeoPoint,
    cos_reference_lat: f64,
}

impl LocalProjection {
    fn around(reference: GeoPoint) -> Self {
        LocalProjection {
            reference,
            cos_reference_lat: reference.lat.to_radians().cos(),
        }
    }

    fn project(&self, point: GeoPoint) -> Metres {
        Metres {
            x: (point.lon - self.reference.lon) * self.cos_reference_lat * METRES_PER_DEGREE,
            y: (point.lat - self.reference.lat) * METRES_PER_DEGREE,
        }
    }
}

pub struct ProjectedLine {
    projection: LocalProjection,
    a: Metres,
    b: Metres,
}

impl ProjectedLine {
    #[must_use]
    pub fn new(line: TimingLine) -> Self {
        let projection = LocalProjection::around(GeoPoint {
            lat: f64::midpoint(line.a.lat, line.b.lat),
            lon: f64::midpoint(line.a.lon, line.b.lon),
        });
        ProjectedLine {
            a: projection.project(line.a),
            b: projection.project(line.b),
            projection,
        }
    }

    /// The interpolated time the car crossed the line going from `from` to `to`, if it did
    #[must_use]
    pub fn crossing_time_ms(&self, from: GpsFix, to: GpsFix) -> Option<f64> {
        let from_point = self.projection.project(from.point);
        let to_point = self.projection.project(to.point);
        let line_direction = self.b.minus(self.a);
        let side_from = line_direction.cross(from_point.minus(self.a));
        let side_to = line_direction.cross(to_point.minus(self.a));
        // a fix on the line ends one crossing and must not start another
        if side_from == 0.0 || side_from * side_to > 0.0 {
            return None;
        }

        let travel = to_point.minus(from_point);
        let denominator = travel.cross(line_direction);
        let fraction_along_travel = self.a.minus(from_point).cross(line_direction) / denominator;
        let fraction_along_line = self.a.minus(from_point).cross(travel) / denominator;
        if !(0.0..=1.0).contains(&fraction_along_line) {
            return None;
        }

        Some(from.time_ms + fraction_along_travel * (to.time_ms - from.time_ms))
    }
}

/// Which of a track's lines, as the client names it
#[derive(Deserialize, Debug, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LineKind {
    Finish,
    Start,
}

/// Times laps from GPS fixes as they arrive, oldest first.
///
/// A start crossing opens a lap (restarting any open one) and the next finish crossing closes it.
/// Without a finish line the start line is also the finish, so consecutive start crossings bound each lap.
pub struct LapTimer {
    start: ProjectedLine,
    finish: ProjectedLine,
    last_fix: Option<GpsFix>,
    open_lap_start_ms: Option<f64>,
    laps: Vec<Lap>,
}

impl LapTimer {
    #[must_use]
    pub fn new(start: TimingLine, finish: Option<TimingLine>) -> Self {
        LapTimer {
            start: ProjectedLine::new(start),
            finish: ProjectedLine::new(finish.unwrap_or(start)),
            last_fix: None,
            open_lap_start_ms: None,
            laps: Vec::new(),
        }
    }

    /// A timer that has timed the time-sorted `fixes`
    #[must_use]
    pub fn from_fixes(fixes: &[GpsFix], start: TimingLine, finish: Option<TimingLine>) -> Self {
        let mut timer = LapTimer::new(start, finish);
        for &fix in fixes {
            timer.push(fix);
        }
        timer
    }

    /// Times the crossings since the previous fix
    pub fn push(&mut self, fix: GpsFix) {
        let Some(last_fix) = self.last_fix.replace(fix) else {
            return;
        };
        let mut crossings: Vec<(f64, LineKind)> = [
            (&self.finish, LineKind::Finish),
            (&self.start, LineKind::Start),
        ]
        .into_iter()
        .filter_map(|(line, kind)| Some((line.crossing_time_ms(last_fix, fix)?, kind)))
        .collect();
        // stable, so at equal times the finish stays first and a shared line closes one lap before opening the next
        crossings.sort_by(|(left_ms, _), (right_ms, _)| left_ms.total_cmp(right_ms));
        for (time_ms, kind) in crossings {
            match kind {
                LineKind::Start => self.open_lap_start_ms = Some(time_ms),
                LineKind::Finish => {
                    if let Some(start_ms) = self.open_lap_start_ms.take() {
                        self.laps.extend(lap(start_ms, time_ms));
                    }
                }
            }
        }
    }

    #[must_use]
    pub fn laps(&self) -> &[Lap] {
        &self.laps
    }
}

/// The laps timed by the time-sorted `fixes`
#[must_use]
pub fn laps(fixes: &[GpsFix], start: TimingLine, finish: Option<TimingLine>) -> Vec<Lap> {
    LapTimer::from_fixes(fixes, start, finish).laps
}

fn lap(start_ms: f64, end_ms: f64) -> Option<Lap> {
    let duration_ms = end_ms - start_ms;
    (MIN_LAP_MS..=MAX_LAP_MS)
        .contains(&duration_ms)
        .then_some(Lap {
            start_ms,
            end_ms,
            duration_ms,
        })
}
