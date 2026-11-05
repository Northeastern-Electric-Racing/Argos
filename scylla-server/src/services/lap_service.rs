use crate::{
    Database,
    lap_timing::{self, GPS_LOCATION_TOPIC, GpsFix, Lap},
    models::Track,
    services::data_service,
};

/// Gets the laps a run timed on a track, from the run's stored GPS fixes
/// * `db` - The car database connection to use
/// * `run_id` - The run whose GPS fixes are timed
/// * `track` - The track whose lines time them
///   returns: A result containing the laps or the `QueryError` propogated by the db
pub async fn get_laps(
    db: &mut Database<'_>,
    run_id: i32,
    track: &Track,
) -> Result<Vec<Lap>, diesel::result::Error> {
    let (Some(start_line), finish_line) = track.lines() else {
        return Ok(Vec::new());
    };
    let mut fixes: Vec<GpsFix> = data_service::get_data_by_run_id(db, GPS_LOCATION_TOPIC, run_id)
        .await?
        .into_iter()
        .filter_map(|location| match location.values[..] {
            [Some(lat), Some(lon), ..] => Some(GpsFix::new(lat, lon, location.time)),
            _ => None,
        })
        .collect();
    fixes.sort_by(|left, right| left.time_ms.total_cmp(&right.time_ms));

    Ok(lap_timing::laps(&fixes, start_line, finish_line))
}
