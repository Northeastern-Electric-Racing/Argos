use serde::Serialize;

use crate::prisma;

use super::run_transformer::PublicRun;

/// The struct defining the driver format sent to the client
#[derive(Serialize, PartialEq)]
pub struct PublicDriver {
    username: String,
    runs: Vec<PublicRun>,
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
