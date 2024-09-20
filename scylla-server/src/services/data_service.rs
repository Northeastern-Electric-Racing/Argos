use prisma_client_rust::{chrono::DateTime, QueryError};

use crate::{prisma, processors::ClientData, Database};

prisma::data::select! {public_data {
    time
    values
}}

/// Get datapoints that mach criteria
/// * `db` - The prisma client to make the call to
/// * `data_type_name` - The data type name to filter the data by
/// * `run_id` - The run id to filter the data
/// * `fetch_run` whether to fetch the run assocaited with this data
/// * `fetch_data_type` whether to fetch the data type associated with this data
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn get_data(
    db: &Database,
    data_type_name: String,
    run_id: i32,
) -> Result<Vec<public_data::Data>, QueryError> {
    db.data()
        .find_many(vec![
            prisma::data::data_type_name::equals(data_type_name),
            prisma::data::run_id::equals(run_id),
        ])
        .select(public_data::select())
        .exec()
        .await
}

/// Adds a datapoint
/// * `db` - The prisma client to make the call to
/// * `serverdata` - The protobuf message to parse, note the unit is ignored!
/// * `unix_time` - The time im miliseconds since unix epoch of the message
/// * `data_type_name` - The name of the data type, note this data type must already exist!
/// * `rin_id` - The run id to assign the data point to, note this run must already exist!
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn add_data(
    db: &Database,
    client_data: ClientData,
) -> Result<public_data::Data, QueryError> {
    db.data()
        .create(
            prisma::data_type::name::equals(client_data.name),
            DateTime::from_timestamp_millis(client_data.timestamp)
                .expect("Could not parse timestamp")
                .fixed_offset(),
            prisma::run::id::equals(client_data.run_id),
            vec![prisma::data::values::set(
                client_data
                    .values
                    .iter()
                    .map(|f| f.parse::<f64>().unwrap_or_default())
                    .collect(),
            )],
        )
        .select(public_data::select())
        .exec()
        .await
}

/// Adds many datapoints via a batch insert
/// * `db` - The prisma client to make the call to
/// * `client_data` - A list of data to batch insert
///   returns: A result containing the number of rows inserted or the QueryError propogated by the db
pub async fn add_many(db: &Database, client_data: Vec<ClientData>) -> Result<i64, QueryError> {
    db.data()
        .create_many(
            client_data
                .iter()
                .map(|f| {
                    prisma::data::create_unchecked(
                        f.name.to_string(),
                        DateTime::from_timestamp_millis(f.timestamp)
                            .expect("Could not parse timestamp")
                            .fixed_offset(),
                        f.run_id,
                        vec![prisma::data::values::set(
                            f.values
                                .iter()
                                .map(|f| f.parse::<f64>().unwrap_or_default())
                                .collect(),
                        )],
                    )
                })
                .collect(),
        )
        .exec()
        .await
}
