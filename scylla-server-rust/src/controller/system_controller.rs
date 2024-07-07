use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::system_service, Database};

use super::run_controller::{self, RunSend};

#[derive(Serialize, Debug, PartialEq)]
pub struct SystemSend {
    pub name: String,
    pub runs: Vec<run_controller::RunSend>,
}

impl From<&prisma::system::Data> for SystemSend {
    fn from(value: &prisma::system::Data) -> Self {
        SystemSend {
            name: value.name.clone(),
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

pub async fn get_all_systems(
    State(db): State<Database>,
) -> Result<Json<Vec<SystemSend>>, ScyllaError> {
    let data = system_service::get_all_systems(&db).await?;

    let transformed_data: Vec<SystemSend> = data.iter().map(SystemSend::from).collect();

    Ok(Json::from(transformed_data))
}
