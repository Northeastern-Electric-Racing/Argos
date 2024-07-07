use axum::{
    extract::{Path, State},
    Json,
};

use crate::{
    error::ScyllaError, services::run_service, transformers::run_transformer::PublicRun, Database,
};

pub async fn get_all_runs(State(db): State<Database>) -> Result<Json<Vec<PublicRun>>, ScyllaError> {
    let run_data = run_service::get_all_runs(&db).await?;

    let transformed_run_data: Vec<PublicRun> = run_data.iter().map(PublicRun::from).collect();

    Ok(Json::from(transformed_run_data))
}

pub async fn get_run_by_id(
    State(db): State<Database>,
    Path(run_id): Path<i32>,
) -> Result<Json<PublicRun>, ScyllaError> {
    let run_data = run_service::get_run_by_id(&db, run_id).await?;

    if run_data.is_none() {
        return Err(ScyllaError::NotFound);
    }

    let run_data_safe = run_data.unwrap();

    let transformed_run_data = PublicRun::from(&run_data_safe);

    Ok(Json::from(transformed_run_data))
}
