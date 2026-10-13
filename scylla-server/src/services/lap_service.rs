use crate::{
    Database,
    lap_timing::{self, GPS_LOCATION_TOPIC, GeoPoint, GpsFix, Lap},
    services::{data_service, track_service},
};

/// Gets the laps a run timed on a track, from the run's stored GPS fixes
/// * `db` - The database connection to use
/// * `run_id` - The run whose GPS fixes are timed
/// * `track_id` - The track whose lines time them
///   returns: A result containing the laps (or None if no track has that id) or the `QueryError` propogated by the db
pub async fn get_laps(
    db: &mut Database<'_>,
    run_id: i32,
    track_id: i32,
) -> Result<Option<Vec<Lap>>, diesel::result::Error> {
    let Some(track) = track_service::get_track_by_id(db, track_id).await? else {
        return Ok(None);
    };
    let (start_line, finish_line) = track.lines();
    let Some(start_line) = start_line else {
        return Ok(Some(Vec::new()));
    };
    let mut locations = data_service::get_data_by_run_id(db, GPS_LOCATION_TOPIC, run_id).await?;
    locations.sort_by_key(|location| location.time);

    let fixes: Vec<GpsFix> = locations
        .into_iter()
        .filter_map(|location| match location.values[..] {
            [Some(lat), Some(lon), ..] => Some(GpsFix {
                point: GeoPoint {
                    lat: f64::from(lat),
                    lon: f64::from(lon),
                },
                time_ms: location.time as f64 / 1000.0,
            }),
            _ => None,
        })
        .collect();

    Ok(Some(lap_timing::laps(&fixes, start_line, finish_line)))
}
