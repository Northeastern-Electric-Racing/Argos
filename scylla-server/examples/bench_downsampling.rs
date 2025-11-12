use diesel::{ExpressionMethods, QueryDsl};
use diesel_async::{
    pooled_connection::{bb8::Pool, AsyncDieselConnectionManager},
    AsyncPgConnection, RunQueryDsl,
};
use dotenvy::dotenv;
use futures::{
    stream::{self, StreamExt},
    TryStreamExt,
};
use indicatif::{ProgressBar, ProgressStyle};
use scylla_server::services::data_service;
use std::{
    error::Error,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::{Instant, SystemTime},
};
use tokio::time::{timeout, Duration};
use tokio::{fs, io::AsyncWriteExt, sync::mpsc};

type AsyncError = Box<dyn Error + Send + Sync>;

#[tokio::main]
async fn main() -> Result<(), AsyncError> {
    dotenv().ok();
    let db_url = std::env::var("DATABASE_URL")?;
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url);
    // size the pool to match concurrency so tasks don't wait for connections
    let concurrency: usize = 4;
    let pool = Pool::builder().max_size(8 as u32).build(manager).await?;
    let mut conn = pool.get().await?;

    use scylla_server::schema::data::dsl::data as data_table;

    let data_types: Vec<String> = data_table
        .select(scylla_server::schema::data::dsl::dataTypeName)
        .distinct()
        .order(scylla_server::schema::data::dsl::dataTypeName.asc())
        .load(&mut conn)
        .await?;

    // Config for benchmark
    let iterations: usize = 30;
    let warmup: usize = 5;
    let run_id = 1;

    // Prepare out for CSV
    let ts = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs();
    let out_dir = "files";
    fs::create_dir_all(out_dir).await?;
    let csv_path = format!("{}/bench_downsampling_{}.csv", out_dir, ts);

    // helper: stddev
    fn std_dev_ms(samples: &Vec<u128>) -> f64 {
        let n = samples.len();
        if n == 0 {
            return 0.0;
        }
        let mean = samples.iter().sum::<u128>() as f64 / n as f64;
        let var = samples
            .iter()
            .map(|v| {
                let x = *v as f64;
                let d = x - mean;
                d * d
            })
            .sum::<f64>()
            / (n as f64);
        var.sqrt()
    }

    // helper: CSV escape for simple cases
    fn csv_escape(s: &str) -> String {
        let s = s.replace('"', "\"\"");
        format!("\"{}\"", s)
    }

    let total = data_types.len();
    let completed = Arc::new(AtomicUsize::new(0));

    // channel to stream rows to writer task (bigger buffer)
    let (tx, mut rx) = mpsc::channel::<String>(1024);

    // progress bar (shared)
    let pb = ProgressBar::new(total as u64);
    pb.set_style(
        ProgressStyle::with_template(
            "{spinner:.green} [{elapsed_precise}] [{wide_bar:.cyan/blue}] {pos}/{len} {msg}",
        )
        .unwrap()
        .progress_chars("#>-"),
    );
    pb.set_message("starting");
    let pb_shared = pb.clone();

    // spawn writer task: write metadata + header, then append rows as they arrive
    let csv_path_clone = csv_path.clone();
    let writer_handle = tokio::spawn(async move {
        let mut file = tokio::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&csv_path_clone)
            .await
            .map_err(|e| -> AsyncError { Box::new(e) })?;

        // write metadata + header
        let meta = format!(
            "metadata,started_at_unix,{}\nmetadata,iterations,{}\nmetadata,warmup,{}\nmetadata,run_id,{}\n\n",
            ts, iterations, warmup, run_id
        );
        file.write_all(meta.as_bytes())
            .await
            .map_err(|e| Box::new(e) as AsyncError)?;
        let header = [
            "data_type",
            "num_datapoints",
            "sampling_rate",
            "dsl_avg_ms",
            "dsl_min_ms",
            "dsl_max_ms",
            "dsl_stddev_ms",
            "raw_avg_ms",
            "raw_min_ms",
            "raw_max_ms",
            "raw_stddev_ms",
        ]
        .join(",");
        file.write_all(format!("{}\n", header).as_bytes())
            .await
            .map_err(|e| Box::new(e) as AsyncError)?;

        // receive rows and append immediately, flush every FLUSH_EVERY rows
        const FLUSH_EVERY: usize = 16;
        let mut pending: usize = 0usize;
        while let Some(row) = rx.recv().await {
            file.write_all(row.as_bytes())
                .await
                .map_err(|e| Box::new(e) as AsyncError)?;
            file.write_all(b"\n")
                .await
                .map_err(|e| Box::new(e) as AsyncError)?;
            pending += 1;
            if pending >= FLUSH_EVERY {
                file.flush().await.map_err(|e| Box::new(e) as AsyncError)?;
                pending = 0;
            }
        }
        // final flush
        if pending > 0 {
            file.flush().await.map_err(|e| Box::new(e) as AsyncError)?;
        }
        Ok::<(), AsyncError>(())
    });

    // producers: run benchmarks concurrently, send rows as they complete
    let tx_producer = tx.clone();
    let pool_for_tasks = pool.clone();
    let completed_for_tasks = completed.clone();

    let per_type_timeout = Duration::from_secs(600);

    let producers = stream::iter(data_types.into_iter()).map(|data_type| {
        let pool = pool_for_tasks.clone();
        let tx = tx_producer.clone();
        let completed = completed_for_tasks.clone();
        let data_type_owned = data_type.clone();
        let pb = pb_shared.clone();
        async move {
            // update progress message so we can see which type is currently running
            pb.set_message(format!("running {}", data_type_owned));

            // wrap the whole per-type work in a timeout so a stuck DB call doesn't hang forever
            let task = async {
                let mut conn = pool.get().await?;
                let num_datapoints =
                    data_service::get_data_point_count(&mut conn, &data_type_owned, run_id).await?;
                let sampling_rate =
                    data_service::calculate_auto_sampling_rate(num_datapoints) as usize;

                // warm-up for diesel implementation
                for _ in 0..warmup {
                    data_service::get_mean_downsampled_data_by_run_id(
                        &mut conn,
                        &data_type_owned,
                        run_id,
                        sampling_rate,
                    )
                    .await?;
                }

                // measurements for diesel implementation
                let mut durations_dsl: Vec<u128> = Vec::with_capacity(iterations);
                for _ in 0..iterations {
                    let start = Instant::now();
                    data_service::get_mean_downsampled_data_by_run_id(
                        &mut conn,
                        &data_type_owned,
                        run_id,
                        sampling_rate,
                    )
                    .await?;
                    durations_dsl.push(start.elapsed().as_millis());
                }

                let sum: u128 = durations_dsl.iter().sum();
                let avg = if durations_dsl.is_empty() {
                    0.0
                } else {
                    sum as f64 / durations_dsl.len() as f64
                };
                let min = *durations_dsl.iter().min().unwrap_or(&0);
                let max = *durations_dsl.iter().max().unwrap_or(&0);
                let stddev = std_dev_ms(&durations_dsl);

                // warm-up for raw-sql implementation
                for _ in 0..warmup {
                    data_service::get_mean_downsampled_data_by_run_id_raw(
                        &mut conn,
                        &data_type_owned,
                        run_id,
                        sampling_rate,
                    )
                    .await?;
                }

                // measurements for raw sql implementation
                let mut durations_raw: Vec<u128> = Vec::with_capacity(iterations);
                for _ in 0..iterations {
                    let start = Instant::now();
                    data_service::get_mean_downsampled_data_by_run_id_raw(
                        &mut conn,
                        &data_type_owned,
                        run_id,
                        sampling_rate,
                    )
                    .await?;
                    durations_raw.push(start.elapsed().as_millis());
                }

                let sum_raw: u128 = durations_raw.iter().sum();
                let avg_raw = if durations_raw.is_empty() {
                    0.0
                } else {
                    sum_raw as f64 / durations_raw.len() as f64
                };
                let min_raw = *durations_raw.iter().min().unwrap_or(&0);
                let max_raw = *durations_raw.iter().max().unwrap_or(&0);
                let stddev_raw = std_dev_ms(&durations_raw);

                let row = vec![
                    csv_escape(&data_type_owned),
                    num_datapoints.to_string(),
                    sampling_rate.to_string(),
                    format!("{:.3}", avg),
                    format!("{}", min),
                    format!("{}", max),
                    format!("{:.3}", stddev),
                    format!("{:.3}", avg_raw),
                    format!("{}", min_raw),
                    format!("{}", max_raw),
                    format!("{:.3}", stddev_raw),
                ]
                .join(",");

                // send row to writer; if receiver closed, propagate error
                tx.send(row).await.map_err(|e| {
                    let err: AsyncError = Box::new(std::io::Error::new(
                        std::io::ErrorKind::BrokenPipe,
                        format!("writer closed: {}", e),
                    ));
                    err
                })?;

                // progress
                let _done = completed.fetch_add(1, Ordering::SeqCst) + 1;
                pb.inc(1);

                Ok::<(), AsyncError>(())
            };

            match timeout(per_type_timeout, task).await {
                Ok(Ok(())) => Ok(()),
                Ok(Err(e)) => Err(e),
                Err(_) => {
                    // show immediate, human-friendly message while still returning the error
                    pb.println(format!(
                        "Timed out: '{}' after {:?}",
                        data_type_owned, per_type_timeout
                    ));
                    Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::TimedOut,
                        format!(
                            "benchmark for '{}' timed out after {:?}",
                            data_type_owned, per_type_timeout
                        ),
                    )) as AsyncError)
                }
            }
        }
    });

    // run producers; if any producer errors, abort writer and return the error
    let producers_result = producers
        .buffer_unordered(concurrency)
        .try_collect::<Vec<()>>() // will short-circuit on first Err
        .await;

    if let Err(e) = producers_result {
        // abort writer, clear progress and print full error/debug chain so we can see context
        writer_handle.abort();
        pb.finish_and_clear();
        eprintln!("producers error (Display): {}", e);
        eprintln!("producers error (Debug): {:#?}", e);
        // print source chain (if any)
        let mut src = e.source();
        while let Some(s) = src {
            eprintln!("caused by: {}", s);
            src = s.source();
        }
        return Err(e);
    }

    // all producers finished successfully -> close sender so writer finishes
    pb.finish_with_message("complete");
    drop(tx); // original tx clone
    drop(tx_producer); // ensure all tx clones dropped

    // wait for writer to finish writing remaining rows
    let writer_res = writer_handle.await;
    match writer_res {
        Ok(Ok(())) => {
            println!("Benchmarks written to {}", csv_path);
            Ok(())
        }
        Ok(Err(e)) => Err(e),
        Err(join_err) => Err(Box::new(join_err)),
    }
}
