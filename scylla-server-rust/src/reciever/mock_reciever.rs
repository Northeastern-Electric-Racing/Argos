// use std::time::Duration;

// use prisma_client_rust::chrono::{self};
// use tokio::sync::mpsc::Sender;

// use super::ClientData;

// pub async fn recieve_mock(channel: Sender<ClientData>) {
//     loop {
//         tokio::time::sleep(Duration::from_millis(300)).await;
//         let a = channel
//             .send(ClientData {
//                 run_id: 0,
//                 name: "Acceleration".to_owned(),
//                 unit: "abc".to_owned(),
//                 values: vec!["1".to_owned()],
//                 timestamp: chrono::offset::Utc::now().timestamp_millis(),
//                 node: "ABC".to_string(),
//             })
//             .await;
//     }
// }
