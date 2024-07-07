use prisma_client_rust::{chrono::DateTime, QueryError};

use crate::{
    prisma::{self},
    serverdata::ServerData,
    Database,
};

/// Get a datapoint
pub async fn get_data(
    db: &Database,
    data_type_name: String,
    run_id: i32,
) -> Result<Vec<prisma::data::Data>, QueryError> {
    db.data()
        .find_many(vec![
            prisma::data::data_type_name::equals(data_type_name),
            prisma::data::run_id::equals(run_id),
        ])
        .exec()
        .await
}

/// Add a datapoint
pub async fn add_data(
    db: &Database,
    serverdata: ServerData,
    unix_time: i64,
    data_type_name: String,
    run_id: i32,
) -> Result<prisma::data::Data, QueryError> {
    db.data()
        .create(
            prisma::data_type::name::equals(data_type_name),
            DateTime::from_timestamp_millis(unix_time)
                .unwrap()
                .fixed_offset(),
            prisma::run::id::equals(run_id),
            vec![prisma::data::values::set(
                serverdata
                    .value
                    .iter()
                    .map(|f| f.parse::<f64>().unwrap())
                    .collect(),
            )],
        )
        .exec()
        .await
}
