use std::sync::atomic::Ordering;

use axum::{
    Json,
    extract::{Path, State},
};

use crate::{
    PoolHandle, error::ScyllaError, services::run_service, transformers::run_transformer::PublicRun,
};

/// get a list of runs
/// # Errors
/// Returns a scyllaError if the DB fails
pub async fn get_all_runs(
    State(pool): State<PoolHandle>,
) -> Result<Json<Vec<PublicRun>>, ScyllaError> {
    let mut db = pool.get().await?;
    let run_data = run_service::get_all_runs(&mut db).await?;

    let transformed_run_data: Vec<PublicRun> = run_data.into_iter().map(PublicRun::from).collect();

    Ok(Json::from(transformed_run_data))
}

/// get the latest run
/// # Errors
/// Returns a scyllaError if the DB fails
pub async fn get_latest_run(
    State(pool): State<PoolHandle>,
) -> Result<Json<PublicRun>, ScyllaError> {
    let mut db = pool.get().await?;
    let run_data = run_service::get_latest_run(&mut db).await?;

    let transformed_run_data = PublicRun::from(run_data);

    Ok(Json::from(transformed_run_data))
}

/// get a run given its ID
/// # Errors
/// Returns a scyllaError if the DB fails
pub async fn get_run_by_id(
    State(pool): State<PoolHandle>,
    Path(run_id): Path<i32>,
) -> Result<Json<PublicRun>, ScyllaError> {
    let mut db = pool.get().await?;
    let run_data = run_service::get_run_by_id(&mut db, run_id).await?;

    let Some(run_data_safe) = run_data else {
        return Err(ScyllaError::EmptyResult);
    };

    let transformed_run_data = PublicRun::from(run_data_safe);

    Ok(Json::from(transformed_run_data))
}

/// create a new run with an auto-incremented ID
/// note the new run must be updated so the channel passed in notifies the data processor to use the new run
/// # Errors
/// Returns a scyllaError if the DB fails
pub async fn new_run(State(pool): State<PoolHandle>) -> Result<Json<PublicRun>, ScyllaError> {
    let mut db = pool.get().await?;
    let run_data = run_service::create_run(&mut db, chrono::offset::Utc::now()).await?;

    crate::RUN_ID.store(run_data.runId, Ordering::Relaxed);
    tracing::info!(
        "Starting new run with ID: {}",
        crate::RUN_ID.load(Ordering::Relaxed)
    );

    Ok(Json::from(PublicRun::from(run_data)))
}

/// creates a new run with all associated data (driver, location, notes)
/// # Errors
/// Returns a scyllaError if the DB fails
pub async fn new_run_with_data(
    State(pool): State<PoolHandle>,
    Path((driver, location, run_notes)): Path<(String, String, String)>,
) -> Result<Json<PublicRun>, ScyllaError> {
    let mut db = pool.get().await?;
    let run_data = run_service::create_run_with_data(
        &mut db,
        chrono::offset::Utc::now(),
        driver,
        location,
        run_notes,
    )
    .await?;

    crate::RUN_ID.store(run_data.runId, Ordering::Relaxed);
    tracing::info!(
        "Starting new run with ID: {}",
        crate::RUN_ID.load(Ordering::Relaxed)
    );

    Ok(Json::from(PublicRun::from(run_data)))
}

/// updates a run's notes with a given run id
/// # Errors
/// Returns a scyllaError if the DB fails
pub async fn update_run_with_data(
    State(pool): State<PoolHandle>,
    Path((run_id, driver, location, run_notes)): Path<(i32, String, String, String)>,
) -> Result<Json<PublicRun>, ScyllaError> {
    let mut db = pool.get().await?;
    let updated_run_data =
        run_service::update_run_data_with_run_id(&mut db, run_id, driver, location, run_notes)
            .await?;

    Ok(Json::from(PublicRun::from(updated_run_data)))
}
