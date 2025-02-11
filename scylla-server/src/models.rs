use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;

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
