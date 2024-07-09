use prisma_client_rust::serde_json;
use serde::Serialize;
use socketioxide::{extract::SocketRef, SocketIo};
use tokio::sync::mpsc::Receiver;

/// Represents the client data
#[derive(Serialize, Clone, Debug)]
pub struct ClientData {
    pub run_id: i32,
    pub name: String,
    pub unit: String,
    pub values: Vec<String>,
    pub timestamp: i64,
}

pub async fn handle_socket(io: SocketIo, mut channel: Receiver<ClientData>) {
    io.ns("/", |s: SocketRef| {
        s.on_disconnect(|_: SocketRef| println!("Socket: Client disconnected from socket"))
    });

    // await a new message to send to client
    while let Some(cmd) = channel.recv().await {
        match io.emit("message", serde_json::to_string(&cmd).unwrap()) {
            Ok(_) => (),
            Err(err) => println!("Socket: Broadcast error: {}", err),
        }
    }
}
