use serde::Serialize;

use crate::prisma;

/// The struct defining the data type format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicDataType {
    pub name: String,
    pub unit: String,
}

impl From<&prisma::data_type::Data> for PublicDataType {
    fn from(value: &prisma::data_type::Data) -> Self {
        PublicDataType {
            name: value.name.clone(),
            unit: value.unit.clone(),
        }
    }
}
