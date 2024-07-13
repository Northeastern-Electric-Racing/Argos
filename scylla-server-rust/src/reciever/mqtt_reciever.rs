use core::fmt;
use std::time::Duration;

use prisma_client_rust::{chrono, serde_json};
use protobuf::Message;
use rumqttc::v5::{
    mqttbytes::v5::{LastWill, Packet, Publish},
    AsyncClient, Event, EventLoop, MqttOptions,
};
use socketioxide::SocketIo;
use tokio::sync::mpsc::Sender;

use crate::{serverdata, services::run_service, Database};

use super::ClientData;
use std::borrow::Cow;

pub struct MqttReciever {
    channel: Sender<ClientData>,
    curr_run: i32,
    io: SocketIo,
}

impl MqttReciever {
    /// Creates a new mqtt reciever and socketio sender
    /// * `channel` - The mpsc channel to send the database data to
    /// * `mqtt_path` - The mqtt URI, including port, (without the mqtt://) to subscribe to
    /// * `db` - The database to store the data in
    /// * `io` - The socketio layer to send the data to
    ///
    /// This is async as it creates the initial run and gets the ID, as well as connecting to and subbing Siren
    /// Returns the instance and the event loop, which can be passed into the recieve_mqtt func to begin recieiving
    pub async fn new(
        channel: Sender<ClientData>,
        mqtt_path: String,
        db: Database,
        io: SocketIo,
    ) -> (MqttReciever, EventLoop) {
        // create the mqtt client and configure it
        let mut create_opts = MqttOptions::new(
            "ScyllaServer",
            mqtt_path.split_once(':').expect("Invalid Siren URL").0,
            mqtt_path
                .split_once(':')
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

        // TODO mess with incoming message cap if db, etc. cannot keep up
        let (client, connect) = AsyncClient::new(create_opts, 1000);

        client
            .try_subscribe("#", rumqttc::v5::mqttbytes::QoS::ExactlyOnce)
            .expect("Could not subscribe to Siren");

        (
            MqttReciever {
                channel,
                curr_run: curr_run.id,
                io,
            },
            connect,
        )
    }

    /// This handles the reception of mqtt messages, will not return
    /// * `connect` - The eventloop returned by ::new to connect to
    pub async fn recieve_mqtt(self, mut connect: EventLoop) {
        // process over messages, non blocking
        while let Ok(msg) = connect.poll().await {
            // safe parse the message
            if let Event::Incoming(Packet::Publish(msg)) = msg {
                // parse the message into the data and the node name it falls under
                let item_data = match self.parse_msg(msg).await {
                    Ok(msg) => msg,
                    Err(err) => {
                        println!("Message parse error: {:?}", err);
                        continue;
                    }
                };
                // send the message over the channel to the socketio and database consumers
                self.send_msg(item_data).await;
            }
        }
    }

    /// Parse the message
    /// * `msg` - The mqtt message to parse
    /// returns the ClientData, or the Err of something that can be debug printed
    async fn parse_msg(&self, msg: Publish) -> Result<ClientData, impl fmt::Debug> {
        let data = serverdata::ServerData::parse_from_bytes(&msg.payload)
            .map_err(|f| format!("Could not parse message topic:{:?} error: {}", msg.topic, f))?;

        let split = std::str::from_utf8(&msg.topic)
            .unwrap_or_else(|_| panic!("Could not parse topic: {:?}", msg.topic))
            .split_once('/')
            .ok_or(&format!("Could not parse nesting: {:?}", msg.topic))?;

        let node = split.0;

        let data_type = split.1.replace('/', "-");

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

        // parse time, if time isnt present use sys time (see above)
        let Ok(time_clean) = unix_time.1.parse::<i64>() else {
            return Err(format!("Invalid timestamp: {}", unix_time.1));
        };
        // ts check for bad sources of time which may return 1970
        if time_clean < 963014966000 {
            return Err(format!("Timestamp before year 2000: {}", unix_time.1));
        }

        Ok(ClientData {
            run_id: self.curr_run,
            name: data_type,
            unit: data.unit,
            values: data.value,
            timestamp: time_clean,
            node: node.to_string(),
        })
    }

    /// Send a message to the channel, printing and IGNORING any error that may occur
    /// * `client_data` - The cliet data to send over the broadcast
    async fn send_msg(&self, client_data: ClientData) {
        if let Err(err) = self.channel.send(client_data.clone()).await {
            println!("Error sending through channel: {:?}", err)
        }
        match self.io.emit(
            "message",
            serde_json::to_string(&client_data).expect("Could not serialize ClientData"),
        ) {
            Ok(_) => (),
            Err(err) => println!("Socket: Broadcast error: {}", err),
        }
    }
}
