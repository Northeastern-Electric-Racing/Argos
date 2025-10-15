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
/// Now with automatic downsampling for large datasets
pub async fn get_data_by_run_id(
    State(pool): State<PoolHandle>,
    Path((data_type_name, run_id)): Path<(String, i32)>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let mut db = pool.get().await?;

    let (total_count, data_by_time) = data_service::get_data_by_run_id_with_auto_downsampling(
        &mut db,
        data_type_name.clone(),
        run_id,
    )
    .await?;

    // Get the total count for metadata
    let returned_count = data_by_time.len() as u32;

    // Transform data
    let mut transformed_data: Vec<PublicData> = data_by_time
        .into_iter()
        .map(|d| {
            let mut public_data = PublicData::from(d);

            // Update downsampling info
            public_data.downsampling_info = if returned_count < total_count as u32 {
                crate::transformers::data_transformer::DownsamplingInfo {
                    is_downsampled: true,
                    sampling_rate: data_service::calculate_auto_sampling_rate(total_count),
                    original_count: Some(total_count as u32),
                    returned_count: Some(returned_count),
                }
            } else {
                crate::transformers::data_transformer::DownsamplingInfo {
                    is_downsampled: false,
                    sampling_rate: 1,
                    original_count: Some(total_count as u32),
                    returned_count: Some(returned_count),
                }
            };

            public_data
        })
        .collect();

    transformed_data.sort();

    Ok(Json::from(transformed_data))
}

pub async fn get_data_by_timing(
    State(pool): State<PoolHandle>,
    Path(data_type_name): Path<String>,
    Query(timing): Query<Timing>,
) -> Result<Json<Vec<PublicData>>, ScyllaError> {
    let mut db = pool.get().await?;
    let data_by_time = data_service::get_data_by_timing(&mut db, data_type_name, timing).await?;

    // map data to frontend data types according to the From func of the client struct
    let mut transformed_data: Vec<PublicData> =
        data_by_time.into_iter().map(PublicData::from).collect();
    transformed_data.sort();

    Ok(Json::from(transformed_data))
}
