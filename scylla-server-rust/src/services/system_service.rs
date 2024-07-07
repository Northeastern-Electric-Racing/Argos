use prisma_client_rust::QueryError;

use crate::{
    prisma::{self},
    Database,
};

/// Upserts a datatype, either creating or updating one depending on its existence
/// * `db` - The prisma client to make the call to
/// * `data_type_name` - The data type name to upsert
/// * `unit` - The unit of the data
/// * `node_name` - The name of the node linked to the data type, must already exist!
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_systems(db: &Database) -> Result<Vec<prisma::system::Data>, QueryError> {
    db.system().find_many(vec![]).exec().await
}

/// Upserts a system, either creating or updating one depending on its existence
/// * `db` - The prisma client to make the call to
/// * `system_name` - The system name name to upsert
/// * `run_id` - The id of the run to link to the system, must already exist
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn upsert_system(
    db: &Database,
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
