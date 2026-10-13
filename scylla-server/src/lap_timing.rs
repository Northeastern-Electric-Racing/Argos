use serde::{Deserialize, Serialize};

/// The MQTT topic GPS fixes are published and stored on, as `[lat, lon, ..]` in degrees
pub const GPS_LOCATION_TOPIC: &str = "TPU/GPS/Location";

/// Metres along a meridian per degree of latitude, on a spherical Earth of radius 6371 km
pub const METRES_PER_DEGREE: f64 = 6_371_000.0 * std::f64::consts::PI / 180.0;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
pub struct GeoPoint {
    pub lat: f64,
    pub lon: f64,
}

/// A timing line from A to B, crossed in either direction
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
pub struct TimingLine {
    pub a: GeoPoint,
    pub b: GeoPoint,
}

impl GeoPoint {
    #[must_use]
    pub fn is_in_range(&self) -> bool {
        self.lat.abs() <= 90.0 && self.lon.abs() <= 180.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GpsFix {
    pub point: GeoPoint,
    pub time_ms: f64,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Lap {
    pub number: u32,
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

struct ProjectedLine {
    projection: LocalProjection,
    a: Metres,
    b: Metres,
}

impl ProjectedLine {
    fn new(line: TimingLine) -> Self {
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

    /// The interpolated time the car crossed the line going from P0 to P1, if it did
    fn crossing_time_ms(&self, from: GpsFix, to: GpsFix) -> Option<f64> {
        let p0 = self.projection.project(from.point);
        let p1 = self.projection.project(to.point);
        let line_direction = self.b.minus(self.a);
        let side_from = line_direction.cross(p0.minus(self.a));
        let side_to = line_direction.cross(p1.minus(self.a));
        // a fix on the line ends one crossing and must not start another
        if side_from == 0.0 || side_from * side_to > 0.0 {
            return None;
        }

        let travel = p1.minus(p0);
        let denominator = travel.cross(line_direction);
        let fraction_along_travel = self.a.minus(p0).cross(line_direction) / denominator;
        let fraction_along_line = self.a.minus(p0).cross(travel) / denominator;
        if !(0.0..=1.0).contains(&fraction_along_travel)
            || !(0.0..=1.0).contains(&fraction_along_line)
        {
            return None;
        }

        Some(from.time_ms + fraction_along_travel * (to.time_ms - from.time_ms))
    }
}

/// Every crossing time of `line` by the time-sorted `fixes`
#[must_use]
pub fn crossing_times_ms(fixes: &[GpsFix], line: TimingLine) -> Vec<f64> {
    let projected = ProjectedLine::new(line);
    fixes
        .windows(2)
        .filter_map(|pair| projected.crossing_time_ms(pair[0], pair[1]))
        .collect()
}

enum LineKind {
    Finish,
    Start,
}

impl LineKind {
    /// Finish before start at equal times so a shared line closes one lap and opens the next
    fn rank_at_equal_times(&self) -> u8 {
        match self {
            LineKind::Finish => 0,
            LineKind::Start => 1,
        }
    }
}

/// The laps timed by the time-sorted `fixes`.
///
/// Without a finish line, consecutive start crossings bound each lap.
/// With one, a start crossing opens a lap (restarting any open one) and the next finish crossing closes it.
#[must_use]
pub fn laps(fixes: &[GpsFix], start: TimingLine, finish: Option<TimingLine>) -> Vec<Lap> {
    let start_crossings = crossing_times_ms(fixes, start);
    let Some(finish) = finish else {
        return start_crossings
            .windows(2)
            .zip(1..)
            .map(|(pair, number)| lap(number, pair[0], pair[1]))
            .collect();
    };

    let mut crossings: Vec<(f64, LineKind)> = start_crossings
        .into_iter()
        .map(|time| (time, LineKind::Start))
        .chain(
            crossing_times_ms(fixes, finish)
                .into_iter()
                .map(|time| (time, LineKind::Finish)),
        )
        .collect();
    crossings.sort_by(|(left_time, left_kind), (right_time, right_kind)| {
        left_time.total_cmp(right_time).then(
            left_kind
                .rank_at_equal_times()
                .cmp(&right_kind.rank_at_equal_times()),
        )
    });

    let mut timed = Vec::new();
    let mut open_start = None;
    for (time, kind) in crossings {
        match kind {
            LineKind::Start => open_start = Some(time),
            LineKind::Finish => {
                if let Some(start_ms) = open_start.take() {
                    timed.push(lap(timed.len() as u32 + 1, start_ms, time));
                }
            }
        }
    }
    timed
}

fn lap(number: u32, start_ms: f64, end_ms: f64) -> Lap {
    Lap {
        number,
        start_ms,
        end_ms,
        duration_ms: end_ms - start_ms,
    }
}
