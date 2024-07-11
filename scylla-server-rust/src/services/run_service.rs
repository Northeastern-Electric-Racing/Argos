use std::vec;

use prisma_client_rust::{chrono::DateTime, QueryError};

use crate::{
    prisma::{self},
    Database,
};

/// Gets all runs
/// * `db` - The prisma client to make the call to
/// * `fetch_loc` - Whether to fetch the location data
/// * `fetch_driver` - Whether to fetch the driver data
/// * `fetch_system` - Whether to fetch the system data
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_runs(
    db: &Database,
    fetch_loc: bool,
    fetch_driver: bool,
    fetch_system: bool,
) -> Result<Vec<prisma::run::Data>, QueryError> {
    let mut find_q = db.run().find_many(vec![]);

    if fetch_loc {
        find_q = find_q.with(prisma::run::location::fetch());
    }
    if fetch_driver {
        find_q = find_q.with(prisma::run::driver::fetch());
    }
    if fetch_system {
        find_q = find_q.with(prisma::run::system::fetch());
    }

    find_q.exec().await
}

/// Gets a single run by its id
/// * `db` - The prisma client to make the call to
/// * `fetch_loc` - Whether to fetch the location data
/// * `fetch_driver` - Whether to fetch the driver data
/// * `fetch_system` - Whether to fetch the system data
/// * `run_id` - The id of the run to search for
/// returns: A result containing the data (or None if the `run_id` was not a valid run) or the QueryError propogated by the db
pub async fn get_run_by_id(
    db: &Database,
    fetch_loc: bool,
    fetch_driver: bool,
    fetch_system: bool,
    run_id: i32,
) -> Result<Option<prisma::run::Data>, QueryError> {
    let mut find_q = db.run().find_unique(prisma::run::id::equals(run_id));

    if fetch_loc {
        find_q = find_q.with(prisma::run::location::fetch());
    }
    if fetch_driver {
        find_q = find_q.with(prisma::run::driver::fetch());
    }
    if fetch_system {
        find_q = find_q.with(prisma::run::system::fetch());
    }

    find_q.exec().await
}

/// Creates a run
/// * `db` - The prisma client to make the call to
/// * `timestamp` - The unix time since epoch in miliseconds when the run starts
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run(db: &Database, timestamp: i64) -> Result<prisma::run::Data, QueryError> {
    db.run()
        .create(
            DateTime::from_timestamp_millis(timestamp)
            .expect("Could not parse timestamp")
            .fixed_offset(),
            vec![],
        )
        .exec()
        .await
}

/// Creates a run with a given id
/// * `db` - The prisma client to make the call to
/// * `timestamp` - The unix time since epoch in miliseconds when the run starts
/// * `run_id` - The id of the run to create, must not already be in use!
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn create_run_with_id(
    db: &Database,
    timestamp: i64,
    run_id: i32,
) -> Result<prisma::run::Data, QueryError> {
    db.run()
        .create(
            DateTime::from_timestamp_millis(timestamp)
            .expect("Could not parse timestamp")
            .fixed_offset(),
            vec![prisma::run::id::set(run_id)],
        )
        .exec()
        .await
}
