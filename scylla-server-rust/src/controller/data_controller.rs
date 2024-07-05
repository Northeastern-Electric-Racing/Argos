use axum::{extract::Path, http::StatusCode, Json};
use serde::Serialize;

use crate::{services::data_service, Database};

#[derive(Serialize)]
pub struct DataSend {
    values: Vec<String>,
    time: i64,
}

pub async fn get_data(
    db: Database,
    Path((data_type_name, run_id)): Path<(String, String)>,
) -> Result<Json<Vec<DataSend>>, StatusCode> {
    let data = data_service::get_data(db, data_type_name, run_id.parse::<i32>().unwrap()).await;
    let transformed_data: Vec<DataSend> = data
        .iter()
        .map(|x| DataSend {
            values: x.values.iter().map(|f| f.to_string()).collect(),
            time: x.time.timestamp_millis(),
        })
        .collect();
    Ok(Json::from(transformed_data))
}
