use crate::{Database, argos_schema::lap, models::NewLap};
use diesel_async::RunQueryDsl;

/// Saves laps
/// * `db` - The database connection to use
/// * `laps` - The laps to save
///   returns: A result containing how many laps were saved or the `QueryError` propogated by the db
pub async fn add_laps(
    db: &mut Database<'_>,
    laps: &[NewLap],
) -> Result<usize, diesel::result::Error> {
    diesel::insert_into(lap::table)
        .values(laps)
        .execute(db)
        .await
}
