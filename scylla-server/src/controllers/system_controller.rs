use axum::{extract::State, Json};

use crate::{
    error::ScyllaError, services::system_service, transformers::system_transformer::PublicSystem,
    Database,
};

/// get a list of systems
pub async fn get_all_systems(
    State(db): State<Database>,
) -> Result<Json<Vec<PublicSystem>>, ScyllaError> {
    let run_data = system_service::get_all_systems(&db).await?;

    let transformed_run_data: Vec<PublicSystem> = run_data.iter().map(PublicSystem::from).collect();

    Ok(Json::from(transformed_run_data))
}
