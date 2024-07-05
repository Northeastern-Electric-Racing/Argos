use crate::{prisma, Database};

pub async fn get_data(
    db: Database,
    data_type_name: String,
    run_id: i32,
) -> Vec<prisma::data::Data> {
    db.data()
        .find_many(vec![
            prisma::data::data_type_name::equals(data_type_name),
            prisma::data::run_id::equals(run_id),
        ])
        .exec()
        .await
        .unwrap()
}
