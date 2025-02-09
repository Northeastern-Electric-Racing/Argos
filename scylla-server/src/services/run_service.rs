use crate::{models::Run, schema::run::dsl::*, Database};
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;

/// Gets all runs
/// * `db` - The prisma client to make the call to
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_runs(db: &mut Database<'_>) -> Result<Vec<Run>, diesel::result::Error> {
    run.order(runId.asc()).get_results(db).await
}

/// Gets the latest run (highest run id)
/// * `db` - The prisma client to make the call to
///  returns: The latest run or the QueryError propogated by the db
pub async fn get_latest_run(db: &mut Database<'_>) -> Result<Run, diesel::result::Error> {
    run.order(runId.desc()).first::<Run>(db).await
}

/// Gets a single run by its id
/// * `db` - The prisma client to make the call to
/// * `run_id` - The id of the run to search for
///   returns: A result containing the data (or None if the `run_id` was not a valid run) or the QueryError propogated by the db
pub async fn get_run_by_id(
    db: &mut Database<'_>,
    run_id: i32,
) -> Result<Option<Run>, diesel::result::Error> {
    run.find(run_id).first::<Run>(db).await.optional()
}

/// Creates a run
/// * `db` - The prisma client to make the call to
/// * `timestamp` - time when the run starts
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run(
    db: &mut Database<'_>,
    timestamp: DateTime<Utc>,
) -> Result<Run, diesel::result::Error> {
    diesel::insert_into(run)
        .values(time.eq(timestamp))
        .get_result(db)
        .await
}

/// Creates a run with a given id
/// * `db` - The prisma client to make the call to
/// * `timestamp` - time when the run starts
/// * `run_id` - The id of the run to create, must not already be in use!
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run_with_id(
    db: &mut Database<'_>,
    timestamp: DateTime<Utc>,
    run_id: i32,
) -> Result<Run, diesel::result::Error> {
    diesel::insert_into(run)
        .values((time.eq(timestamp), runId.eq(run_id)))
        .get_result(db)
        .await
}

/// Creates a run with a run note
/// * `db` - The database connection
/// * `run_id` - The id of the run to search for
/// * `driver` - The driver's name
/// * `location` - The location of the runs
/// * `run_notes` - The notes written for the run
///     returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run_with_data(
    db: &mut Database<'_>,
    timestamp: DateTime<Utc>,
    driver: String,
    location: String,
    run_notes: String,
) -> Result<Run, diesel::result::Error> {
    diesel::insert_into(run)
        .values((
            time.eq(timestamp),
            driverName.eq(driver),
            locationName.eq(location),
            notes.eq(run_notes),
        ))
        .get_result(db)
        .await
}

/// Updates run data with a given run id
/// * `db` - The database connection
/// * `run_id` - The id of the run to search for
/// * `driver` - The driver's name
/// * `location` - The location of the runs
/// * `run_notes` - The updated run notes
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn update_run_data_with_run_id(
    db: &mut Database<'_>,
    run_id: i32,
    driver: String,
    location: String,
    run_notes: String,
) -> Result<Run, diesel::result::Error> {
    diesel::update(run.filter(runId.eq(run_id)))
        .set((
            driverName.eq(driver),
            locationName.eq(location),
            notes.eq(run_notes),
        ))
        .get_result(db)
        .await
}
