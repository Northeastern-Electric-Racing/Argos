use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::system_service, Database};

use super::run_controller::{self, PublicRun};

/// The struct defining the system format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicSystem {
    pub name: String,
    pub runs: Vec<run_controller::PublicRun>,
}

impl From<&prisma::system::Data> for PublicSystem {
    fn from(value: &prisma::system::Data) -> Self {
        PublicSystem {
            name: value.name.clone(),
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

pub async fn get_all_systems(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicSystem>>, ScyllaError> {
    let run_data = system_service::get_all_systems(&db).await?;

    let transformed_run_data: Vec<PublicSystem> = run_data.iter().map(PublicSystem::from).collect();

    Ok(Json::from(transformed_run_data))
}
