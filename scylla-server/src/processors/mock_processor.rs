use std::time::Duration;

use rand::Rng;
use socketioxide::SocketIo;
use tracing::warn;

use super::{mock_data::BASE_MOCK_DATA, ClientData};

#[derive(Clone, Copy)]
pub struct MockData {
    pub name: &'static str,
    pub unit: &'static str,
    pub num_of_vals: u8,
    pub min: f32,
    pub max: f32,
}

impl MockData {
    fn get_values(&self) -> Vec<f32> {
        let mut val_vec: Vec<f32> = vec![];
        // for each point, get a random number in the range
        for _ in 0..self.num_of_vals {
            val_vec.push(rand::thread_rng().gen_range((self.min)..(self.max)));
        }

        val_vec
    }
}

pub struct MockProcessor {
    curr_run: i32,
    io: SocketIo,
}

impl MockProcessor {
    pub fn new(io: SocketIo) -> Self {
        MockProcessor { curr_run: 1, io }
    }

    pub async fn generate_mock(self) {
        loop {
            // get a random mock datapoint the first 0 to len of number mock data
            let index = rand::thread_rng().gen_range(0..(BASE_MOCK_DATA.len()));

            let dat = BASE_MOCK_DATA[index];

            let client_data: ClientData = ClientData {
                run_id: self.curr_run,
                name: dat.name.to_string(),
                unit: dat.unit.to_string(),
                values: dat.get_values(),
                timestamp: chrono::offset::Utc::now(),
                node: "".to_string(), // uneeded for socket use only
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
