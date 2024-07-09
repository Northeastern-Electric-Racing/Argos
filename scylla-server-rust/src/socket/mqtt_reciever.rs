use core::fmt;
use std::time::Duration;

use prisma_client_rust::{chrono, QueryError};
use protobuf::Message;
use rumqttc::v5::{
    mqttbytes::v5::{LastWill, Packet, Publish},
    AsyncClient, Event, MqttOptions,
};
use tokio::sync::mpsc::Sender;

use crate::{
    serverdata,
    services::{data_service, data_type_service, node_service, run_service},
    Database,
};

use super::socket_handler::ClientData;
use std::borrow::Cow;

pub struct MqttReciever {
    channel: Sender<ClientData>,
    database: Database,
    curr_run: i32,
}

impl MqttReciever {
    /// Creates a new mqtt reciever
    /// * `channel` - The mpsc channel to send the socket.io data to
    /// * `mqtt_path` - The mqtt URI, including port, (without the mqtt://) to subscribe to
    /// * `db` - The database to store the data in
    pub async fn new(
        channel: Sender<ClientData>,
        mqtt_path: &str,
        db: Database,
    ) -> (MqttReciever, MqttOptions) {
        // create the mqtt client and configure it
        let mut create_opts = MqttOptions::new(
            "ScyllaServer",
            mqtt_path.split_once(":").expect("Invalid Siren URL").0,
            mqtt_path
                .split_once(":")
                .unwrap()
                .1
                .parse::<u16>()
                .expect("Invalid Siren port"),
        );
        create_opts.set_keep_alive(Duration::from_secs(20));
        create_opts.set_last_will(LastWill::new(
            "Scylla/Status",
            "Scylla has disconnected!",
            rumqttc::v5::mqttbytes::QoS::ExactlyOnce,
            true,
            None,
        ));
        create_opts.set_clean_start(false);

        // creates the initial run
        let curr_run = run_service::create_run(&db, chrono::offset::Utc::now().timestamp_millis())
            .await
            .expect("Could not create initial run!");

        (
            MqttReciever {
                channel,
                database: db,
                curr_run: curr_run.id,
            },
            create_opts,
        )
    }

    /// Parse the message
    /// * `msg` - The mqtt message to parse
    /// returns the ClientData and the node name, or the Err of something that can be debug printed

    async fn parse_msg(&self, msg: Publish) -> Result<(ClientData, String), impl fmt::Debug> {
        let data = serverdata::ServerData::parse_from_bytes(&msg.payload).map_err(|f| {
            format!(
                "Could not parse message topic:{:?} error: {}",
                msg.topic,
                f.to_string()
            )
        })?;

        let split = std::str::from_utf8(&msg.topic)
            .expect(&format!("Could not parse topic: {:?}", msg.topic))
            .split_once("/")
            .ok_or(&format!("Could not parse nesting: {:?}", msg.topic))?;

        let node = split.0;

        let data_type = split.1.replace("/", "-");

        // extract the unix time, returning the current time instead if needed
        // note the Cow magic involves the return from the map is a borrow, but the unwrap cannot as we dont own it
        let unix_time = msg
            .properties
            .unwrap_or_default()
            .user_properties
            .iter()
            .map(Cow::Borrowed)
            .find(|f| f.0 == "ts")
            .unwrap_or_else(|| {
                Cow::Owned((
                    "ts".to_string(),
                    chrono::offset::Utc::now().timestamp_millis().to_string(),
                ))
            })
            .into_owned();

        let Ok(time_clean) = unix_time.1.parse::<i64>() else {
            return Err(format!("Invalid timestamp: {}", unix_time.1));
        };
        if time_clean < 963014966000 {
            return Err(format!("Timestamp before year 2000: {}", unix_time.1));
        }

        Ok((
            ClientData {
                run_id: self.curr_run,
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
/// * `rec` - The mqtt reciever created by new
/// * `client_opts` - The client options returned by new
pub async fn recieve_mqtt(rec: MqttReciever, client_opts: MqttOptions) {
    // TODO mess with incoming message cap if db, etc. cannot keep up
    let (client, mut connect) = AsyncClient::new(client_opts, 30);

    client
        .subscribe("#", rumqttc::v5::mqttbytes::QoS::ExactlyOnce)
        .await
        .expect("Could not subscribe to Siren");

    // iterate over messages
    while let Ok(msg) = connect.poll().await {
        // safe parse the message
        if let Event::Incoming(Packet::Publish(msg)) = msg {
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
        }
    }
}
