// filepath: /Users/surya/Developer/NER/Firmware/Argos/scylla-server/examples/bench_downsampling.rs
use diesel::sql_query;
use diesel::sql_types::Text;
use diesel::{ExpressionMethods, QueryDsl};
use diesel_async::{
    pooled_connection::{bb8::Pool, AsyncDieselConnectionManager},
    AsyncPgConnection, RunQueryDsl,
};
use dotenvy::dotenv;
use serde_json::Value;
use std::{error::Error, time::Instant};

#[derive(diesel::QueryableByName)]
struct ExplainRow {
    #[diesel(sql_type = Text)]
    #[diesel(column_name = "QUERY PLAN")] // match Postgres EXPLAIN column name
    plan: String,
}

async fn explain_aggregate_raw_sql(
    conn: &mut AsyncPgConnection,
    sampling_rate: i32,
    run_id: i32,
    data_type: &str,
    iterations: usize,
    warmup: usize,
) -> Result<(), Box<dyn Error>> {
    // raw SQL used by the service
    let raw_sql = r#"
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

    let explain_sql = format!("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {}", raw_sql);

    // warmup
    for _ in 0..warmup {
        let _ = sql_query(&explain_sql)
            .bind::<diesel::sql_types::Integer, _>(sampling_rate)
            .bind::<diesel::sql_types::Integer, _>(run_id)
            .bind::<Text, _>(data_type)
            .load::<ExplainRow>(conn)
            .await?;
    }

    // we will report EXPLAIN timings in microseconds (µs) to match the other benchmarks
    let mut planning_us = Vec::with_capacity(iterations);
    let mut execution_us = Vec::with_capacity(iterations);
    let mut top_node_us = Vec::with_capacity(iterations);

    for _ in 0..iterations {
        // load named column into ExplainRow (matches "QUERY PLAN")
        let rows: Vec<ExplainRow> = sql_query(&explain_sql)
            .bind::<diesel::sql_types::Integer, _>(sampling_rate)
            .bind::<diesel::sql_types::Integer, _>(run_id)
            .bind::<Text, _>(data_type)
            .load(conn)
            .await?;

        if let Some(er) = rows.into_iter().next() {
            if let Ok(val) = serde_json::from_str::<Value>(&er.plan) {
                if let Some(root) = val.get(0) {
                    // Postgres reports Planning Time and Execution Time in milliseconds.
                    // convert to microseconds for consistent units across all benches.
                    let planning_ms = root
                        .get("Planning Time")
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0);
                    let execution_ms = root
                        .get("Execution Time")
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0);
                    planning_us.push(planning_ms * 1000.0);
                    execution_us.push(execution_ms * 1000.0);

                    // top plan node Actual Total Time is also in ms — convert to µs
                    let top_time_ms = root
                        .get("Plan")
                        .and_then(|p| p.get("Actual Total Time"))
                        .and_then(Value::as_f64)
                        .unwrap_or(0.0);
                    top_node_us.push(top_time_ms * 1000.0);
                }
            }
        }
    }

    let avg_planning_us: f64 = if planning_us.is_empty() {
        0.0
    } else {
        planning_us.iter().sum::<f64>() / planning_us.len() as f64
    };
    let avg_execution_us: f64 = if execution_us.is_empty() {
        0.0
    } else {
        execution_us.iter().sum::<f64>() / execution_us.len() as f64
    };
    let avg_top_us: f64 = if top_node_us.is_empty() {
        0.0
    } else {
        top_node_us.iter().sum::<f64>() / top_node_us.len() as f64
    };

    // clear, descriptive heading to show this is the EXPLAIN bench and units are µs
    println!(
        "=== EXPLAIN BENCH (db plan timings) === run_id={} data_type='{}' sampling_rate={} (units=µs)",
        run_id, data_type, sampling_rate
    );
    println!(
        "EXPLAIN agg ({} iters, warmup {}): avg_planning_us={:.3} avg_execution_us={:.3} avg_top_node_us={:.3}",
        iterations, warmup, avg_planning_us, avg_execution_us, avg_top_us
    );

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv().ok();
    let db_url = std::env::var("DATABASE_URL")?;
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url);
    let pool = Pool::builder().max_size(5).build(manager).await?;
    let mut conn = pool.get().await?;

    use scylla_server::schema::data::dsl::{data as data_table, runId};

    let run_ids: Vec<i32> = data_table
        .select(runId)
        .distinct()
        .order(runId.asc())
        .load(&mut conn)
        .await?;
    println!("Valid run ids: {:?}", run_ids);

    // config
    let iterations: usize = 1_000; // measurement iterations per method
    let warmup: usize = 5;
    let run_id = 2;
    let sampling_rate: usize = 10;
    let default_data_type = "MSB 2FBL 2FAccel".to_string();
    let alt_data_type = "BMS%2FSegment_Temp%2F1".to_string();

    // test both data types in a loop for readable output
    let data_types = vec![default_data_type, alt_data_type];

    for data_type in data_types.iter() {
        println!(
            "\n===== BENCHMARK for data_type='{}' (run_id={}) =====",
            data_type, run_id
        );

        // small explain collection
        let _ = explain_aggregate_raw_sql(&mut conn, sampling_rate as i32, run_id, data_type, 3, 1)
            .await?;

        // warm-up for diesel implementation
        for _ in 0..warmup {
            let _ = scylla_server::services::data_service::get_mean_downsampled_data_by_run_id(
                &mut conn,
                data_type,
                run_id,
                sampling_rate,
            )
            .await?;
        }

        // measurements for diesel implementation
        let mut durations_ms: Vec<u128> = Vec::with_capacity(iterations);
        for _ in 0..iterations {
            let start = Instant::now();
            let _res = scylla_server::services::data_service::get_mean_downsampled_data_by_run_id(
                &mut conn,
                data_type,
                run_id,
                sampling_rate,
            )
            .await?;
            durations_ms.push(start.elapsed().as_micros());
        }

        let sum: u128 = durations_ms.iter().sum();
        let avg = sum as f64 / durations_ms.len() as f64;
        let min = *durations_ms.iter().min().unwrap_or(&0);
        let max = *durations_ms.iter().max().unwrap_or(&0);

        println!(
            "DSL+Rust: run_id={} data_type='{}' iterations={} warmup={} avg_us={:.2} min_us={} max_us={}",
            run_id, data_type, iterations, warmup, avg, min, max
        );

        // warm-up for raw-sql implementation
        for _ in 0..warmup {
            let _ = scylla_server::services::data_service::get_mean_downsampled_data_by_run_id_raw_sql_query(
                &mut conn,
                data_type,
                run_id,
                sampling_rate,
            )
            .await?;
        }

        // measurements for raw sql implementation
        let mut durations_raw: Vec<u128> = Vec::with_capacity(iterations);
        for _ in 0..iterations {
            let start = Instant::now();
            let _res = scylla_server::services::data_service::get_mean_downsampled_data_by_run_id_raw_sql_query(
                &mut conn,
                data_type,
                run_id,
                sampling_rate,
            )
            .await?;
            durations_raw.push(start.elapsed().as_micros());
        }

        let sum_raw: u128 = durations_raw.iter().sum();
        let avg_raw = sum_raw as f64 / durations_raw.len() as f64;
        let min_raw = *durations_raw.iter().min().unwrap_or(&0);
        let max_raw = *durations_raw.iter().max().unwrap_or(&0);

        println!(
            "RAW SQL: run_id={} data_type='{}' iterations={} warmup={} avg_us={:.2} min_us={} max_us={}",
            run_id, data_type, iterations, warmup, avg_raw, min_raw, max_raw
        );

        // percent difference (raw vs dsl). positive => raw slower than DSL+Rust
        if avg > 0.0 {
            let pct_change = (avg_raw - avg) / avg * 100.0;
            println!(
                "COMPARISON: raw_vs_dsl avg change = {:+.2}% (raw {:.2}µs vs dsl {:.2}µs)",
                pct_change, avg_raw, avg
            );
        } else {
            println!(
                "COMPARISON: DSL avg is zero; cannot compute percent difference (dsl={:.2} raw={:.2})",
                avg, avg_raw
            );
        }

        println!("===== END BENCHMARK for data_type='{}' =====\n", data_type);
    }

    Ok(())
}
