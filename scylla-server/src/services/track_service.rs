use crate::{
    Database,
    argos_schema::track::dsl::{
        finishALat, finishALon, finishBLat, finishBLon, id, name, startALat, startALon, startBLat,
        startBLon, track,
    },
    lap_timing::{LineKind, TimingLine},
    models::{Track, columns_from_line},
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

/// Replaces one line of an existing track, leaving the other as it is
/// * `db` - The database connection to use
/// * `track_id` - The id of the track to edit
/// * `kind` - Which line to replace
/// * `line` - The new line, or None to clear it
///   returns: A result containing the saved track (or None if no track has that id) or the `QueryError` propogated by the db
pub async fn edit_track_line(
    db: &mut Database<'_>,
    track_id: i32,
    kind: LineKind,
    line: Option<TimingLine>,
) -> Result<Option<Track>, diesel::result::Error> {
    let (a_lat, a_lon, b_lat, b_lon) = columns_from_line(line);
    let edit = diesel::update(track.find(track_id));
    let edited = match kind {
        LineKind::Start => {
            edit.set((
                startALat.eq(a_lat),
                startALon.eq(a_lon),
                startBLat.eq(b_lat),
                startBLon.eq(b_lon),
            ))
            .get_result(db)
            .await
        }
        LineKind::Finish => {
            edit.set((
                finishALat.eq(a_lat),
                finishALon.eq(a_lon),
                finishBLat.eq(b_lat),
                finishBLon.eq(b_lon),
            ))
            .get_result(db)
            .await
        }
    };
    edited.optional()
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
