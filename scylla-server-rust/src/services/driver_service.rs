use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

pub async fn get_all_drivers(db: Database) -> Result<Vec<prisma::driver::Data>, QueryError> {
    db.driver().find_many(vec![]).exec().await
}

pub async fn upsert_driver(
    db: Database,
    driver_name: String,
    run_id: i32,
) -> Result<prisma::driver::Data, QueryError> {
    let drive = db
        .driver()
        .upsert(
            prisma::driver::username::equals(driver_name.clone()),
            prisma::driver::create(driver_name.clone(), vec![]),
            vec![],
        )
        .exec()
        .await?;

    db.run()
        .update(
            prisma::run::id::equals(run_id),
            vec![prisma::run::driver::connect(
                prisma::driver::username::equals(driver_name),
            )],
        )
        .exec()
        .await?;

    Ok(drive)
}
