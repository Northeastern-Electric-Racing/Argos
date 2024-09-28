use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, SystemTime},
};

use chrono::TimeDelta;
use prisma_client_rust::bigdecimal::ToPrimitive;
use protobuf::Message;
use ringbuffer::RingBuffer;
use rumqttc::v5::{
    mqttbytes::v5::{Packet, Publish},
    AsyncClient, Event, EventLoop, MqttOptions,
};
use socketioxide::SocketIo;
use tokio::{
    sync::mpsc::{Receiver, Sender},
    time::Instant,
};
use tokio_util::sync::CancellationToken;
use tracing::{debug, instrument, trace, warn, Level};

use crate::{
    controllers::car_command_controller::CALYPSO_BIDIR_CMD_PREFIX, serverdata,
    services::run_service, RateLimitMode,
};

use super::ClientData;

/// The chief processor of incoming mqtt data, this handles
/// - mqtt state
/// - reception via mqtt and subsequent parsing
/// - labeling of data with runs
/// - sending data over socket
/// - sending data over the channel to a db handler
///
/// It also is the main form of rate limiting
pub struct MqttProcessor {
    channel: Sender<ClientData>,
    new_run_channel: Receiver<run_service::public_run::Data>,
    curr_run: i32,
    io: SocketIo,
    cancel_token: CancellationToken,
    /// Upload ratio, below is not socket sent above is socket sent
    upload_ratio: u8,
    /// static rate limiter
    rate_limiter: HashMap<String, Instant>,
    /// time to rate limit in ms
    rate_limit_time: u64,
    /// rate limit mode
    rate_limit_mode: RateLimitMode,
}

/// processor options, these are static immutable settings
pub struct MqttProcessorOptions {
    /// URI of the mqtt server
    pub mqtt_path: String,
    /// the initial run id
    pub initial_run: i32,
    /// the static rate limit time interval in ms
    pub static_rate_limit_time: u64,
    /// the rate limit mode
    pub rate_limit_mode: RateLimitMode,
    /// the upload ratio for the socketio
    pub upload_ratio: u8,
}

impl MqttProcessor {
    /// Creates a new mqtt receiver and socketio and db sender
    /// * `channel` - The mpsc channel to send the database data to
    /// * `new_run_channel` - The channel for new run notifications
    /// * `io` - The socketio layer to send the data to
    /// * `cancel_token` - The token which indicates cancellation of the task
    /// * `opts` - The mqtt processor options to use
    ///     Returns the instance and options to create a client, which is then used in the process_mqtt loop
    pub fn new(
        channel: Sender<ClientData>,
        new_run_channel: Receiver<run_service::public_run::Data>,
        io: SocketIo,
        cancel_token: CancellationToken,
        opts: MqttProcessorOptions,
    ) -> (MqttProcessor, MqttOptions) {
        // create the mqtt client and configure it
        let mut mqtt_opts = MqttOptions::new(
            format!(
                "ScyllaServer-{:?}",
                SystemTime::now()
                    .duration_since(SystemTime::UNIX_EPOCH)
                    .expect("Time went backwards")
                    .as_millis()
            ),
            opts.mqtt_path.split_once(':').expect("Invalid Siren URL").0,
            opts.mqtt_path
                .split_once(':')
                .unwrap()
                .1
                .parse::<u16>()
                .expect("Invalid Siren port"),
        );
        mqtt_opts
            .set_keep_alive(Duration::from_secs(20))
            .set_clean_start(false)
            .set_connection_timeout(3)
            .set_session_expiry_interval(Some(u32::MAX))
            .set_topic_alias_max(Some(600));

        let rate_map: HashMap<String, Instant> = HashMap::new();

        (
            MqttProcessor {
                channel,
                new_run_channel,
                curr_run: opts.initial_run,
                io,
                cancel_token,
                upload_ratio: opts.upload_ratio,
                rate_limiter: rate_map,
                rate_limit_time: opts.static_rate_limit_time,
                rate_limit_mode: opts.rate_limit_mode,
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
        let mut latency_ringbuffer = ringbuffer::AllocRingBuffer::<TimeDelta>::new(20);

        let mut upload_counter: u8 = 0;

        debug!("Subscribing to siren");
        client
            .subscribe("#", rumqttc::v5::mqttbytes::QoS::ExactlyOnce)
            .await
            .expect("Could not subscribe to Siren");

        loop {
            #[rustfmt::skip] // rust cannot format this macro for some reason
            tokio::select! {
                _ = self.cancel_token.cancelled() => {
                    debug!("Shutting down MQTT processor!");
                    break;
                },
                msg = eventloop.poll() => match msg {
                    Ok(Event::Incoming(Packet::Publish(msg))) => {
                        trace!("Received mqtt message: {:?}", msg);
                        // parse the message into the data and the node name it falls under
                        let msg = match self.parse_msg(msg) {
                            Some(msg) => msg,
                            None => continue
                        };
                        latency_ringbuffer.push(chrono::offset::Utc::now() - msg.timestamp);
                        self.send_db_msg(msg.clone()).await;
                        self.send_socket_msg(msg, &mut upload_counter);
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
                        timestamp: chrono::offset::Utc::now(),
                        values: vec![sockets.len() as f32]
                    };
                    self.send_socket_msg(client_data, &mut upload_counter);
                    } else {
                        warn!("Could not fetch socket count");
                    }
                }
                _ = latency_interval.tick() => {
                    // set latency to 0 if no messages are in buffer
                    let avg_latency = if latency_ringbuffer.is_empty() {
                        0
                    } else {
                        latency_ringbuffer.iter().sum::<TimeDelta>().num_milliseconds() / latency_ringbuffer.len().to_i64().unwrap_or_default()
                    };

                    let client_data = ClientData {
                        name: "Latency".to_string(),
                        node: "Internal".to_string(),
                        unit: "ms".to_string(),
                        run_id: self.curr_run,
                        timestamp: chrono::offset::Utc::now(),
                        values: vec![avg_latency as f32]
                    };
                    trace!("Latency update sending: {}", client_data.values.first().unwrap_or(&0.0f32));
                    self.send_socket_msg(client_data, &mut upload_counter);
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
    fn parse_msg(&mut self, msg: Publish) -> Option<ClientData> {
        let Ok(topic) = std::str::from_utf8(&msg.topic) else {
            warn!("Could not parse topic, topic: {:?}", msg.topic);
            return None;
        };

        // ignore command messages, less confusing in logs than just failing to decode protobuf
        if topic.starts_with(CALYPSO_BIDIR_CMD_PREFIX) {
            debug!("Skipping command message: {}", topic);
            return None;
        }

        // handle static rate limiting mode
        if self.rate_limit_mode == RateLimitMode::Static {
            // check if we have a previous time for a message based on its topic
            if let Some(old) = self.rate_limiter.get(topic) {
                // if the message is less than the rate limit, skip it and do not update the map
                if old.elapsed() < Duration::from_millis(self.rate_limit_time) {
                    trace!("Static rate limit skipping message with topic {}", topic);
                    return None;
                } else {
                    // if the message is past the rate limit, continue with the parsing of it and mark the new time last received
                    self.rate_limiter.insert(topic.to_string(), Instant::now());
                }
            } else {
                // here is the first insertion of the topic (the first time we receive the topic in scylla's lifetime)
                self.rate_limiter.insert(topic.to_string(), Instant::now());
            }
        }

        let Some(split) = topic.split_once('/') else {
            warn!("Could not parse nesting: {:?}", msg.topic);
            return None;
        };

        // look at data after topic as if we dont have a topic the protobuf is useless anyways
        let Ok(data) = serverdata::ServerData::parse_from_bytes(&msg.payload) else {
            warn!("Could not parse message payload:{:?}", msg.topic);
            return None;
        };

        // get the node and datatype from the topic extracted at the beginning
        let node = split.0;

        let data_type = split.1.replace('/', "-");

        // extract the unix time
        // levels of time priority
        // - A: The time packaged in the protobuf, to microsecond precision
        // - B: The time packaged in the MQTT header, to millisecond precision (hence the * 1000 on B)
        // - C: The local scylla system time
        // note protobuf defaults to 0 for unfilled time, so consider it as an unset time
        let unix_time = if data.time > 0 {
            // A
            let Some(unix_time) = chrono::DateTime::from_timestamp_micros(data.time as i64) else {
                warn!(
                    "Corrupted time in protobuf: {}, discarding message!",
                    data.time
                );
                return None;
            };
            unix_time
        } else {
            // B
            match match msg
                .properties
                .unwrap_or_default()
                .user_properties
                .iter()
                .find(|f| f.0 == "ts")
            {
                Some(val) => {
                    let Ok(time_parsed) = val.1.parse::<i64>() else {
                        warn!("Corrupted time in mqtt header, discarding message!");
                        return None;
                    };
                    chrono::DateTime::from_timestamp_millis(time_parsed)
                }
                None => None,
            } {
                Some(e) => e,
                None => {
                    // C
                    debug!("Could not extract time, using system time!");
                    chrono::offset::Utc::now()
                }
            }
        };

        // ts check for bad sources of time which may return 1970
        // if both system time and packet timestamp are before year 2000, the message cannot be recorded
        let unix_clean =
            if unix_time < chrono::DateTime::from_timestamp_millis(963014966000).unwrap() {
                debug!("Timestamp before year 2000: {}", unix_time.to_string());
                let sys_time = chrono::offset::Utc::now();
                if sys_time < chrono::DateTime::from_timestamp_millis(963014966000).unwrap() {
                    warn!("System has no good time, discarding message!");
                    return None;
                }
                sys_time
            } else {
                unix_time
            };

        Some(ClientData {
            run_id: self.curr_run,
            name: data_type,
            unit: data.unit,
            values: data.values,
            timestamp: unix_clean,
            node: node.to_string(),
        })
    }

    /// Send a message to the channel, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    async fn send_db_msg(&self, client_data: ClientData) {
        if let Err(err) = self.channel.send(client_data.clone()).await {
            warn!("Error sending through channel: {:?}", err);
        }
    }

    /// Sends a message to the socket, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    fn send_socket_msg(&self, client_data: ClientData, upload_counter: &mut u8) {
        *upload_counter = upload_counter.wrapping_add(1);
        if *upload_counter >= self.upload_ratio {
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
        } else {
            trace!("Discarding message with topic {}", client_data.name);
        }
    }
}
