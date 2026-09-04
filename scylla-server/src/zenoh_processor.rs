use std::{path::PathBuf, sync::atomic::Ordering, time::Duration};

use diesel_async::{AsyncPgConnection, pooled_connection::bb8::Pool};
use protobuf::Message;
use rustc_hash::FxHashMap;
use tokio::{
    sync::{broadcast, mpsc},
    time::Instant,
};
use tokio_util::sync::CancellationToken;
use tracing::{Level, debug, instrument, trace, warn};
use zenoh::{bytes::ZBytes, qos::CongestionControl, sample::Sample};

use crate::{
    RATE_LIMIT_MODE, RateLimitMode, STATIC_RATE_LIMIT_VALUE, SirenSendable,
    controllers::car_command_controller::CALYPSO_BIDIR_CMD_PREFIX, proto::serverdata,
    services::run_service,
};

use super::ClientData;

const YEAR_2000: chrono::DateTime<chrono::Utc> =
    chrono::DateTime::from_timestamp_millis(963_014_966_000).unwrap();

/// The chief processor of incoming mqtt data, this handles
/// - mqtt state
/// - reception via mqtt and subsequent parsing
/// - labeling of data with runs
/// - sending data over the channel to a db handler and socket
///
/// It also is the main form of rate limiting
pub struct ZenohProcessor {
    db_channel: broadcast::Sender<ClientData>,
    socket_channel: broadcast::Sender<ClientData>,
    send_channel: mpsc::Receiver<SirenSendable>,
    cancel_token: CancellationToken,
    /// static rate limiter
    rate_limiter: FxHashMap<String, Instant>,
    session: zenoh::Session,
}

impl ZenohProcessor {
    /// Creates a new zenoh reciever
    /// * `db_channel` - The mpsc channel to send the database data to
    /// * `socket_channel` - The mpsc channel to send the socket data to
    /// * `cancel_token` - The token which indicates cancellation of the task
    /// * `conf_path` - The zenoh conf path
    ///   Returns the instance which is then used in the `process_zenoh` loop
    /// # Panics
    /// Panics if zenoh conf invalid
    #[must_use]
    pub async fn new(
        db_channel: broadcast::Sender<ClientData>,
        socket_channel: broadcast::Sender<ClientData>,
        send_channel: mpsc::Receiver<SirenSendable>,
        cancel_token: CancellationToken,
        conf_path: PathBuf,
    ) -> Self {
        zenoh::init_log_from_env_or("info");

        let session =
            zenoh::open(zenoh::Config::from_file(conf_path).expect("Could not find Zenoh conf"))
                .await
                .expect("Invalid zenoh conf");

        ZenohProcessor {
            db_channel,
            socket_channel,
            send_channel,
            cancel_token,
            rate_limiter: FxHashMap::default(),
            session,
        }
    }

    /// This handles the reception of zenoh messages, will not return
    /// * `eventloop` - The eventloop returned by `::new` to connect to.  The loop isnt sync so this is the best that can be done
    /// * `client` - The async mqttt v5 client to use for subscriptions
    /// # Panics
    /// Panics if subscription call fails
    pub async fn process_zenoh(mut self, pool: Pool<AsyncPgConnection>) {
        debug!("Subscribing to siren");
        let subscriber = self
            .session
            .declare_subscriber("**")
            .await
            .expect("Could not subscribe to Zenoh");

        loop {
            tokio::select! {
                () = self.cancel_token.cancelled() => {
                    debug!("Shutting down Zenoh processor!");
                    break;
                },
                Ok(msg_raw) = subscriber.recv_async() =>  {
                        trace!("Received zenoh message: {:?}", msg_raw);
                        // parse the message into the data and the node name it falls under
                        let (send_db, msg) = self.parse_msg(msg_raw, &pool).await;
                        if let Some(msg) = msg {
                            if send_db {
                                self.send_db_msg(msg.clone());
                            }
                            self.send_channel_msg(msg.clone());
                        }
                },
                Some(res) = self.send_channel.recv() => {
                    let (data, ref mut topic) = Self::convert_to_zenoh(res);
                    trace!("Sending zenoh message {}", topic);
                    if let Err(err)= self.session.put(topic, data)
                        .encoding(zenoh::bytes::Encoding::APPLICATION_PROTOBUF)
                        // commands must not be silently dropped under congestion;
                        // zenoh defaults pushes to CongestionControl::Drop
                        .congestion_control(CongestionControl::Block)
                        .await {
                        warn!("Error sending zenoh message: {}", err);
                    }
                }
            }
        }
    }

    /// Parse the message
    /// * `msg` - The mqtt message to parse
    /// returns the `ClientData` and whether it should be saved
    #[instrument(skip(self), level = Level::TRACE)]
    async fn parse_msg(
        &mut self,
        msg: Sample,
        pool: &Pool<AsyncPgConnection>,
    ) -> (bool, Option<ClientData>) {
        // ignore command messages, less confusing in logs than just failing to decode protobuf
        if msg.key_expr().starts_with(CALYPSO_BIDIR_CMD_PREFIX) {
            debug!("Skipping command message: {}", msg.key_expr());
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
            if let Some(old) = self.rate_limiter.get(&msg.key_expr().to_string()) {
                // if the message is less than the rate limit, skip it and do not update the map
                if old.elapsed()
                    < Duration::from_millis(STATIC_RATE_LIMIT_VALUE.load(Ordering::Relaxed).into())
                {
                    trace!(
                        "Static rate limit skipping message with topic {}",
                        msg.key_expr()
                    );
                    return (false, None);
                }
                // if the message is past the rate limit, continue with the parsing of it and mark the new time last received
                self.rate_limiter
                    .insert(msg.key_expr().to_string(), Instant::now());
            } else {
                // here is the first insertion of the topic (the first time we receive the topic in scylla's lifetime)
                self.rate_limiter
                    .insert(msg.key_expr().to_string(), Instant::now());
            }
        }

        // look at data after topic as if we dont have a topic the protobuf is useless anyways
        let Ok(data) = serverdata::ServerData::parse_from_reader(&mut msg.payload().reader())
        else {
            warn!("Could not parse message payload:{:?}", msg.key_expr());
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
                warn!("System has no good time, not saving message!");
                return (
                    false,
                    Some(ClientData {
                        run_id: crate::RUN_ID.load(Ordering::Relaxed),
                        name: msg.key_expr().to_string(),
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
            core::hint::cold_path();
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
                name: msg.key_expr().to_string(),
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

    fn convert_to_zenoh(msg: SirenSendable) -> (ZBytes, String) {
        let bytes = ZBytes::from(protobuf::Message::write_to_bytes(&msg.command_data).unwrap());

        (bytes, msg.topic)
    }
}
