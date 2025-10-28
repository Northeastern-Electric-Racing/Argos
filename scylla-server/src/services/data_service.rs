use crate::{
    controllers::data_controller::Timing,
    models::{Data, DataInsert},
    schema::data::dsl::{data, dataTypeName, runId, time as time_col},
    ClientData, Database,
};
use diesel::prelude::*;
use diesel::sql_types::{Array, BigInt, Double, Integer, Text};
use diesel_async::RunQueryDsl;
use std::time::Instant;
use tracing::{instrument, Level};

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
    let higher_end: i64 = (timing.time * 1000) + (timing.after * 60 * 1000000); // minutes to microsseconds
    let lower_end: i64 = (timing.time * 1000) - (timing.before * 60 * 1000000); // minutes to microsseconds

    data.filter(
        dataTypeName
            .eq(data_type_name)
            .and(time_col.ge(lower_end))
            .and(time_col.le(higher_end)),
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

// constants for auto-downsampling
pub const LARGE_DATASET_THRESHOLD: i64 = 10000; // 10k points
pub const MAX_POINTS_TO_RETURN: u32 = 5000; // Max points to return

/// Get downsampled data points for a run with simple "every Nth point" sampling
/// * `db` - The database connection to use
/// * `data_type_name` - The name of the data type to query
/// * `run_id` - The run ID to get data for
/// * `sampling_rate` - The sampling rate (every Nth point to keep)
///   returns: A result containing the downsampled data or the QueryError propagated by the db
pub async fn get_downsampled_data_by_run_id(
    db: &mut Database<'_>,
    data_type_name: &str,
    run_id: i32,
    sampling_rate: u32,
) -> Result<Vec<Data>, diesel::result::Error> {
    // Get all data points first (ordered by time)
    let all_data = data
        .filter(runId.eq(run_id).and(dataTypeName.eq(data_type_name)))
        .order(time_col.asc())
        .load::<Data>(db)
        .await?;

    // Simple downsampling: keep every Nth point
    // Expand to other downsampling algorithms later
    let downsampled: Vec<Data> = all_data
        .into_iter()
        .enumerate()
        .filter(|(index, _)| index % sampling_rate as usize == 0)
        .map(|(_, data_point)| data_point)
        .collect();

    Ok(downsampled)
}

pub async fn get_mean_downsampled_data_by_run_id(
    db: &mut Database<'_>,
    data_type_name: &str,
    run_id: i32,
    sampling_rate: usize,
) -> Result<Vec<Data>, diesel::result::Error> {
    let all_data = data
        .filter(runId.eq(run_id).and(dataTypeName.eq(data_type_name)))
        .order(time_col.asc())
        .load::<crate::models::Data>(db)
        .await?;

    let mut out: Vec<(i64, Vec<f32>)> =
        Vec::with_capacity((all_data.len() + sampling_rate - 1) / sampling_rate);
    for chunk in all_data.chunks(sampling_rate) {
        if chunk.is_empty() {
            continue;
        }

        let sum_time: i128 = chunk.iter().map(|d| d.time as i128).sum();
        let mean_time: i64 = (sum_time / chunk.len() as i128) as i64;

        let min_values_len = chunk.iter().map(|d| d.values.len()).min().unwrap_or(0);
        let mut sum_values: Vec<f32> = vec![0.0; min_values_len];
        for d in chunk {
            for (i, v) in d.values.iter().take(min_values_len).enumerate() {
                if let Some(val) = v {
                    sum_values[i] += *val;
                }
            }
        }
        let mean_values: Vec<f32> = sum_values
            .iter()
            .map(|sum| sum / chunk.len() as f32)
            .collect();

        out.push((mean_time, mean_values));
    }

    Ok(out
        .iter()
        .map(|(mean_time, mean_values)| Data {
            runId: run_id,
            dataTypeName: data_type_name.to_string(),
            time: *mean_time,
            values: mean_values.iter().cloned().map(Some).collect(),
        })
        .collect())
}

#[derive(QueryableByName)]
struct AggRow {
    #[diesel(sql_type = BigInt)]
    time: i64,
    #[diesel(sql_type = Array<Double>)]
    values: Vec<f64>,
}

pub async fn get_mean_downsampled_data_by_run_id_raw_sql_query(
    db: &mut Database<'_>,
    data_type_name: &str,
    run_id: i32,
    sampling_rate: usize,
) -> Result<Vec<Data>, diesel::result::Error> {
    // This raw-SQL implementation:
    // - groups rows into chunks of `sampling_rate` using row_number() windowing,
    // - computes mean_time per chunk,
    // - computes per-index sums (treating NULL as 0) and divides by chunk size to match original semantics
    // - truncates to the min array length present in the chunk
    let sql = r#"
WITH selected AS (
  SELECT *,
         ((row_number() OVER (ORDER BY time) - 1) / $1::int) AS chunk_idx
  FROM "data"
  WHERE "runId" = $2 AND "dataTypeName" = $3
),
minlens AS (
  SELECT chunk_idx,
         MIN(array_length(values, 1)) AS min_len,
         COUNT(*) AS cnt,
         AVG(time)::bigint AS mean_time
  FROM selected
  GROUP BY chunk_idx
),
unnested AS (
  SELECT s.chunk_idx,
         u.ordinality AS idx,
         u.val
  FROM selected s,
       unnest(s.values) WITH ORDINALITY AS u(val, ordinality)
),
avgvals AS (
  -- sum NULLs are coerced to 0 with COALESCE to match original behavior (None contributed 0)
  SELECT u.chunk_idx,
         u.idx,
         COALESCE(SUM(u.val), 0.0) / m.cnt AS avg_val
  FROM unnested u
  JOIN minlens m ON u.chunk_idx = m.chunk_idx
  WHERE u.idx <= m.min_len
  GROUP BY u.chunk_idx, u.idx, m.cnt
),
agg AS (
  SELECT m.chunk_idx,
         m.mean_time AS time,
         array_agg(a.avg_val ORDER BY a.idx) AS values
  FROM minlens m
  LEFT JOIN avgvals a ON m.chunk_idx = a.chunk_idx
  GROUP BY m.chunk_idx, m.mean_time
  ORDER BY m.chunk_idx
)
SELECT time, values FROM agg;
"#;

    let rows: Vec<AggRow> = diesel::sql_query(sql)
        .bind::<Integer, _>(sampling_rate as i32) // $1
        .bind::<Integer, _>(run_id) // $2
        .bind::<Text, _>(data_type_name) // $3
        .load(db)
        .await?;

    // convert DB rows into Vec<Data>, casting f64 -> f32 and wrapping into Some(...) as original code did
    let out = rows
        .into_iter()
        .map(|r| Data {
            runId: run_id,
            dataTypeName: data_type_name.to_string(),
            time: r.time,
            values: r.values.into_iter().map(|v| Some(v as f32)).collect(),
        })
        .collect();

    Ok(out)
}

/// Calculate the total number of data points for a run and data type
/// * `db` - The database connection to use
/// * `data_type_name` - The name of the data type to count
/// * `run_id` - The run ID to count data for
///   returns: A result containing the count or the QueryError propagated by the db
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
pub fn calculate_auto_sampling_rate(total_count: i64) -> u32 {
    if total_count <= LARGE_DATASET_THRESHOLD {
        return 1; // No downsampling needed
    }

    // Calculate sampling rate to get close to MAX_POINTS_TO_RETURN
    let sampling_rate = (total_count as f64 / MAX_POINTS_TO_RETURN as f64).ceil() as u32;

    // Ensure we don't sample more aggressively than necessary
    sampling_rate.max(1)
}

/// Get data with automatic downsampling if needed
/// Returns the same Vec<Data> as the original service, but potentially downsampled
/// * `db` - The database connection to use
/// * `data_type_name` - The name of the data type to query
/// * `run_id` - The run ID to get data for
///   returns: A result containing the data (downsampled if large) or the QueryError propagated by the db
#[instrument(level = Level::TRACE, skip(db), fields(data_type_name = %data_type_name, run_id = %run_id, elapsed_ms = tracing::field::Empty))]
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

    // Large dataset - apply auto-downsampling
    let sampling_rate = calculate_auto_sampling_rate(total_count);
    let start = Instant::now();
    let downsampled_data = get_mean_downsampled_data_by_run_id_raw_sql_query(
        db,
        &data_type_name,
        run_id,
        sampling_rate as usize,
    )
    .await?;
    let elapsed_ms = start.elapsed().as_millis();
    tracing::Span::current().record("elapsed_ms", elapsed_ms as u64);
    return Ok((total_count, downsampled_data));
}
