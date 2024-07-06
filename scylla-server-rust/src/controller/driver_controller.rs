use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::driver_service, Database};

use super::run_controller::{self, RunSend};

#[derive(Serialize)]
pub struct DriverSend {
    username: String,
    runs: Vec<run_controller::RunSend>,
}

impl From<&prisma::driver::Data> for DriverSend {
    fn from(value: &prisma::driver::Data) -> Self {
        DriverSend {
            username: value.username.clone(),
            runs: value
                .runs
                .clone()
                .unwrap_or_default()
                .iter()
                .map(RunSend::from)
                .collect(),
        }
    }
}

pub async fn get_all_drivers(
    State(db): State<Database>,
) -> Result<Json<Vec<DriverSend>>, ScyllaError> {
    let data = driver_service::get_all_drivers(db).await?;

    let transformed_data: Vec<DriverSend> = data.iter().map(DriverSend::from).collect();

    Ok(Json::from(transformed_data))
}
