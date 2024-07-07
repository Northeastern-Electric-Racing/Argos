use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::driver_service, Database};

use super::run_controller::{self, PublicRun};

/// The struct defining the driver format sent to the client
#[derive(Serialize, PartialEq)]
pub struct PublicDriver {
    username: String,
    runs: Vec<run_controller::PublicRun>,
}

impl From<&prisma::driver::Data> for PublicDriver {
    fn from(value: &prisma::driver::Data) -> Self {
        PublicDriver {
            username: value.username.clone(),
            runs: value
                .runs
                .clone()
                .unwrap_or_default()
                .iter()
                .map(PublicRun::from)
                .collect(),
        }
    }
}

pub async fn get_all_drivers(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicDriver>>, ScyllaError> {
    let driver_data = driver_service::get_all_drivers(&db).await?;

    let transformed_driver_data: Vec<PublicDriver> =
        driver_data.iter().map(PublicDriver::from).collect();

    Ok(Json::from(transformed_driver_data))
}
