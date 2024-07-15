use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

prisma::location::select! {public_location{
    name
    latitude
    longitude
    radius
    runs: select {
        id
        location_name
        driver_name
        system_name
        time
    }
}}

/// Gets all locations
/// * `db` - The prisma client to make the call to
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_locations(db: &Database) -> Result<Vec<public_location::Data>, QueryError> {
    db.location()
        .find_many(vec![])
        .select(public_location::select())
        .exec()
        .await
}

/// Upserts a location, either creating or updating one depending on its existence
/// * `db` - The prisma client to make the call to
/// * `name` - The name of the location to upsert
/// * `latitude` - The latitude of the location
/// * `longitude` - The longitude of the location
/// * `radius` - The radius of the locations bounds
/// * `run_id` - The run at the location, must already exist!
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn upsert_location(
    db: &Database,
    name: String,
    latitude: f64,
    longitude: f64,
    radius: f64,
    run_id: i32,
) -> Result<public_location::Data, QueryError> {
    let loc = db
        .location()
        .upsert(
            prisma::location::name::equals(name.clone()),
            prisma::location::create(name.clone(), latitude, longitude, radius, vec![]),
            vec![
                prisma::location::latitude::set(latitude),
                prisma::location::longitude::set(longitude),
                prisma::location::radius::set(radius),
            ],
        )
        .select(public_location::select())
        .exec()
        .await?;

    db.run()
        .update(
            prisma::run::id::equals(run_id),
            vec![prisma::run::location::connect(
                prisma::location::name::equals(name),
            )],
        )
        .exec()
        .await?;

    Ok(loc)
}
