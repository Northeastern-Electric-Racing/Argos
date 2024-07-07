use serde::Serialize;

use crate::prisma;

use super::run_transformer::PublicRun;

/// The struct defining the system format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicSystem {
    pub name: String,
    pub runs: Vec<PublicRun>,
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
