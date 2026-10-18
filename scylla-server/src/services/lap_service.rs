use crate::{
    Database,
    lap_timing::{self, GPS_LOCATION_TOPIC, GeoPoint, GpsFix, Lap},
    services::{data_service, track_service},
};

/// How far before `since` fixes are loaded, so the fix before a crossing at `since` is included
const SINCE_MARGIN_MS: f64 = 5_000.0;

/// Gets the laps a run timed on a track, from the run's stored GPS fixes
/// * `db` - The database connection to use
/// * `run_id` - The run whose GPS fixes are timed
/// * `track_id` - The track whose lines time them
/// * `since_ms` - If given, only the laps starting at or after it, numbered from 1
///   returns: A result containing the laps (or None if no track has that id) or the `QueryError` propogated by the db
pub async fn get_laps(
    db: &mut Database<'_>,
    run_id: i32,
    track_id: i32,
    since_ms: Option<f64>,
) -> Result<Option<Vec<Lap>>, diesel::result::Error> {
    let Some(track) = track_service::get_track_by_id(db, track_id).await? else {
        return Ok(None);
    };
    let (start_line, finish_line) = track.lines();
    let Some(start_line) = start_line else {
        return Ok(Some(Vec::new()));
    };
    let mut locations = match since_ms {
        Some(since_ms) => {
            let earliest_us = ((since_ms - SINCE_MARGIN_MS) * 1000.0) as i64;
            data_service::get_data_by_run_id_since(db, GPS_LOCATION_TOPIC, run_id, earliest_us)
                .await?
        }
        None => data_service::get_data_by_run_id(db, GPS_LOCATION_TOPIC, run_id).await?,
    };
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

    let laps = lap_timing::laps(&fixes, start_line, finish_line);
    Ok(Some(match since_ms {
        Some(since_ms) => lap_timing::laps_since(laps, since_ms),
        None => laps,
    }))
}
