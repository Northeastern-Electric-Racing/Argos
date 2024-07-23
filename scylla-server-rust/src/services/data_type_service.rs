use prisma_client_rust::QueryError;

use crate::{prisma, Database};

prisma::data_type::select! {public_datatype {
    name
    unit
}}

/// Gets all datatypes
/// * `db` - The prisma client to make the call to
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_data_types(db: &Database) -> Result<Vec<public_datatype::Data>, QueryError> {
    db.data_type()
        .find_many(vec![])
        .select(public_datatype::select())
        .exec()
        .await
}

/// Upserts a datatype, either creating or updating one depending on its existence
/// * `db` - The prisma client to make the call to
/// * `data_type_name` - The data type name to upsert
/// * `unit` - The unit of the data
/// * `node_name` - The name of the node linked to the data type, must already exist!
/// returns: A result containing the data or the QueryError propogated by the db
pub async fn upsert_data_type(
    db: &Database,
    data_type_name: String,
    unit: String,
    node_name: String,
) -> Result<public_datatype::Data, QueryError> {
    db.data_type()
        .upsert(
            prisma::data_type::name::equals(data_type_name.clone()),
            prisma::data_type::create(
                data_type_name.clone(),
                unit.clone(),
                prisma::node::name::equals(node_name.clone()),
                vec![],
            ),
            vec![
                prisma::data_type::unit::set(unit),
                prisma::data_type::name::set(data_type_name.clone()),
                prisma::data_type::node::connect(prisma::node::name::equals(node_name.clone())),
            ],
        )
        .select(public_datatype::select())
        .exec()
        .await
}
