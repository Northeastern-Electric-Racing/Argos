use crate::{
    ClientData, Database,
    controllers::data_controller::Timing,
    models::{Data, DataInsert},
    schema::data::dsl::{data, dataTypeName, runId, time},
};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;
use tracing::{Level, instrument, warn};

/// Get datapoints that mach criteria
/// * `db` - The database connection to use
/// * `data_type_name` - The data type name to filter the data by
/// * `run_id` - The run id to filter the data
///   returns: A result containing the data or the error propogated by the db
pub async fn get_data_by_run_id(
    db: &mut Database<'_>,
    data_type_name: &str,
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
    let higher_end: i64 = (timing.time * 1000) + (timing.after * 60 * 1_000_000); // minutes to microsseconds
    let lower_end: i64 = (timing.time * 1000) - (timing.before * 60 * 1_000_000); // minutes to microsseconds

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
///   returns: A result containing the data or the `QueryError` propogated by the db
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

// constants for auto-downsampling
pub const LARGE_DATASET_THRESHOLD: i64 = 10000; // 10k points
pub const MAX_POINTS_TO_RETURN: u32 = 5000; // Max points to return

/// Get mean downsampled data for a run and data type
/// * `db` - The database connection to use
/// * `data_type_name` - The name of the data type to query
/// * `run_id` - The run ID to get data for
/// * `sampling_rate` - The sampling rate to use for downsampling
///   returns: A result containing the downsampled data or the `QueryError` propagated by the db
#[instrument(level = Level::DEBUG, skip(db))]
pub async fn get_mean_downsampled_data_by_run_id(
    db: &mut Database<'_>,
    data_type_name: &str,
    run_id: i32,
    sampling_rate: usize,
) -> Result<Vec<Data>, diesel::result::Error> {
    let all_data = data
        .filter(runId.eq(run_id).and(dataTypeName.eq(data_type_name)))
        .order(time.asc())
        .load::<crate::models::Data>(db)
        .await?;
    let type_name = data_type_name.to_string();

    let mut out: Vec<Data> = Vec::with_capacity(all_data.len().div_ceil(sampling_rate));
    for chunk in all_data.chunks(sampling_rate) {
        if chunk.is_empty() {
            continue;
        }

        let sum_time: i128 = chunk.iter().map(|d| i128::from(d.time)).sum();
        let mean_time: i64 = (sum_time / chunk.len() as i128) as i64;

        let min_values_len = chunk.iter().map(|d| d.values.len()).min().unwrap_or(0);
        let mut sum_values: Vec<f32> = vec![0.0; min_values_len];
        for d in chunk {
            for (i, &v) in d.values.iter().take(min_values_len).enumerate() {
                if let Some(value) = v {
                    sum_values[i] += value;
                } else {
                    warn!("Encountered None value while downsampling data!");
                }
            }
        }
        let mean_values: Vec<Option<f32>> = sum_values
            .iter()
            .map(|&sum| Some(sum / chunk.len() as f32))
            .collect();

        out.push(Data {
            runId: run_id,
            dataTypeName: type_name.clone(),
            time: mean_time,
            values: mean_values,
        });
    }

    Ok(out)
}

/// Calculate the total number of data points for a run and data type
/// * `db` - The database connection to use
/// * `data_type_name` - The name of the data type to count
/// * `run_id` - The run ID to count data for
///   returns: A result containing the count or the `QueryError` propagated by the db
pub async fn get_data_point_count(
    db: &mut Database<'_>,
    data_type_name: &str,
    run_id: i32,
) -> Result<i64, diesel::result::Error> {
    let count = data
        .filter(runId.eq(run_id).and(dataTypeName.eq(data_type_name)))
        .count()
        .get_result(db)
        .await?;

    Ok(count)
}

/// Calculate optimal sampling rate based on data point count
/// * `total_count` - The total number of data points in the dataset
///   returns: The sampling rate to use (1 for no downsampling, >1 for downsampling)
#[must_use]
pub fn calculate_auto_sampling_rate(total_count: i64) -> u32 {
    if total_count <= LARGE_DATASET_THRESHOLD {
        return 1; // No downsampling needed
    }

    // Calculate sampling rate to get close to MAX_POINTS_TO_RETURN
    let sampling_rate = (total_count as f64 / f64::from(MAX_POINTS_TO_RETURN)).ceil() as u32;

    // Ensure we don't sample more aggressively than necessary
    sampling_rate.max(1)
}

/// Get data with automatic downsampling if needed
/// Returns the same Vec<Data> as the original service, but potentially downsampled
/// * `db` - The database connection to use
/// * `data_type_name` - The name of the data type to query
/// * `run_id` - The run ID to get data for
///   returns: A result containing the data (downsampled if large) or the `QueryError` propagated by the db
#[instrument(level = Level::TRACE, skip(db))]
pub async fn get_data_by_run_id_with_auto_downsampling(
    db: &mut Database<'_>,
    data_type_name: String,
    run_id: i32,
) -> Result<(i64, Vec<Data>), diesel::result::Error> {
    // First, check the data size
    let total_count = get_data_point_count(db, &data_type_name, run_id).await?;

    if total_count <= LARGE_DATASET_THRESHOLD {
        // Small dataset - return all data without downsampling
        return Ok((
            total_count,
            crate::services::data_service::get_data_by_run_id(db, &data_type_name, run_id).await?,
        ));
    }

    return Ok((
        total_count,
        get_mean_downsampled_data_by_run_id(
            db,
            &data_type_name,
            run_id,
            calculate_auto_sampling_rate(total_count) as usize,
        )
        .await?,
    ));
}
