use core::fmt;
use std::time::Duration;

use prisma_client_rust::{chrono, QueryError};
use protobuf::Message;
use tokio::sync::mpsc::Sender;

use crate::{
    serverdata,
    services::{data_service, data_type_service, node_service, run_service},
    Database,
};

use super::socket_handler::ClientData;
use paho_mqtt::MQTT_VERSION_5;

pub struct MqttReciever {
    channel: Sender<ClientData>,
    client: paho_mqtt::AsyncClient,
    recv_stream: paho_mqtt::AsyncReceiver<Option<paho_mqtt::Message>>,
    database: Database,
    current_run: i32,
}

impl MqttReciever {
    /// Creates a new mqtt reciever
    /// * `channel` - The mpsc channel to send the socket.io data to
    /// * `mqtt_path` - The mqtt URI (without the mqtt://) to subscribe to
    /// * `db` - The database to store the data in
    pub async fn new(channel: Sender<ClientData>, mqtt_path: &str, db: Database) -> MqttReciever {
        // create the mqtt client and configure it
        let create_opts = paho_mqtt::CreateOptionsBuilder::new()
            .server_uri(format!("mqtt://{}", mqtt_path))
            .client_id("ScyllaServer")
            .finalize();

        let mut client =
            paho_mqtt::AsyncClient::new(create_opts).expect("Could not create MQTT client!");

        // TODO tune limit
        let cli_stream = client.get_stream(30);

        // creates the initial run
        let curr_run = run_service::create_run(&db, chrono::offset::Utc::now().timestamp_millis())
            .await
            .expect("Could not create initial run!");

        MqttReciever {
            channel,
            client,
            recv_stream: cli_stream,
            database: db,
            current_run: curr_run.id,
        }
    }

    /// connect to siren or panicing if siren cannot be found
    /// Uses lwt and begins the subscription if the connection was successful
    pub async fn siren_connect(&self) {
        let lwt = paho_mqtt::Message::new("Scylla/Status", "Scylla Disconnected", 2);
        let conn_opts = paho_mqtt::ConnectOptionsBuilder::with_mqtt_version(MQTT_VERSION_5)
            .will_message(lwt)
            .keep_alive_interval(Duration::from_secs(20))
            .clean_session(false)
            .automatic_reconnect(Duration::from_secs(1), Duration::from_secs(30))
            .finalize();

        self.client.connect(conn_opts).await.expect(&format!(
            "Could not connect to Siren at {}",
            self.client.server_uri()
        ));

        self.client
            .subscribe("#", 2)
            .await
            .expect("Could not subscribe to Siren");
    }

    /// Parse the message
    /// * `msg` - The mqtt message to parse
    /// returns the ClientData and the node name, or the Err of something that can be debug printed
    async fn parse_msg(
        &self,
        msg: paho_mqtt::Message,
    ) -> Result<(ClientData, String), impl fmt::Debug> {
        println!("Recved msg!");

        let data = serverdata::ServerData::parse_from_bytes(msg.payload())
            .map_err(|f| format!("Could not parse message: {}", f.to_string()))?;

        let split = msg.topic().split_once("/").ok_or("Could not parse topic")?;

        let node = split.0;

        let data_type = split.1.replace("/", "-");

        println!(
            "{:?}, a: {:?}",
            msg.properties(),
            msg.properties().find_user_property("ts")
        );

        let unix_time = msg
            .properties()
            .find_user_property("ts")
            .unwrap_or_else(|| chrono::offset::Utc::now().timestamp_millis().to_string());

        let Ok(time_clean) = unix_time.parse::<i64>() else {
            return Err(format!("Invalid timestamp {}", unix_time));
        };
        if time_clean < 963014966000 {
            println!("Hit ts");
            return Err("Timestamp before year 2000!".to_owned());
        }

        Ok((
            ClientData {
                run_id: self.current_run,
                name: data_type,
                unit: data.unit,
                values: data.value,
                timestamp: time_clean,
            },
            node.to_string(),
        ))
    }

    /// Send a message to the channel, printing and IGNORING any error that may occur
    /// * `client_data` - The cliet data to send over the socket
    async fn send_msg(&self, client_data: &ClientData) {
        println!("{:?}", client_data);

        let _ = self
            .channel
            .send(client_data.clone())
            .await
            .inspect_err(|f| println!("Error sending through channel: {:?}", f));
    }

    /// Stores the data in the database
    /// * `client_data` - The client data to store
    /// * `node` - The name of the node to store it under
    /// returns Ok or the QueryError
    async fn store_data(&self, client_data: ClientData, node: String) -> Result<(), QueryError> {
        node_service::upsert_node(&self.database, node.clone()).await?;
        data_type_service::upsert_data_type(
            &self.database,
            client_data.name.clone(),
            client_data.unit.clone(),
            node,
        )
        .await?;

        match client_data.name {
            _ => {
                data_service::add_data(&self.database, client_data).await?;
            }
        }

        Ok(())
    }
}

/// This handles the reception of mqtt messages
/// This would make more sense to go into the Impl, however the lifetime of the struct would no longer be static!
pub async fn recieve_mqtt(rec: MqttReciever) {
    // iterate over messages
    while let Ok(msg) = rec.recv_stream.recv().await {
        // safe unwrap the message
        if let Some(msg) = msg {
            // parse the message into the data and the node name it falls under
            let item_data = match rec.parse_msg(msg).await {
                Ok(msg) => msg,
                Err(err) => {
                    println!("Message parse error: {:?}", err);
                    continue;
                }
            };
            // send the message over the channel to the socketio consumer
            rec.send_msg(&item_data.0).await;
            // store the data or print any storage error that occurs
            if let Err(store) = rec.store_data(item_data.0, item_data.1).await {
                println!("Storage error: {:?}", store);
            }
        } else {
            // basic and somewhat untested reconnection logic
            println!("Lost connection. Attempting reconnect.");
            while let Err(err) = rec.client.reconnect().await {
                println!("Error reconnecting: {}", err);

                tokio::time::sleep(Duration::from_millis(1000)).await;
            }
        }
    }
}
