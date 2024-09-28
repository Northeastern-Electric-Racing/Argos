use std::vec;

use chrono::{DateTime, Utc};
use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

prisma::run::select! {public_run{
    id
    location_name
    driver_name
    system_name
    time
}}

/// Gets all runs
/// * `db` - The prisma client to make the call to
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_runs(db: &Database) -> Result<Vec<public_run::Data>, QueryError> {
    db.run()
        .find_many(vec![])
        .select(public_run::select())
        .exec()
        .await
}

/// Gets a single run by its id
/// * `db` - The prisma client to make the call to
/// * `run_id` - The id of the run to search for
///   returns: A result containing the data (or None if the `run_id` was not a valid run) or the QueryError propogated by the db
pub async fn get_run_by_id(
    db: &Database,
    run_id: i32,
) -> Result<Option<public_run::Data>, QueryError> {
    db.run()
        .find_unique(prisma::run::id::equals(run_id))
        .select(public_run::select())
        .exec()
        .await
}

/// Creates a run
/// * `db` - The prisma client to make the call to
/// * `timestamp` - time when the run starts
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run(
    db: &Database,
    timestamp: DateTime<Utc>,
) -> Result<public_run::Data, QueryError> {
    db.run()
        .create(timestamp.fixed_offset(), vec![])
        .select(public_run::select())
        .exec()
        .await
}

/// Creates a run with a given id
/// * `db` - The prisma client to make the call to
/// * `timestamp` - time when the run starts
/// * `run_id` - The id of the run to create, must not already be in use!
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run_with_id(
    db: &Database,
    timestamp: DateTime<Utc>,
    run_id: i32,
) -> Result<public_run::Data, QueryError> {
    db.run()
        .create(timestamp.fixed_offset(), vec![prisma::run::id::set(run_id)])
        .select(public_run::select())
        .exec()
        .await
}
