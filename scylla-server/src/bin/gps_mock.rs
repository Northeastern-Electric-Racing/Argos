use std::{
    f64::consts::{PI, TAU},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use clap::Parser;
use protobuf::Message;
use rumqttc::v5::{AsyncClient, MqttOptions, mqttbytes::QoS};
use scylla_server::{
    lap_timing::{GPS_LOCATION_TOPIC, METRES_PER_DEGREE},
    proto::serverdata::ServerData,
};

const COURSE_ORIGIN_LAT: f64 = 42.3398;
const COURSE_ORIGIN_LON: f64 = -71.0892;
const LOOP_LENGTH_M: f64 = 300.0;
const LOOP_LAPS: u32 = 3;
const STRAIGHT_LENGTH_M: f64 = 75.0;
const U_TURN_RADIUS_M: f64 = 5.0;
const SPEED_M_PER_S: f64 = 15.0;
const PUBLISH_PERIOD: Duration = Duration::from_millis(100);

/// Publishes mock `TPU/GPS/Location` fixes: loop laps, then a straight out and back
#[derive(Parser, Debug)]
struct GpsMockArgs {
    /// The host url of the siren, including port and excluding protocol prefix
    #[arg(short = 'u', long, env = "SCYLLA_SIREN_HOST_URL")]
    siren_host_url: String,
}

/// Metres east and north of the origin after `distance_m`; continuous, so every lap starts at the origin
fn course_position_m(distance_m: f64) -> (f64, f64) {
    let loops_length_m = f64::from(LOOP_LAPS) * LOOP_LENGTH_M;
    let u_turn_length_m = PI * U_TURN_RADIUS_M;
    let cycle_length_m = loops_length_m + 2.0 * (STRAIGHT_LENGTH_M + u_turn_length_m);
    let along_m = distance_m % cycle_length_m;
    if along_m < loops_length_m {
        let radius_m = LOOP_LENGTH_M / TAU;
        let angle = along_m / radius_m;
        return (radius_m * angle.sin(), radius_m * (1.0 - angle.cos()));
    }

    let out_m = along_m - loops_length_m;
    if out_m < STRAIGHT_LENGTH_M {
        (out_m, 0.0)
    } else if out_m < STRAIGHT_LENGTH_M + u_turn_length_m {
        let angle = (out_m - STRAIGHT_LENGTH_M) / U_TURN_RADIUS_M;
        (
            STRAIGHT_LENGTH_M + U_TURN_RADIUS_M * angle.sin(),
            U_TURN_RADIUS_M * angle.cos() - U_TURN_RADIUS_M,
        )
    } else if out_m < 2.0 * STRAIGHT_LENGTH_M + u_turn_length_m {
        (
            2.0 * STRAIGHT_LENGTH_M + u_turn_length_m - out_m,
            -2.0 * U_TURN_RADIUS_M,
        )
    } else {
        let angle = (out_m - 2.0 * STRAIGHT_LENGTH_M - u_turn_length_m) / U_TURN_RADIUS_M;
        (
            -U_TURN_RADIUS_M * angle.sin(),
            -U_TURN_RADIUS_M - U_TURN_RADIUS_M * angle.cos(),
        )
    }
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
    let (host, port) = args
        .siren_host_url
        .split_once(':')
        .expect("Siren URL must be host:port");
    let mut options = MqttOptions::new(
        "GpsMock",
        host,
        port.parse::<u16>().expect("Invalid Siren port"),
    );
    options.set_keep_alive(Duration::from_secs(20));
    let (client, mut eventloop) = AsyncClient::new(options, 10);
    tokio::spawn(async move {
        loop {
            if let Err(error) = eventloop.poll().await {
                eprintln!("MQTT connection error: {error}");
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        }
    });

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
        if let Err(error) = client
            .publish(GPS_LOCATION_TOPIC, QoS::AtMostOnce, false, payload)
            .await
        {
            eprintln!("Could not publish GPS fix: {error}");
        }
    }
}
