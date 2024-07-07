use prisma_client_rust::{chrono::DateTime, QueryError};

use crate::{
    prisma::{self},
    serverdata::ServerData,
    Database,
};

/// Get datapoints that mach criteria
/// * `db` - The prisma client to make the call to
/// * `data_type_name` - The data type name to filter the data by
/// * `run_id` - The run id to filter the data by
/// returns: A result containing the data or the QueryError propogated by the db
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

/// Adds a datapoint
/// * `db` - The prisma client to make the call to
/// * `serverdata` - The protobuf message to parse, note the unit is ignored!
/// * `unix_time` - The time im miliseconds since unix epoch of the message
/// * `data_type_name` - The name of the data type, note this data type must already exist!
/// * `rin_id` - The run id to assign the data point to, note this run must already exist!
/// returns: A result containing the data or the QueryError propogated by the db
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
