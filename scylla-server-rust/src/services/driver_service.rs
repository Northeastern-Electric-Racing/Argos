use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

prisma::driver::select! { public_driver{
    username
    runs: select {
        id
        location_name
        driver_name
        system_name
        time
    }
}}

/// Gets all drivers
/// * `db` - The prisma client to make the call to
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_drivers(db: &Database) -> Result<Vec<public_driver::Data>, QueryError> {
    db.driver()
        .find_many(vec![])
        .select(public_driver::select())
        .exec()
        .await
}

/// Upserts a driver, either creating or updating one depending on its existence
/// * `db` - The prisma client to make the call to
/// * `driver_name` - The name of the driver to upsert
/// * `run_id` - The id of the run to link to the driver, must already exist!
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn upsert_driver(
    db: &Database,
    driver_name: String,
    run_id: i32,
) -> Result<public_driver::Data, QueryError> {
    let drive = db
        .driver()
        .upsert(
            prisma::driver::username::equals(driver_name.clone()),
            prisma::driver::create(driver_name.clone(), vec![]),
            vec![],
        )
        .select(public_driver::select())
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
