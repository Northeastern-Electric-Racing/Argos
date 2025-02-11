use std::{
    sync::{atomic::Ordering, Arc},
    time::{Duration, SystemTime},
};

use chrono::TimeDelta;
use protobuf::Message;
use ringbuffer::RingBuffer;
use rumqttc::v5::{
    mqttbytes::v5::{Packet, Publish},
    AsyncClient, Event, EventLoop, MqttOptions,
};
use rustc_hash::FxHashMap;
use tokio::{sync::broadcast, time::Instant};
use tokio_util::sync::CancellationToken;
use tracing::{debug, instrument, trace, warn, Level};

use crate::{
    controllers::car_command_controller::CALYPSO_BIDIR_CMD_PREFIX, proto::serverdata, RateLimitMode,
};

use super::ClientData;

/// The chief processor of incoming mqtt data, this handles
/// - mqtt state
/// - reception via mqtt and subsequent parsing
/// - labeling of data with runs
/// - sending data over the channel to a db handler and socket
///
/// It also is the main form of rate limiting
pub struct MqttProcessor {
    channel: broadcast::Sender<ClientData>,
    cancel_token: CancellationToken,
    /// static rate limiter
    rate_limiter: FxHashMap<String, Instant>,
    /// time to rate limit
    rate_limit_time: Duration,
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
}

impl MqttProcessor {
    /// Creates a new mqtt receiver and socketio and db sender
    /// * `channel` - The mpsc channel to send the database data to
    /// * `cancel_token` - The token which indicates cancellation of the task
    /// * `opts` - The mqtt processor options to use
    ///     Returns the instance and options to create a client, which is then used in the process_mqtt loop
    pub fn new(
        channel: broadcast::Sender<ClientData>,
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

        (
            MqttProcessor {
                channel,
                cancel_token,
                rate_limiter: FxHashMap::default(),
                rate_limit_time: Duration::from_millis(opts.static_rate_limit_time),
                rate_limit_mode: opts.rate_limit_mode,
            },
            mqtt_opts,
        )
    }

    /// This handles the reception of mqtt messages, will not return
    /// * `eventloop` - The eventloop returned by ::new to connect to.  The loop isnt sync so this is the best that can be done
    /// * `client` - The async mqttt v5 client to use for subscriptions
    pub async fn process_mqtt(mut self, client: Arc<AsyncClient>, mut eventloop: EventLoop) {
        // let mut latency_interval = tokio::time::interval(Duration::from_millis(250));
        let mut latency_ringbuffer = ringbuffer::AllocRingBuffer::<TimeDelta>::new(20);

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
                    },
                    Err(msg) => trace!("Received mqtt error: {:?}", msg),
                    _ => trace!("Received misc mqtt: {:?}", msg),
                },
                // _ = latency_interval.tick() => {
                //     // set latency to 0 if no messages are in buffer
                //     let avg_latency = if latency_ringbuffer.is_empty() {
                //         0
                //     } else {
                //         latency_ringbuffer.iter().sum::<TimeDelta>().num_milliseconds() / latency_ringbuffer.len() as i64
                //     };

                //     let client_data = ClientData {
                //         name: "Latency".to_string(),
                //         node: "Internal".to_string(),
                //         unit: "ms".to_string(),
                //         run_id: crate::RUN_ID.load(Ordering::Relaxed),
                //         timestamp: chrono::offset::Utc::now(),
                //         values: vec![avg_latency as f32]
                //     };
                //     trace!("Latency update sending: {}", client_data.values.first().unwrap_or(&0.0f32));
                //     self.send_socket_msg(client_data, &mut upload_counter);
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
                if old.elapsed() < self.rate_limit_time {
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

        // look at data after topic as if we dont have a topic the protobuf is useless anyways
        let Ok(data) = serverdata::ServerData::parse_from_bytes(&msg.payload) else {
            warn!("Could not parse message payload:{:?}", msg.topic);
            return None;
        };

        // extract the unix time
        // levels of time priority
        // - A: The time packaged in the protobuf, to microsecond precision
        // - B: The time packaged in the MQTT header, to millisecond precision (hence the * 1000 on B)
        // - C: The local scylla system time
        // note protobuf defaults to 0 for unfilled time, so consider it as an unset time
        let unix_time = if data.time_us > 0 {
            // A
            let Some(unix_time) = chrono::DateTime::from_timestamp_micros(data.time_us as i64)
            else {
                warn!(
                    "Corrupted time in protobuf: {}, discarding message!",
                    data.time_us
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
            run_id: crate::RUN_ID.load(Ordering::Relaxed),
            name: topic.to_string(),
            unit: data.unit,
            values: data.values,
            timestamp: unix_clean,
        })
    }

    /// Send a message to the channel, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    async fn send_db_msg(&self, client_data: ClientData) {
        if let Err(err) = self.channel.send(client_data) {
            warn!("Error sending through channel: {:?}", err);
        }
    }
}
