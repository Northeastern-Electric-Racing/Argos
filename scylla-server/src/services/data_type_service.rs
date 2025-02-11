use crate::{models::DataType, schema::data_type::dsl::*, Database};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;

/// Gets all datatypes
/// * `d ` - The connection to the database
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn get_all_data_types(
    db: &mut Database<'_>,
) -> Result<Vec<DataType>, diesel::result::Error> {
    data_type.load(db).await
}

/// Upserts a datatype, either creating or updating one depending on its existence
/// * `db` - The database connection to use
/// * `data_type_name` - The data type name to upsert
/// * `unit` - The unit of the data
/// * `node_name` - The name of the node linked to the data type, must already exist!
///   returns: A result containing the data or the QueryError propogated by the db
pub async fn upsert_data_type(
    db: &mut Database<'_>,
    data_type_name: String,
    new_unit: String,
) -> Result<DataType, diesel::result::Error> {
    let val = DataType {
        name: data_type_name,
        unit: new_unit,
    };
    diesel::insert_into(data_type)
        .values(&val)
        .on_conflict(name)
        .do_update() // actually allows for the upsert ability
        .set(&val)
        .returning(DataType::as_returning())
        .get_result(db)
        .await
}
