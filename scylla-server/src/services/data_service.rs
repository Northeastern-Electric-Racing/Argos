use crate::{
    controllers::data_controller::Timing,
    models::{Data, DataInsert},
    schema::data::dsl::*,
    ClientData, Database,
};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use tracing::info;

/// Get datapoints that mach criteria
/// * `db` - The database connection to use
/// * `data_type_name` - The data type name to filter the data by
/// * `run_id` - The run id to filter the data
///   returns: A result containing the data or the error propogated by the db
pub async fn get_data_by_run_id(
    db: &mut Database<'_>,
    data_type_name: String,
    run_id: i32,
) -> Result<Vec<Data>, diesel::result::Error> {
    data.filter(runId.eq(run_id).and(dataTypeName.eq(data_type_name)))
        .load(db)
        .await
}

/// Get datapoints that mach criteria
/// * `db` - The database connection to use
/// * `data_type_name` - The data type name to filter the data by
/// * `timing` - The timeframe the data must be constrained within
///   returns: A result containing the data or the error propogated by the db
pub async fn get_data_by_timing(
    db: &mut Database<'_>,
    data_type_name: String,
    timing: Timing,
) -> Result<Vec<Data>, diesel::result::Error> {
    let higher_end: i64 = timing.time + (timing.after * 60 * 1000); // minutes to microsseconds
    let lower_end: i64 = timing.time - (timing.before * 60 * 1000); // minutes to microsseconds
    info!("Higher end: {}", higher_end);
    info!("Lower end: {}", lower_end);

    data.filter(
        dataTypeName
            .eq(data_type_name)
            .and(time.ge(lower_end))
            .and(time.le(higher_end)),
    )
    .load(db)
    .await
}

/// Adds a datapoint
/// * `db` - The database connection to use
/// * `serverdata` - The protobuf message to parse, note the unit is ignored!
/// * `unix_time` - The time im miliseconds since unix epoch of the message
/// * `data_type_name` - The name of the data type, note this data type must already exist!
/// * `rin_id` - The run id to assign the data point to, note this run must already exist!
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn add_data(
    db: &mut Database<'_>,
    client_data: ClientData,
) -> Result<Data, diesel::result::Error> {
    diesel::insert_into(data)
        .values(Into::<DataInsert>::into(client_data))
        .get_result(db)
        .await
}

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
