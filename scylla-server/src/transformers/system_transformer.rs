use serde::Serialize;

use crate::services::system_service;

use super::run_transformer::PublicRun;

/// The struct defining the system format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicSystem {
    pub name: String,
    pub runs: Vec<PublicRun>,
}

impl From<&system_service::public_system::Data> for PublicSystem {
    fn from(value: &system_service::public_system::Data) -> Self {
        PublicSystem {
            name: value.name.clone(),
            runs: value.runs.clone().iter().map(PublicRun::from).collect(),
        }
    }
}
