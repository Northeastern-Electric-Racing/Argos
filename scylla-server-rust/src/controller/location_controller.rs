use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::location_service, Database};

use super::run_controller::{self, RunSend};

#[derive(Serialize, Debug, PartialEq)]
pub struct LocationSend {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub radius: f64,
    pub runs: Vec<run_controller::RunSend>,
}

impl From<&prisma::location::Data> for LocationSend {
    fn from(value: &prisma::location::Data) -> Self {
        LocationSend {
            name: value.name.clone(),
            latitude: value.latitude,
            longitude: value.longitude,
            radius: value.radius,
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

pub async fn get_all_locations(
    State(db): State<Database>,
) -> Result<Json<Vec<LocationSend>>, ScyllaError> {
    let data = location_service::get_all_locations(&db).await?;

    let transformed_data: Vec<LocationSend> = data.iter().map(LocationSend::from).collect();

    Ok(Json::from(transformed_data))
}
