use scylla_server::{services::run_service, transformers::run_transformer::PublicRun};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

#[tokio::test]
async fn test_get_all_runs() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // ensure runs is empty
    assert!(run_service::get_all_runs(&mut db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_get_run_by_id() -> Result<(), diesel::result::Error> {
    let pool = cleanup_and_prepare().await.unwrap();
    let mut db = pool.get().await.unwrap();

    // add a run
    let run_c =
        run_service::create_run(&mut db, chrono::DateTime::from_timestamp_millis(1).unwrap())
            .await?;

    // get that run
    let run = run_service::get_run_by_id(&mut db, run_c.runId)
        .await?
        .expect("Run should exist was upserted ");

    assert_eq!(PublicRun::from(run_c), PublicRun::from(run));

    Ok(())
}
