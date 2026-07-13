use std::{
    sync::{Arc, atomic::Ordering},
    time::{Duration, SystemTime},
};

use chrono::TimeDelta;
use diesel_async::{AsyncPgConnection, pooled_connection::bb8::Pool};
use protobuf::Message;
use ringbuffer::RingBuffer;
use rumqttc::v5::{
    AsyncClient, Event, EventLoop, MqttOptions,
    mqttbytes::v5::{Packet, Publish},
};
use rustc_hash::FxHashMap;
use tokio::{sync::broadcast, time::Instant};
use tokio_util::sync::CancellationToken;
use tracing::{Level, debug, info, instrument, trace, warn};

use crate::{
    RATE_LIMIT_MODE, RateLimitMode, STATIC_RATE_LIMIT_VALUE,
    controllers::car_command_controller::CALYPSO_BIDIR_CMD_PREFIX, proto::serverdata,
    services::run_service,
};

use super::ClientData;

const YEAR_2000: chrono::DateTime<chrono::Utc> =
    chrono::DateTime::from_timestamp_millis(963_014_966_000).unwrap();

/// The chief processor of incoming mqtt data, this handles
/// - zenoh state
/// - reception via mqtt and subsequent parsing
/// - labeling of data with runs
/// - sending data over the channel to a db handler and socket
///
/// It also is the main form of rate limiting
pub struct MqttProcessor {
    db_channel: broadcast::Sender<ClientData>,
    socket_channel: broadcast::Sender<ClientData>,
    cancel_token: CancellationToken,
    /// static rate limiter
    rate_limiter: FxHashMap<String, Instant>,
}

/// processor options, these are static immutable settings
pub struct MqttProcessorOptions {
    /// URI of the mqtt server
    pub mqtt_path: String,
}

impl MqttProcessor {
    /// Creates a new mqtt receiver and socketio and db sender
    /// * `db_channel` - The mpsc channel to send the database data to
    /// * `socket_channel` - The mpsc channel to send the socket data to
    /// * `cancel_token` - The token which indicates cancellation of the task
    /// * `opts` - The mqtt processor options to use
    ///   Returns the instance and options to create a client, which is then used in the `process_mqtt` loop
    /// # Panics
    /// Panics if time went backwards
    #[must_use]
    pub fn new(
        db_channel: broadcast::Sender<ClientData>,
        socket_channel: broadcast::Sender<ClientData>,
        cancel_token: CancellationToken,
        opts: &MqttProcessorOptions,
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
            // clean session: discard any prior session state on connect and let it expire
            // immediately on disconnect, so the broker never queues a backlog to replay.
            // Gaps while disconnected are covered by a separate backup program.
            .set_clean_start(true)
            .set_connection_timeout(3)
            .set_session_expiry_interval(Some(0));
        (
            MqttProcessor {
                db_channel,
                socket_channel,
                cancel_token,
                rate_limiter: FxHashMap::default(),
            },
            mqtt_opts,
        )
    }

    /// This handles the reception of mqtt messages, will not return
    /// * `eventloop` - The eventloop returned by `::new` to connect to.  The loop isnt sync so this is the best that can be done
    /// * `client` - The async mqttt v5 client to use for subscriptions
    /// # Panics
    /// Panics if subscription call fails
    pub async fn process_mqtt(
        mut self,
        client: Arc<AsyncClient>,
        mut eventloop: EventLoop,
        pool: Pool<AsyncPgConnection>,
    ) {
        info!(task = "mqtt_processor", "starting");
        // let mut latency_interval = tokio::time::interval(Duration::from_millis(250));
        let mut latency_ringbuffer = ringbuffer::AllocRingBuffer::<TimeDelta>::new(20);

        // DIAGNOSTIC PROBE (disabled): sampled counter for how stale messages already are at
        // the instant MQTT delivers them. Re-enable alongside the block below to measure
        // reception age (e.g. when chasing broker-bridge lag).
        // let mut recv_cnt = 0u64;

        let mut heartbeat = tokio::time::interval(Duration::from_secs(30));
        let mut iter_count: u64 = 0;
        let mut msgs_since_hb: u64 = 0;

        debug!("Subscribing to siren");
        client
            .subscribe("#", rumqttc::v5::mqttbytes::QoS::AtMostOnce)
            .await
            .expect("Could not subscribe to Siren");

        loop {
            iter_count = iter_count.wrapping_add(1);
            #[rustfmt::skip] // rust cannot format this macro for some reason
            tokio::select! {
                () = self.cancel_token.cancelled() => {
                    debug!("Shutting down MQTT processor!");
                    break;
                },
                msg = eventloop.poll() => match msg {
                    Ok(Event::Incoming(Packet::Publish(msg))) => {
                        msgs_since_hb = msgs_since_hb.wrapping_add(1);
                        trace!("Received mqtt message: {:?}", msg);
                        // parse the message into the data and the node name it falls under
                        let (send_db, msg) = self.parse_msg(msg, &pool).await;
                        if let Some(msg) = msg {
                            latency_ringbuffer.enqueue(chrono::offset::Utc::now() - msg.timestamp);
                            // DIAGNOSTIC PROBE (disabled): reception age at eventloop.poll().
                            // recv_cnt += 1;
                            // if recv_cnt % 1000 == 0 {
                            //     debug!(
                            //         "MQTT reception age sample: message is {} ms old at the moment eventloop.poll() delivered it (before channel/socket)",
                            //         (chrono::offset::Utc::now() - msg.timestamp).num_milliseconds()
                            //     );
                            // }
                            if send_db {
                                self.send_db_msg(msg.clone());
                            }
                            self.send_channel_msg(msg.clone());
                        }
                    },
                    Err(msg) => trace!("Received mqtt error: {:?}", msg),
                    _ => trace!("Received misc mqtt: {:?}", msg),
                },
                _ = heartbeat.tick() => {
                    info!(
                        task = "mqtt_processor",
                        iter = iter_count,
                        db_channel_len = self.db_channel.len(),
                          socket_channel_len = self.socket_channel.len(),
                          msgs_in_window = msgs_since_hb,
                          "heartbeat"
                    );
                    msgs_since_hb = 0;
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
    /// returns the `ClientData`, or the Err of something that can be debug printed
    #[instrument(skip(self), level = Level::TRACE)]
    async fn parse_msg(
        &mut self,
        msg: Publish,
        pool: &Pool<AsyncPgConnection>,
    ) -> (bool, Option<ClientData>) {
        let Ok(topic) = std::str::from_utf8(&msg.topic) else {
            warn!("Could not parse topic, topic: {:?}", msg.topic);
            return (false, None);
        };

        // ignore command messages, less confusing in logs than just failing to decode protobuf
        if topic.starts_with(CALYPSO_BIDIR_CMD_PREFIX) {
            debug!("Skipping command message: {}", topic);
            return (false, None);
        }

        // ignore blank topics
        if topic.is_empty() {
            debug!("Skipping empty topic!");
            return (false, None);
        }

        // handle static rate limiting mode
        if RATE_LIMIT_MODE
            .load(Ordering::Relaxed)
            .try_into()
            .unwrap_or(RateLimitMode::None)
            == RateLimitMode::Static
        {
            // check if we have a previous time for a message based on its topic
            if let Some(old) = self.rate_limiter.get(topic) {
                // if the message is less than the rate limit, skip it and do not update the map
                if old.elapsed()
                    < Duration::from_millis(STATIC_RATE_LIMIT_VALUE.load(Ordering::Relaxed).into())
                {
                    trace!("Static rate limit skipping message with topic {}", topic);
                    return (false, None);
                }
                // if the message is past the rate limit, continue with the parsing of it and mark the new time last received
                self.rate_limiter.insert(topic.to_string(), Instant::now());
            } else {
                // here is the first insertion of the topic (the first time we receive the topic in scylla's lifetime)
                self.rate_limiter.insert(topic.to_string(), Instant::now());
            }
        }

        // look at data after topic as if we dont have a topic the protobuf is useless anyways
        let Ok(data) = serverdata::ServerData::parse_from_bytes(&msg.payload) else {
            warn!("Could not parse message payload:{:?}", msg.topic);
            return (false, None);
        };

        // extract the unix time
        // levels of time priority
        // - A: The time packaged in the protobuf, to microsecond precision
        // - B: The local scylla system time

        // note protobuf defaults to 0 for unfilled time

        // A
        let Some(unix_time) = chrono::DateTime::from_timestamp_micros(data.time_us.cast_signed())
        else {
            warn!(
                "Corrupted time in protobuf: {}, discarding message!",
                data.time_us
            );
            return (false, None);
        };

        // ts check for bad sources of time which may return 1970
        // if both system time and packet timestamp are before year 2000, the message cannot be recorded
        let unix_clean = if unix_time < YEAR_2000 {
            debug!("Timestamp before year 2000: {}", unix_time.to_string());
            // B
            let sys_time = chrono::offset::Utc::now();
            if sys_time < YEAR_2000 {
                warn!("System has no good time, discarding message!");
                return (
                    false,
                    Some(ClientData {
                        run_id: crate::RUN_ID.load(Ordering::Relaxed),
                        name: topic.to_string(),
                        unit: data.unit,
                        values: data.values,
                        timestamp: sys_time,
                    }),
                );
            }
            sys_time
        } else {
            unix_time
        };

        if crate::RUN_ID.load(Ordering::Relaxed) == -1 {
            // creates the initial run
            let curr_run = run_service::create_run(&mut pool.get().await.unwrap(), unix_clean)
                .await
                .expect("Could not create initial run!");
            debug!("Configuring current run: {:?}", curr_run);

            crate::RUN_ID.store(curr_run.runId, Ordering::Relaxed);
        }

        (
            true,
            Some(ClientData {
                run_id: crate::RUN_ID.load(Ordering::Relaxed),
                name: topic.to_string(),
                unit: data.unit,
                values: data.values,
                timestamp: unix_clean,
            }),
        )
    }

    /// Send a message to the channel, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    fn send_db_msg(&self, client_data: ClientData) {
        if let Err(err) = self.db_channel.send(client_data) {
            warn!("Error sending through channel: {:?}", err);
        }
    }

    /// Send a message to the socket channel, printing and IGNORING any error that may occur
    /// * `client_data` - The client data to send over the broadcast
    fn send_channel_msg(&self, client_data: ClientData) {
        if let Err(err) = self.socket_channel.send(client_data) {
            warn!("Error sending through channel: {:?}", err);
        }
    }
}
