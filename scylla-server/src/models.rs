use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;

use crate::lap_timing::{GeoPoint, TimingLine};

/// Use this struct when querying data
#[derive(Debug, Identifiable, Insertable, Selectable, Serialize, AsChangeset, Queryable)]
#[diesel(table_name = crate::schema::data)]
#[diesel(belongs_to(DataType, foreign_key = dataTypeName))]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[diesel(primary_key(dataTypeName, time))]
pub struct Data {
    pub values: Vec<Option<f32>>,
    pub time: i64,
    pub dataTypeName: String,
    pub runId: i32,
}

/// Use this struct when inserting data.
///
/// This struct is required because Diesel must infer Arrays as Array<Nullable<T>>,
/// and to query such types our signature for values must be Vec<Option<f32>>,
/// but the overhead of mapping Vec<f32> to Vec<Option<f32>> is non-negligible.
#[derive(Insertable)]
#[diesel(table_name = crate::schema::data)]
#[diesel(belongs_to(DataType, foreign_key = dataTypeName))]
#[diesel(check_for_backend(diesel::pg::Pg))]
#[diesel(primary_key(dataTypeName, time))]
pub struct DataInsert {
    pub values: Vec<f32>,
    pub dataTypeName: String,
    pub time: i64,
    pub runId: i32,
}

#[derive(Queryable, Debug, Identifiable, Insertable, Selectable, Serialize, AsChangeset)]
#[diesel(table_name = crate::schema::data_type)]
#[diesel(primary_key(name))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DataType {
    pub name: String,
    pub unit: String,
}

#[derive(Queryable, Debug, Identifiable, Insertable, Selectable, Serialize, AsChangeset)]
#[diesel(table_name = crate::schema::run)]
#[diesel(primary_key(runId))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Run {
    pub runId: i32,
    pub driverName: String,
    pub locationName: String,
    pub notes: String,
    pub time: DateTime<Utc>,
}

#[derive(Queryable, Debug, Identifiable, Selectable, PartialEq)]
#[diesel(table_name = crate::schema::track)]
#[diesel(primary_key(id))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Track {
    pub id: i32,
    pub name: String,
    pub startALat: Option<f64>,
    pub startALon: Option<f64>,
    pub startBLat: Option<f64>,
    pub startBLon: Option<f64>,
    pub finishALat: Option<f64>,
    pub finishALon: Option<f64>,
    pub finishBLat: Option<f64>,
    pub finishBLon: Option<f64>,
}

type LineColumns = (Option<f64>, Option<f64>, Option<f64>, Option<f64>);

/// A line's `(a_lat, a_lon, b_lat, b_lon)` columns; any NULL column means no line
fn line_from_columns(columns: LineColumns) -> Option<TimingLine> {
    let (Some(a_lat), Some(a_lon), Some(b_lat), Some(b_lon)) = columns else {
        return None;
    };
    Some(TimingLine {
        a: GeoPoint {
            lat: a_lat,
            lon: a_lon,
        },
        b: GeoPoint {
            lat: b_lat,
            lon: b_lon,
        },
    })
}

/// The inverse of `line_from_columns`: no line means all four columns NULL
fn columns_from_line(line: Option<TimingLine>) -> LineColumns {
    (
        line.map(|line| line.a.lat),
        line.map(|line| line.a.lon),
        line.map(|line| line.b.lat),
        line.map(|line| line.b.lon),
    )
}

impl Track {
    #[must_use]
    pub fn lines(&self) -> (Option<TimingLine>, Option<TimingLine>) {
        (
            line_from_columns((
                self.startALat,
                self.startALon,
                self.startBLat,
                self.startBLon,
            )),
            line_from_columns((
                self.finishALat,
                self.finishALon,
                self.finishBLat,
                self.finishBLon,
            )),
        )
    }
}

/// Use this struct when editing a track's lines.
///
/// None columns are written as NULL so an edit can clear a line.
#[derive(AsChangeset)]
#[diesel(table_name = crate::schema::track)]
#[diesel(treat_none_as_null = true)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct TrackLines {
    pub startALat: Option<f64>,
    pub startALon: Option<f64>,
    pub startBLat: Option<f64>,
    pub startBLon: Option<f64>,
    pub finishALat: Option<f64>,
    pub finishALon: Option<f64>,
    pub finishBLat: Option<f64>,
    pub finishBLon: Option<f64>,
}

impl TrackLines {
    #[must_use]
    pub fn new(start_line: Option<TimingLine>, finish_line: Option<TimingLine>) -> Self {
        let start = columns_from_line(start_line);
        let finish = columns_from_line(finish_line);
        TrackLines {
            startALat: start.0,
            startALon: start.1,
            startBLat: start.2,
            startBLon: start.3,
            finishALat: finish.0,
            finishALon: finish.1,
            finishBLat: finish.2,
            finishBLon: finish.3,
        }
    }
}
