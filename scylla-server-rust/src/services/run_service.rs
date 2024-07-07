use std::vec;

use prisma_client_rust::{chrono::DateTime, QueryError};

use crate::{
    prisma::{self},
    Database,
};

pub async fn get_all_runs(db: &Database) -> Result<Vec<prisma::run::Data>, QueryError> {
    db.run().find_many(vec![]).exec().await
}

pub async fn get_run_by_id(
    db: &Database,
    run_id: i32,
) -> Result<Option<prisma::run::Data>, QueryError> {
    db.run()
        .find_unique(prisma::run::id::equals(run_id))
        .exec()
        .await
}

pub async fn create_run(db: &Database, timestamp: i64) -> Result<prisma::run::Data, QueryError> {
    db.run()
        .create(
            DateTime::from_timestamp_millis(timestamp)
                .unwrap()
                .fixed_offset(),
            vec![],
        )
        .exec()
        .await
}

pub async fn create_run_with_id(
    db: &Database,
    timestamp: i64,
    run_id: i32,
) -> Result<prisma::run::Data, QueryError> {
    db.run()
        .create(
            DateTime::from_timestamp_millis(timestamp)
                .unwrap()
                .fixed_offset(),
            vec![prisma::run::id::set(run_id)],
        )
        .exec()
        .await
}
