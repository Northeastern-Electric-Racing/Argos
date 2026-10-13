use crate::{
    Database,
    models::{Track, TrackLines},
    schema::track::dsl::{id, name, track},
};
use diesel::prelude::*;
use diesel_async::RunQueryDsl;

/// Gets all tracks ordered by id
/// * `db` - The database connection to use
///   returns: A result containing the tracks or the `QueryError` propogated by the db
pub async fn get_all_tracks(db: &mut Database<'_>) -> Result<Vec<Track>, diesel::result::Error> {
    track.order(id.asc()).get_results(db).await
}

/// Gets a single track by its id
/// * `db` - The database connection to use
/// * `track_id` - The id of the track to search for
///   returns: A result containing the track (or None if no track has that id) or the `QueryError` propogated by the db
pub async fn get_track_by_id(
    db: &mut Database<'_>,
    track_id: i32,
) -> Result<Option<Track>, diesel::result::Error> {
    track.find(track_id).first(db).await.optional()
}

/// Adds a track with a new id and no lines
/// * `db` - The database connection to use
/// * `track_name` - The name of the track to add
///   returns: A result containing the saved track or the `QueryError` propogated by the db
pub async fn add_track(
    db: &mut Database<'_>,
    track_name: String,
) -> Result<Track, diesel::result::Error> {
    diesel::insert_into(track)
        .values(name.eq(track_name))
        .get_result(db)
        .await
}

/// Replaces both lines of an existing track
/// * `db` - The database connection to use
/// * `track_id` - The id of the track to edit
/// * `lines` - The new lines of the track
///   returns: A result containing the saved track (or None if no track has that id) or the `QueryError` propogated by the db
pub async fn edit_track(
    db: &mut Database<'_>,
    track_id: i32,
    lines: TrackLines,
) -> Result<Option<Track>, diesel::result::Error> {
    diesel::update(track.find(track_id))
        .set(lines)
        .get_result(db)
        .await
        .optional()
}

/// Deletes a track
/// * `db` - The database connection to use
/// * `track_id` - The id of the track to delete
///   returns: A result containing whether a track was deleted or the `QueryError` propogated by the db
pub async fn delete_track(
    db: &mut Database<'_>,
    track_id: i32,
) -> Result<bool, diesel::result::Error> {
    diesel::delete(track.find(track_id))
        .execute(db)
        .await
        .map(|deleted| deleted > 0)
}
