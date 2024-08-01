use core::fmt;
use std::{sync::Arc, time::Duration};

use prisma_client_rust::{bigdecimal::ToPrimitive, chrono, serde_json};
use protobuf::Message;
use ringbuffer::RingBuffer;
use rumqttc::v5::{
    mqttbytes::v5::{LastWill, Packet, Publish},
    AsyncClient, Event, EventLoop, MqttOptions,
};
use socketioxide::SocketIo;
use tokio::sync::mpsc::{Receiver, Sender};
use tracing::{debug, instrument, trace, warn, Level};

use crate::{serverdata, services::run_service};

use super::ClientData;
use std::borrow::Cow;

pub struct MqttProcessor {
    channel: Sender<ClientData>,
    new_run_channel: Receiver<run_service::public_run::Data>,
    curr_run: i32,
    io: SocketIo,
}

impl MqttProcessor {
    /// Creates a new mqtt receiver and socketio and db sender
    /// * `channel` - The mpsc channel to send the database data to
    /// * `mqtt_path` - The mqtt URI, including port, (without the mqtt://) to subscribe to
    /// * `db` - The database to store the data in
    /// * `io` - The socketio layer to send the data to
    ///
    /// Returns the instance and options to create a client, which is then used in the process_mqtt loop
    pub fn new(
        channel: Sender<ClientData>,
        new_run_channel: Receiver<run_service::public_run::Data>,
        mqtt_path: String,
        initial_run: i32,
        io: SocketIo,
    ) -> (MqttProcessor, MqttOptions) {
        // create the mqtt client and configure it
        let mut mqtt_opts = MqttOptions::new(
            "ScyllaServer",
            mqtt_path.split_once(':').expect("Invalid Siren URL").0,
            mqtt_path
                .split_once(':')
                .unwrap()
                .1
                .parse::<u16>()
                .expect("Invalid Siren port"),
        );
        mqtt_opts
            .set_last_will(LastWill::new(
                "Scylla/Status",
                "Scylla has disconnected!",
                rumqttc::v5::mqttbytes::QoS::ExactlyOnce,
                true,
                None,
            ))
            .set_keep_alive(Duration::from_secs(20))
            .set_clean_start(false)
            .set_connection_timeout(3)
            .set_session_expiry_interval(Some(u32::MAX))
            .set_topic_alias_max(Some(600));

        // TODO mess with incoming message cap if db, etc. cannot keep up

        (
            MqttProcessor {
                channel,
                new_run_channel,
                curr_run: initial_run,
                io,
            },
            mqtt_opts,
        )
    }

    /// This handles the reception of mqtt messages, will not return
    /// * `eventloop` - The eventloop returned by ::new to connect to.  The loop isnt sync so this is the best that can be done
    /// * `client` - The async mqttt v5 client to use for subscriptions
    pub async fn process_mqtt(mut self, client: Arc<AsyncClient>, mut eventloop: EventLoop) {
        let mut view_interval = tokio::time::interval(Duration::from_secs(3));

        let mut latency_interval = tokio::time::interval(Duration::from_millis(250));
        let mut latency_ringbuffer = ringbuffer::AllocRingBuffer::<i64>::new(20);

        debug!("Subscribing to siren");
        client
            .subscribe("#", rumqttc::v5::mqttbytes::QoS::ExactlyOnce)
            .await
            .expect("Could not subscribe to Siren");

        loop {
            #[rustfmt::skip] // rust cannot format this macro for some reason
            tokio::select! {
                msg = eventloop.poll() => match msg {
                    Ok(Event::Incoming(Packet::Publish(msg))) => {
                        trace!("Received mqtt message: {:?}", msg);
                        // parse the message into the data and the node name it falls under
                        let msg = match self.parse_msg(msg) {
                            Ok(msg) => msg,
                            Err(err) => {
                                warn!("Message parse error: {:?}", err);
                                continue;
                            }
                        };
                        latency_ringbuffer.push(chrono::offset::Utc::now().timestamp_millis() - msg.timestamp);
                        self.send_db_msg(msg.clone()).await;
                        self.send_socket_msg(msg);
                    },
                    Err(msg) => trace!("Received mqtt error: {:?}", msg),
                    _ => trace!("Received misc mqtt: {:?}", msg),
                },
                _ = view_interval.tick() => {
                    trace!("Updating viewership data!");
                    if let Ok(sockets) = self.io.sockets() {
                    let client_data = ClientData {
                        name: "Viewers".to_string(),
                        node: "Internal".to_string(),
                        unit: "".to_string(),
                        run_id: self.curr_run,
                        timestamp: chrono::offset::Utc::now().timestamp_millis(),
                        values: vec![sockets.len().to_string()]
                    };
                    self.send_socket_msg(client_data);
                    } else {
                        warn!("Could not fetch socket count");
                    }
                }
                _ = latency_interval.tick() => {
                    // set latency to 0 if no messages are in buffer
                    let avg_latency = if latency_ringbuffer.is_empty() {
                        0
                    } else {
                        latency_ringbuffer.iter().sum::<i64>() / latency_ringbuffer.len().to_i64().unwrap_or_default()
                    };

                    let client_data = ClientData {
                        name: "Latency".to_string(),
                        node: "Internal".to_string(),
                        unit: "ms".to_string(),
                        run_id: self.curr_run,
                        timestamp: chrono::offset::Utc::now().timestamp_millis(),
                        values: vec![avg_latency.to_string()]
                    };
                    trace!("Latency update sending: {}", client_data.values.first().unwrap_or(&"n/a".to_string()));
                    self.send_socket_msg(client_data);
                }
                Some(new_run) = self.new_run_channel.recv() => {
                    trace!("New run: {:?}", new_run);
                    self.curr_run = new_run.id;
                }
            }
        }
    }

    /// Parse the message
    /// * `msg` - The mqtt message to parse
    /// returns the ClientData, or the Err of something that can be debug printed
    #[instrument(skip(self), level = Level::TRACE)]
    fn parse_msg(&self, msg: Publish) -> Result<ClientData, impl fmt::Debug> {
        let data = serverdata::ServerData::parse_from_bytes(&msg.payload)
            .map_err(|f| format!("Could not parse message topic:{:?} error: {}", msg.topic, f))?;

        let split = std::str::from_utf8(&msg.topic)
            .map_err(|f| format!("Could not parse topic: {}, topic: {:?}", f, msg.topic))?
            .split_once('/')
            .ok_or(&format!("Could not parse nesting: {:?}", msg.topic))?;

        let node = split.0;

        let data_type = split.1.replace('/', "-");

        // extract the unix time, returning the current time instead if either the "ts" user property isnt present or it isnt parsable
        // note the Cow magic involves the return from the map is a borrow, but the unwrap cannot as we dont own it
        let unix_time = msg
            .properties
            .unwrap_or_default()
            .user_properties
            .iter()
            .map(Cow::Borrowed)
            .find(|f| f.0 == "ts")
            .unwrap_or_else(|| {
                debug!("Could not find timestamp in mqtt, using system time");
                Cow::Owned((
                    "ts".to_string(),
                    chrono::offset::Utc::now().timestamp_millis().to_string(),
                ))
            })
            .1
            .parse::<i64>()
            .unwrap_or_else(|err| {
                warn!("Invalid timestamp in mqtt, using system time: {}", err);
                chrono::offset::Utc::now().timestamp_millis()
            });

        // ts check for bad sources of time which may return 1970
        // if both system time and packet timestamp are before year 2000, the message cannot be recorded
        let unix_clean = if unix_time < 963014966000 {
            debug!("Timestamp before year 2000: {}", unix_time);
            let sys_time = chrono::offset::Utc::now().timestamp_millis();
            if sys_time < 963014966000 {
                return Err("System has no good time, discarding message!".to_string());
            }
            sys_time
        } else {
            unix_time
        };

        Ok(ClientData {
            run_id: self.curr_run,
            name: data_type,
            unit: data.unit,
            values: data.value,
            timestamp: unix_clean,
            node: node.to_string(),
        })
    }

    /// Send a message to the channel, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    async fn send_db_msg(&self, client_data: ClientData) {
        if let Err(err) = self.channel.send(client_data.clone()).await {
            warn!("Error sending through channel: {:?}", err)
        }
    }

    /// Sends a message to the socket, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    fn send_socket_msg(&self, client_data: ClientData) {
        match self.io.emit(
            "message",
            serde_json::to_string(&client_data).expect("Could not serialize ClientData"),
        ) {
            Ok(_) => (),
            Err(err) => match err {
                socketioxide::BroadcastError::Socket(e) => {
                    trace!("Socket: Transmit error: {:?}", e);
                }
                socketioxide::BroadcastError::Serialize(_) => {
                    warn!("Socket: Serialize error: {}", err)
                }
                socketioxide::BroadcastError::Adapter(_) => {
                    warn!("Socket: Adapter error: {}", err)
                }
            },
        }
    }
}
