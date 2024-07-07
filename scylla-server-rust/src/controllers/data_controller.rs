use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;

use crate::{
    error::ScyllaError,
    prisma::{self},
    services::data_service,
    Database,
};

/// The struct defining the data format sent to the client
#[derive(Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct PublicData {
    pub time: i64,
    pub values: Vec<String>,
}

/// convert the prisma type to the client type for JSON encoding
impl From<&prisma::data::Data> for PublicData {
    fn from(value: &prisma::data::Data) -> Self {
        PublicData {
            values: value.values.iter().map(|f| f.to_string()).collect(),
            time: value.time.timestamp_millis(),
        }
    }
}

pub async fn get_data(
    State(db): State<Database>,
    Path((data_type_name, run_id)): Path<(String, i32)>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let data = data_service::get_data(&db, data_type_name, run_id).await?;

    // map data to frontend data types according to the From func of the client struct
    let mut transformed_data: Vec<PublicData> = data.iter().map(PublicData::from).collect();
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}
