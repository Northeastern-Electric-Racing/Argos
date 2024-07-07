use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::data_type_service, Database};

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

pub async fn get_all_data_types(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicDataType>>, ScyllaError> {
    let data_types = data_type_service::get_all_data_types(&db).await?;

    let transformed_data_types: Vec<PublicDataType> =
        data_types.iter().map(PublicDataType::from).collect();

    Ok(Json::from(transformed_data_types))
}
