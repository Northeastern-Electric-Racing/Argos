use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

pub async fn get_all_locations(db: Database) -> Result<Vec<prisma::location::Data>, QueryError> {
    db.location().find_many(vec![]).exec().await
}

pub async fn upsert_location(
    db: Database,
    name: String,
    latitude: f64,
    longitude: f64,
    radius: f64,
    run_id: i32,
) -> Result<prisma::location::Data, QueryError> {
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
