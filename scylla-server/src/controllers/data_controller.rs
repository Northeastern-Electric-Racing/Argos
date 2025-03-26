use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;

use crate::{
    error::ScyllaError, services::data_service, transformers::data_transformer::PublicData,
    PoolHandle,
};

#[derive(Deserialize)]
pub struct Timing {
    pub time: i64,
    pub after: i64,
    pub before: i64,
}

/// Get all of the data points of a certain data type name and run ID
pub async fn get_data_by_run_id(
    State(pool): State<PoolHandle>,
    Path((data_type_name, run_id)): Path<(String, i32)>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let mut db = pool.get().await?;
    let data = data_service::get_data_by_run_id(&mut db, data_type_name, run_id).await?;

    // map data to frontend data types according to the From func of the client struct
    let mut transformed_data: Vec<PublicData> = data.into_iter().map(PublicData::from).collect();
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}

pub async fn get_data_by_timing(
    State(pool): State<PoolHandle>,
    Path(data_type_name): Path<String>,
    Query(timing): Query<Timing>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let mut db = pool.get().await?;
    let data = data_service::get_data_by_timing(&mut db, data_type_name, timing).await?;

    // map data to frontend data types according to the From func of the client struct
    let mut transformed_data: Vec<PublicData> = data.into_iter().map(PublicData::from).collect();
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}
