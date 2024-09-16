use axum::{extract::State, Json};

use crate::{
    error::ScyllaError, services::location_service,
    transformers::location_transformer::PublicLocation, Database,
};

pub async fn get_all_locations(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicLocation>>, ScyllaError> {
    let loc_data = location_service::get_all_locations(&db).await?;

    let transformed_loc_data: Vec<PublicLocation> =
        loc_data.iter().map(PublicLocation::from).collect();

    Ok(Json::from(transformed_loc_data))
}
