use axum::{extract::State, Json};

use crate::{
    error::ScyllaError, services::data_type_service,
    transformers::data_type_transformer::PublicDataType, Database,
};

pub async fn get_all_data_types(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicDataType>>, ScyllaError> {
    let data_types = data_type_service::get_all_data_types(&db, true).await?;

    let transformed_data_types: Vec<PublicDataType> =
        data_types.iter().map(PublicDataType::from).collect();

    Ok(Json::from(transformed_data_types))
}
