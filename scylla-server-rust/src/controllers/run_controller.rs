use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::run_service, Database};

/// The struct defining the run format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicRun {
    pub id: i32,
    #[serde(rename = "locationName")]
    pub location_name: String,
    #[serde(rename = "driverName")]
    pub driver_name: String,
    #[serde(rename = "systemName")]
    pub system_name: String,
    pub time: i64,
}

impl From<&prisma::run::Data> for PublicRun {
    fn from(value: &prisma::run::Data) -> Self {
        PublicRun {
            id: value.id,
            location_name: value.location_name.clone().unwrap_or_default(),
            driver_name: value.driver_name.clone().unwrap_or_default(),
            system_name: value.system_name.clone().unwrap_or_default(),
            time: value.time.timestamp_millis(),
        }
    }
}

pub async fn get_all_runs(State(db): State<Database>) -> Result<Json<Vec<PublicRun>>, ScyllaError> {
    let run_data = run_service::get_all_runs(&db).await?;

    let transformed_run_data: Vec<PublicRun> = run_data.iter().map(PublicRun::from).collect();

    Ok(Json::from(transformed_run_data))
}

pub async fn get_run_by_id(
    State(db): State<Database>,
    Path(run_id): Path<i32>,
) -> Result<Json<PublicRun>, ScyllaError> {
    let run_data = run_service::get_run_by_id(&db, run_id).await?;

    if run_data.is_none() {
        return Err(ScyllaError::NotFound);
    }

    let run_data_safe = run_data.unwrap();

    let transformed_run_data = PublicRun::from(&run_data_safe);

    Ok(Json::from(transformed_run_data))
}
