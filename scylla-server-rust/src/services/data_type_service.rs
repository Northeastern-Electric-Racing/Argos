use prisma_client_rust::QueryError;

use crate::{prisma, Database};

pub async fn get_all_data_types(db: &Database) -> Result<Vec<prisma::data_type::Data>, QueryError> {
    db.data_type().find_many(vec![]).exec().await
}

pub async fn upsert_data_type(
    db: &Database,
    data_type_name: String,
    unit: String,
    node_name: String,
) -> Result<prisma::data_type::Data, QueryError> {
    db.data_type()
        .upsert(
            prisma::data_type::name::equals(data_type_name.clone()),
            prisma::data_type::create(
                data_type_name,
                unit.clone(),
                prisma::node::name::equals(node_name.clone()),
                vec![],
            ),
            vec![
                prisma::data_type::unit::set(unit),
                prisma::data_type::node_name::set(node_name),
            ],
        )
        .exec()
        .await
}
