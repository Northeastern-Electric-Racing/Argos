use prisma_client_rust::serde_json;
use socketioxide::{extract::SocketRef, SocketIo};
use tokio::sync::broadcast::Receiver;

use super::ClientData;

pub async fn handle_socket(io: SocketIo, mut channel: Receiver<ClientData>) {
    io.ns("/", |s: SocketRef| {
        s.on_disconnect(|_: SocketRef| println!("Socket: Client disconnected from socket"))
    });

    // await a new message to send to client
    while let Ok(cmd) = channel.recv().await {
        match io.emit("message", serde_json::to_string(&cmd).unwrap()) {
            Ok(_) => (),
            Err(err) => println!("Socket: Broadcast error: {}", err),
        }
    }
}
