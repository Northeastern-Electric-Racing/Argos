use axum::{extract::State, Json};
use serde::Serialize;

use crate::{error::ScyllaError, prisma, services::data_type_service, Database};

#[derive(Serialize)]
pub struct DataTypeSend {
    pub name: String,
    pub unit: String,
}

impl From<&prisma::data_type::Data> for DataTypeSend {
    fn from(value: &prisma::data_type::Data) -> Self {
        DataTypeSend {
            name: value.name.clone(),
            unit: value.unit.clone(),
        }
    }
}

pub async fn get_all_data_types(
    State(db): State<Database>,
) -> Result<Json<Vec<DataTypeSend>>, ScyllaError> {
    let data = data_type_service::get_all_data_types(db).await?;

    let transformed_data: Vec<DataTypeSend> = data.iter().map(DataTypeSend::from).collect();

    Ok(Json::from(transformed_data))
}
