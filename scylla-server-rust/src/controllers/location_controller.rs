use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::location_service, Database};

use super::run_controller::{self, PublicRun};

/// The struct defining the location format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicLocation {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub radius: f64,
    pub runs: Vec<run_controller::PublicRun>,
}

impl From<&prisma::location::Data> for PublicLocation {
    fn from(value: &prisma::location::Data) -> Self {
        PublicLocation {
            name: value.name.clone(),
            latitude: value.latitude,
            longitude: value.longitude,
            radius: value.radius,
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

pub async fn get_all_locations(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicLocation>>, ScyllaError> {
    let loc_data = location_service::get_all_locations(&db).await?;

    let transformed_loc_data: Vec<PublicLocation> =
        loc_data.iter().map(PublicLocation::from).collect();

    Ok(Json::from(transformed_loc_data))
}
