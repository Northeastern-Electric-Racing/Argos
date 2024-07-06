use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::run_service, Database};

#[derive(Serialize)]
pub struct RunSend {
    pub id: i32,
    #[serde(rename = "locationName")]
    pub location_name: String,
    #[serde(rename = "driverName")]
    pub driver_name: String,
    #[serde(rename = "systemName")]
    pub system_name: String,
    pub time: i64,
}

impl From<&prisma::run::Data> for RunSend {
    fn from(value: &prisma::run::Data) -> Self {
        RunSend {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}

pub async fn get_all_runs(State(db): State<Database>) -> Result<Json<Vec<RunSend>>, ScyllaError> {
    let data = run_service::get_all_runs(db).await?;

    let transformed_data: Vec<RunSend> = data.iter().map(RunSend::from).collect();

    Ok(Json::from(transformed_data))
}

pub async fn get_run_by_id(
    State(db): State<Database>,
    Path(run_id): Path<i32>,
) -> Result<Json<RunSend>, ScyllaError> {
    let data = run_service::get_run_by_id(db, run_id).await?;

    if data.is_none() {
        return Err(ScyllaError::NotFound);
    }

    let data_new = data.unwrap();

    let transformed_data = RunSend {
        id: data_new.id,
        location_name: data_new.location_name.unwrap_or_default(),
        driver_name: data_new.driver_name.unwrap_or_default(),
        system_name: data_new.system_name.unwrap_or_default(),
        time: data_new.time.timestamp_millis(),
    };

    Ok(Json::from(transformed_data))
}
