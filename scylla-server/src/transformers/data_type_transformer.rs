use serde::Serialize;

/// The struct defining the data type format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicDataType {
    pub name: String,
    pub unit: String,
}

impl From<crate::models::DataType> for PublicDataType {
    fn from(value: crate::models::DataType) -> Self {
        PublicDataType {
            name: value.name,
            unit: value.unit,
        }
    }
}
