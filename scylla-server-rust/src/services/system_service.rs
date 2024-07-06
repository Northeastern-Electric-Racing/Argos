use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

pub async fn get_all_systems(db: Database) -> Result<Vec<prisma::system::Data>, QueryError> {
    db.system().find_many(vec![]).exec().await
}

pub async fn upsert_system(
    db: Database,
    system_name: String,
    run_id: i32,
) -> Result<prisma::system::Data, QueryError> {
    let system = db
        .system()
        .upsert(
            prisma::system::name::equals(system_name.clone()),
            prisma::system::create(system_name.clone(), vec![]),
            vec![],
        )
        .exec()
        .await?;

    db.run()
        .update(
            prisma::run::id::equals(run_id),
            vec![prisma::run::system::connect(prisma::system::name::equals(
                system_name,
            ))],
        )
        .exec()
        .await?;

    Ok(system)
}
