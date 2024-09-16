use prisma_client_rust::QueryError;
use scylla_server::{services::run_service, transformers::run_transformer::PublicRun};
use test_utils::cleanup_and_prepare;

#[path = "test_utils.rs"]
mod test_utils;

#[tokio::test]
async fn test_get_all_runs() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // ensure runs is empty
    assert!(run_service::get_all_runs(&db).await?.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_get_run_by_id() -> Result<(), QueryError> {
    let db = cleanup_and_prepare().await?;

    // add a run
    let run_c = run_service::create_run(&db, 1).await?;

    // get that run
    let run = run_service::get_run_by_id(&db, run_c.id)
        .await?
        .expect("Run should exist was upserted ");

    assert_eq!(PublicRun::from(&run_c), PublicRun::from(&run));

    Ok(())
}
