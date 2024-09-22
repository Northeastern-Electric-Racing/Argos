use axum::{
    extract::{Path, State},
    Json,
};

use crate::{
    error::ScyllaError, services::data_service, transformers::data_transformer::PublicData,
    Database,
};

/// Get all of the data points of a certain data type name and run ID
pub async fn get_data(
    State(db): State<Database>,
    Path((data_type_name, run_id)): Path<(String, i32)>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let data = data_service::get_data(&db, data_type_name, run_id).await?;

    // map data to frontend data types according to the From func of the client struct
    let mut transformed_data: Vec<PublicData> = data.iter().map(PublicData::from).collect();
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}

/// Get all of the data points of a certain data type name and run ID
pub async fn get_data_by_datetime(
    State(db): State<Database>,
    Path(datetime): Path<String>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let data = data_service::get_data_by_datetime(&db, datetime).await?;

    // map data to frontend data types according to the From func of the client struct
    let mut transformed_data: Vec<PublicData> = data.iter().map(PublicData::from).collect();
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}

