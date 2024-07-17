use std::time::Duration;

use prisma_client_rust::{chrono, serde_json};
use rand::Rng;
use socketioxide::SocketIo;
use tracing::warn;

use super::ClientData;

#[derive(Clone, Copy)]
struct MockData {
    name: &'static str,
    unit: &'static str,
    num_of_vals: u8,
    min: f64,
    max: f64,
}

impl MockData {
    fn get_values(&self) -> Vec<String> {
        let mut val_vec: Vec<String> = vec![];
        // for each point, get a random number in the range
        for _ in 0..self.num_of_vals {
            val_vec.push(
                rand::thread_rng()
                    .gen_range((self.min)..(self.max))
                    .to_string(),
            );
        }

        val_vec
    }
}

const BASE_MOCK_DATA: [MockData; 17] = [
    MockData {
        name: "Status-Temp_Average",
        unit: "C",
        num_of_vals: 1,
        min: -20.0,
        max: 54.0,
    },
    MockData {
        name: "Temps-Motor_Temperature",
        unit: "C",
        num_of_vals: 1,
        min: -20.0,
        max: 54.0,
    },
    MockData {
        name: "Pack-SOC",
        unit: "%",
        num_of_vals: 1,
        min: 0.0,
        max: 100.0,
    },
    MockData {
        name: "Sense-Accel",
        unit: "G",
        num_of_vals: 3,
        min: -6.0,
        max: 6.0,
    },
    MockData {
        name: "GPS-Location",
        unit: "coordinates",
        num_of_vals: 2,
        min: -90.0,
        max: 90.0,
    },
    MockData {
        name: "Sense-SteeringAngle",
        unit: "degrees",
        num_of_vals: 1,
        min: 0.0,
        max: 360.0,
    },
    MockData {
        name: "Pack-Voltage",
        unit: "V",
        num_of_vals: 1,
        min: 0.0,
        max: 5.0,
    },
    MockData {
        name: "OnBoard-CpuUsage",
        unit: "%",
        num_of_vals: 1,
        min: 0.0,
        max: 100.0,
    },
    MockData {
        name: "OnBoard-CpuTemp",
        unit: "C",
        num_of_vals: 1,
        min: 0.0,
        max: 100.0,
    },
    MockData {
        name: "OnBoard-MemAvailable",
        unit: "mb",
        num_of_vals: 1,
        min: 0.0,
        max: 8000.0,
    },
    MockData {
        name: "HaLow-RSSI",
        unit: "dbm",
        num_of_vals: 1,
        min: -150.0,
        max: 80.0,
    },
    MockData {
        name: "HaLow-StaMCS",
        unit: "",
        num_of_vals: 1,
        min: 0.0,
        max: 10.0,
    },
    MockData {
        name: "Status/MPH",
        unit: "mph",
        num_of_vals: 1,
        min: 0.0,
        max: 88.0,
    },
    MockData {
        name: "Pack-CCL",
        unit: "A",
        num_of_vals: 1,
        min: -35.0,
        max: 0.0,
    },
    MockData {
        name: "Pack-DCL",
        unit: "A",
        num_of_vals: 1,
        min: 0.0,
        max: 550.0,
    },
    MockData {
        name: "Pedals-Brake1",
        unit: "",
        num_of_vals: 1,
        min: 0.0,
        max: 3000.0,
    },
    MockData {
        name: "Power-AC_Current",
        unit: "A",
        num_of_vals: 1,
        min: 0.0,
        max: 600.0,
    },
];

#[derive(Clone, Copy)]
struct MockStringData {
    name: &'static str,
    unit: &'static str,
    vals: &'static str,
}

const BASE_MOCK_STRING_DATA: [MockStringData; 2] = [
    MockStringData {
        name: "Driver",
        unit: "String",
        vals: "Fergus",
    },
    MockStringData {
        name: "Location",
        unit: "String",
        vals: "Max",
    },
];

pub struct MockReciever {
    curr_run: i32,
    io: SocketIo,
}

impl MockReciever {
    pub fn new(io: SocketIo) -> Self {
        MockReciever { curr_run: 1, io }
    }

    pub async fn generate_mock(self) {
        loop {
            // get a random mock datapoint the first 0 to len of number mock data is for the non string and x to len of string mocks is a string mock index.
            let index = rand::thread_rng()
                .gen_range(0..(BASE_MOCK_DATA.len() + BASE_MOCK_STRING_DATA.len()));

            // if we are doing non-string mock this loop
            let client_data: ClientData = if index < BASE_MOCK_DATA.len() {
                let dat = BASE_MOCK_DATA[index];

                ClientData {
                    run_id: self.curr_run,
                    name: dat.name.to_string(),
                    unit: dat.unit.to_string(),
                    values: dat.get_values(),
                    timestamp: chrono::offset::Utc::now().timestamp_millis(),
                    node: "".to_string(), // uneeded for socket use only
                }
            // do a string mock
            } else {
                let dat = BASE_MOCK_STRING_DATA[index - BASE_MOCK_DATA.len()];
                ClientData {
                    run_id: self.curr_run,
                    name: dat.name.to_string(),
                    unit: dat.unit.to_string(),
                    values: vec![dat.vals.to_string()],
                    timestamp: chrono::offset::Utc::now().timestamp_millis(),
                    node: "".to_string(), // uneeded for socket use only
                }
            };

            match self.io.emit(
                "message",
                serde_json::to_string(&client_data).expect("Could not serialize ClientData"),
            ) {
                Ok(_) => (),
                Err(err) => warn!("Socket: Broadcast error: {}", err),
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }
}
