use std::{
    f64::consts::TAU,
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use clap::Parser;
use protobuf::Message;
use scylla_server::{
    lap_timing::{GPS_LOCATION_TOPIC, METRES_PER_DEGREE},
    proto::serverdata::ServerData,
};

const COURSE_ORIGIN_LAT: f64 = 42.3398;
const COURSE_ORIGIN_LON: f64 = -71.0892;
const LOOP_LENGTH_M: f64 = 300.0;
const SPEED_M_PER_S: f64 = 15.0;
const PUBLISH_PERIOD: Duration = Duration::from_millis(100);

/// Publishes mock `TPU/GPS/Location` fixes driving laps of a circular loop
#[derive(Parser, Debug)]
struct GpsMockArgs {
    /// Zenoh conf file
    #[arg(long, env = "SCYLLA_ZENOH_CONF", default_value_os = "./zenoh.json5")]
    zenoh_conf: PathBuf,
}

/// Metres east and north of the origin after `distance_m`; every lap starts at the origin
fn course_position_m(distance_m: f64) -> (f64, f64) {
    let radius_m = LOOP_LENGTH_M / TAU;
    let angle = distance_m / radius_m;
    (radius_m * angle.sin(), radius_m * (1.0 - angle.cos()))
}

fn location(east_m: f64, north_m: f64, time_us: u64) -> ServerData {
    let lat = COURSE_ORIGIN_LAT + north_m / METRES_PER_DEGREE;
    let lon =
        COURSE_ORIGIN_LON + east_m / (METRES_PER_DEGREE * COURSE_ORIGIN_LAT.to_radians().cos());
    ServerData {
        unit: "coordinate".to_owned(),
        values: vec![lat as f32, lon as f32],
        time_us,
        ..ServerData::default()
    }
}

#[tokio::main]
async fn main() {
    let args = GpsMockArgs::parse();
    let session =
        zenoh::open(zenoh::Config::from_file(&args.zenoh_conf).expect("Could not read Zenoh conf"))
            .await
            .expect("Could not open Zenoh session");

    let step_m = SPEED_M_PER_S * PUBLISH_PERIOD.as_secs_f64();
    let mut ticker = tokio::time::interval(PUBLISH_PERIOD);
    for step in 0_u64.. {
        ticker.tick().await;
        let (east_m, north_m) = course_position_m(step as f64 * step_m);
        let time_us = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_micros() as u64;
        let payload = location(east_m, north_m, time_us)
            .write_to_bytes()
            .expect("ServerData always encodes");
        if let Err(error) = session.put(GPS_LOCATION_TOPIC, payload).await {
            eprintln!("Could not publish GPS fix: {error}");
        }
    }
}
