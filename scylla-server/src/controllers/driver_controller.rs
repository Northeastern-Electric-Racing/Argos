use axum::{extract::State, Json};

use crate::{
    error::ScyllaError, services::driver_service, transformers::driver_transformer::PublicDriver,
    Database,
};

/// Get a list of drivers
pub async fn get_all_drivers(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicDriver>>, ScyllaError> {
    let driver_data = driver_service::get_all_drivers(&db).await?;

    let transformed_driver_data: Vec<PublicDriver> =
        driver_data.iter().map(PublicDriver::from).collect();

    Ok(Json::from(transformed_driver_data))
}
