use crate::{
    Database,
    lap_timing::{self, GPS_LOCATION_TOPIC, GeoPoint, GpsFix, Lap},
    models::Track,
    services::data_service,
};

/// Gets the laps a run timed on a track, from the run's stored GPS fixes
/// * `db` - The car database connection to use
/// * `run_id` - The run whose GPS fixes are timed
/// * `track` - The track whose lines time them
/// * `since_ms` - Only the laps starting at or after it, every lap if 0
///   returns: A result containing the laps or the `QueryError` propogated by the db
pub async fn get_laps(
    db: &mut Database<'_>,
    run_id: i32,
    track: &Track,
    since_ms: f64,
) -> Result<Vec<Lap>, diesel::result::Error> {
    let (start_line, finish_line) = track.lines();
    let Some(start_line) = start_line else {
        return Ok(Vec::new());
    };
    // the fix before `since` is needed to time a crossing just after it
    let earliest_us = data_service::get_last_time_before(
        db,
        GPS_LOCATION_TOPIC,
        run_id,
        (since_ms * 1000.0) as i64,
    )
    .await?
    .unwrap_or(i64::MIN);
    let mut locations =
        data_service::get_data_by_run_id_since(db, GPS_LOCATION_TOPIC, run_id, earliest_us).await?;
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

    let mut laps = lap_timing::laps(&fixes, start_line, finish_line);
    laps.retain(|lap| lap.start_ms >= since_ms);
    Ok(laps)
}
