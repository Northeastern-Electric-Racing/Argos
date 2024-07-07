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

#[derive(Serialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct DataSend {
    pub time: i64,
    pub values: Vec<String>,
}

// convert the prisma type to the client type for JSON encoding
impl From<&prisma::data::Data> for DataSend {
    fn from(value: &prisma::data::Data) -> Self {
        DataSend {
            values: value.values.iter().map(|f| f.to_string()).collect(),
            time: value.time.timestamp_millis(),
        }
    }
}

pub async fn get_data(
    State(db): State<Database>,
    Path((data_type_name, run_id)): Path<(String, i32)>,
) -> Result<Json<Vec<DataSend>>, ScyllaError> {
    let data = data_service::get_data(&db, data_type_name, run_id).await?;

    // map data to correct types
    let mut transformed_data: Vec<DataSend> = data.iter().map(DataSend::from).collect();
    // sort it by time for the client
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}
