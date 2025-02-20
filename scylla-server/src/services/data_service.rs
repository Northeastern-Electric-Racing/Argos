use crate::{
    ClientData, Database,
    models::{Data, DataInsert},
    schema::data::dsl::*,
};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;

/// Get datapoints that mach criteria
/// * `db` - The database connection to use
/// * `data_type_name` - The data type name to filter the data by
/// * `run_id` - The run id to filter the data
///   returns: A result containing the data
/// # Errors
/// Gives a db error back
pub async fn get_data(
    db: &mut Database<'_>,
    data_type_name: String,
    run_id: i32,
) -> Result<Vec<Data>, diesel::result::Error> {
    data.filter(runId.eq(run_id).and(dataTypeName.eq(data_type_name)))
        .load(db)
        .await
}

/// Adds a datapoint
/// * `db` - The database connection to use
/// * `client_data` - The client data to put into the database
/// * `unix_time` - The time im miliseconds since unix epoch of the message
/// * `data_type_name` - The name of the data type, note this data type must already exist!
/// * `rin_id` - The run id to assign the data point to, note this run must already exist!
///   returns: A result containing the data
/// # Errors
/// Gives a db error back
pub async fn add_data(
    db: &mut Database<'_>,
    client_data: ClientData,
) -> Result<Data, diesel::result::Error> {
    diesel::insert_into(data)
        .values(Into::<DataInsert>::into(client_data))
        .get_result(db)
        .await
}

/// Adds many datapoints
/// * `db` - The database connection to use
/// * `client_data` - The list of client datapoints to put into the database
/// # Errors
/// Gives a db error back
pub async fn add_many(
    db: &mut Database<'_>,
    client_data: Vec<ClientData>,
) -> Result<usize, diesel::result::Error> {
    diesel::insert_into(data)
        .values(
            client_data
                .into_iter()
                .map(Into::<DataInsert>::into)
                .collect::<Vec<DataInsert>>(),
        )
        .on_conflict_do_nothing()
        .execute(db)
        .await
}
