use chrono::Utc;
use regex::Regex;
use ringbuffer::{AllocRingBuffer, RingBuffer};
use rustc_hash::FxHashMap;
use serde::Serialize;
use socketioxide::SocketIo;
use socketioxide::adapter::Adapter;
use socketioxide::extract::SocketRef;
use socketioxide::handler::{FromConnectParts, Value};
use socketioxide::socket::{Sid, Socket};
use std::convert::Infallible;
use std::sync::Arc;
use std::{sync::atomic::Ordering, time::Duration};
use tokio::sync::{RwLock, broadcast};
use tokio_util::sync::CancellationToken;
use tracing::{debug, info, trace, warn};

use crate::metadata_structs::{
    DATA_SOCKET_KEY, FAULT_BINS, FAULT_MIN_REG_GAP, FAULT_SOCKET_KEY, FaultData,
    METADATA_SOCKET_KEY, Node, TIMER_SOCKET_KEY, TIMERS_TOPICS, TimerData, TotalTimerData,
    map_dti_flt,
};
use crate::rule_structs::{RULE_SOCKET_KEY, RuleManager};
use crate::{ClientData, SOCKET_DISCARD_PERCENT};

pub async fn socket_handler(
    cancel_token: CancellationToken,
    mut data_channel: broadcast::Receiver<ClientData>,
    io: SocketIo,
) {
    info!(task = "socket_handler", "starting");
    let mut upload_counter = 0u8;
    let mut heartbeat = tokio::time::interval(Duration::from_secs(30));
    let mut iter_count: u64 = 0;
    let mut msgs_since_hb: u64 = 0;
    loop {
        iter_count = iter_count.wrapping_add(1);
        tokio::select! {
            _ = cancel_token.cancelled() => {
                debug!("Shutting down socket handler!");
                break;
            },
            Ok(data) = data_channel.recv() => {
                msgs_since_hb = msgs_since_hb.wrapping_add(1);
                send_socket_msg(&data, &mut upload_counter, &io, DATA_SOCKET_KEY).await;
            }
            _ = heartbeat.tick() => {
                info!(
                    task = "socket_handler",
                    iter = iter_count,
                    data_channel_len = data_channel.len(),
                    msgs_in_window = msgs_since_hb,
                    "heartbeat"
                );
                msgs_since_hb = 0;
            }
        }
    }
}

struct SocketClientId(String);

/**
 * Extracts a client ID from the query string of the socket connection, and uses that as the client ID for rule notifications.
 * This allows clients to persist their identity across reconnects by including the same clientId in the
 *
 * Based on the documentation page and example from socketioxide: https://docs.rs/socketioxide/latest/socketioxide/extract/index.html
 */
impl<A: Adapter> FromConnectParts<A> for SocketClientId {
    type Error = Infallible;

    fn from_connect_parts(s: &Arc<Socket<A>>, _: &Option<Value>) -> Result<Self, Self::Error> {
        // Use query-string identity to persist client identity across reconnects.
        let client_id = s
            .req_parts()
            .uri
            .query()
            .and_then(|query| {
                query.split('&').find_map(|pair| {
                    let mut parts = pair.splitn(2, '=');
                    match (parts.next(), parts.next()) {
                        (Some("clientId"), Some(value)) if !value.is_empty() => Some(value),
                        _ => None,
                    }
                })
            })
            .unwrap_or_default();

        Ok(SocketClientId(client_id.to_string()))
    }
}

pub async fn socket_handler_with_metadata(
    cancel_token: CancellationToken,
    mut data_channel: broadcast::Receiver<ClientData>,
    rules_manager: Arc<RuleManager>,
    io: SocketIo,
) {
    info!(task = "socket_handler_with_metadata", "starting");
    let mut upload_counter = 0u8;

    // BEGIN METADATA

    // INTERVAL TIMERS for periodic things to be sent
    let mut view_interval = tokio::time::interval(Duration::from_millis(500));
    let mut timers_interval = tokio::time::interval(Duration::from_secs(1));
    let mut recent_faults_interval = tokio::time::interval(Duration::from_secs(1));
    let mut message_rate_interval = tokio::time::interval(Duration::from_secs(2));

    // init timers
    let mut timer_map: FxHashMap<String, TimerData> = FxHashMap::default();
    for item in TIMERS_TOPICS {
        timer_map.insert(
            item.to_string(),
            TimerData {
                topic: item,
                last_change: chrono::offset::Utc::now(), // ensure that UTC offset is now
                last_value: -1.0f32, // create a value that isn't possibly in the range of statuses
                total_time_per_value_map: FxHashMap::default(),
            },
        );
    }

    // init faults, only cirtical faults, as of 3/31 can JSON
    let fault_regex_bms: Regex =
        Regex::new(r"BMS\/Faults\/(.*)").expect("Could not compile regex!");
    let fault_regex_charger: Regex =
        Regex::new(r"Charger\/Box\/F_(.*)").expect("Could not compile regex!");
    let fault_regex_mpu: Regex =
        Regex::new(r"MPU\/Fault\/Critical\/(.*)").expect("Could not compile regex!");
    let mut fault_ringbuffer = AllocRingBuffer::<FaultData>::new(100);

    // END METADATA

    // BEGIN rules
    // socket_map must not be written outside of these closures.
    // a map of client_ids to their respective socket IDs for identifying where notifications go
    let client_socket_map: Arc<RwLock<FxHashMap<String, Sid>>> =
        Arc::new(RwLock::new(FxHashMap::default()));
    let writable_socket_map = client_socket_map.clone();
    io.ns(
        "/",
        |socket: SocketRef, SocketClientId(client_id): SocketClientId| async move {
            // unfortunate locking and ref counting due to the async closures
            let mut owned = writable_socket_map.write().await;
            if client_id.is_empty() {
                warn!("Could not extract clientId query parameter, client unauthenticated");
                return;
            }

            debug!(
                "Establishing client connection with {} on socket_id {}",
                client_id, socket.id
            );
            owned.insert(client_id.clone(), socket.id);
            drop(owned);

            socket.on_disconnect(async move || {
                writable_socket_map.write().await.remove(&client_id);
            });
        },
    );

    let mut msg_cnt = 0u64;
    let mut last_instant = tokio::time::Instant::now();

    let mut heartbeat = tokio::time::interval(Duration::from_secs(30));
    let mut iter_count: u64 = 0;
    let mut msgs_since_hb: u64 = 0;

    loop {
        iter_count = iter_count.wrapping_add(1);
        tokio::select! {
            _ = cancel_token.cancelled() => {
                debug!("Shutting down socket handler!");
                break;
            },
            Ok(data) = data_channel.recv() => {
                msg_cnt += 1;
                msgs_since_hb = msgs_since_hb.wrapping_add(1);
                send_socket_msg(
                    &data,
                    &mut upload_counter,
                    &io,
                    DATA_SOCKET_KEY,
                ).await;
                handle_socket_msg(&data, &fault_regex_mpu, &fault_regex_bms, &fault_regex_charger, &mut timer_map, &mut fault_ringbuffer);
                handle_rule_processing(&data, &rules_manager, &client_socket_map, &io).await;
            }
            _ = heartbeat.tick() => {
                info!(
                    task = "socket_handler_with_metadata",
                    iter = iter_count,
                    data_channel_len = data_channel.len(),
                    msgs_in_window = msgs_since_hb,
                    "heartbeat"
                );
                msgs_since_hb = 0;
            }
            _ = recent_faults_interval.tick() => {
                send_socket_msg(
                    &fault_ringbuffer.to_vec(),
                    &mut upload_counter,
                        &io,
                        FAULT_SOCKET_KEY,
                ).await
            },
            _ = timers_interval.tick() => {
                trace!("Sending Timers Intervals!");
                for item in timer_map.values() {
                    send_socket_msg(item, &mut upload_counter, &io, TIMER_SOCKET_KEY).await;
                }
            },
            _ = view_interval.tick() => {
                    trace!("Updating viewership data!");
                    let sockets_cnt = io.sockets().len() as f32;
                    let item = ClientData {
                        name: "Argos/Viewers".to_string(),
                        unit: "".to_string(),
                        run_id: crate::RUN_ID.load(Ordering::Relaxed),
                        timestamp: chrono::offset::Utc::now(),
                        values: vec![sockets_cnt]
                    };
                    send_socket_msg(
                        &item,
                        &mut upload_counter,
                        &io,
                        METADATA_SOCKET_KEY,
                    ).await;
            },
            _ = message_rate_interval.tick() => {
                let rate = (msg_cnt as f32 / (tokio::time::Instant::now() - last_instant).as_millis() as f32) * 1000f32;
                debug!("Updating message rate to be {} msg/sec", rate);
                let item = ClientData {
                    name: "Argos/Message_Rate".to_string(),
                    unit: "".to_string(),
                    run_id: crate::RUN_ID.load(Ordering::Relaxed),
                    timestamp: chrono::offset::Utc::now(),
                    values: vec![rate]
                };
                send_socket_msg(
                        &item,
                        &mut upload_counter,
                        &io,
                        METADATA_SOCKET_KEY,
                    ).await;
                msg_cnt = 0;
                last_instant = tokio::time::Instant::now();
            }
        }
    }
}

/// Handles triggering rules based on a recieved datapoint
async fn handle_rule_processing(
    data: &ClientData,
    rule_manager: &Arc<RuleManager>,
    client_socket_map: &Arc<RwLock<FxHashMap<String, Sid>>>,
    io: &SocketIo,
) {
    let Ok(Some(notifs)) = rule_manager.handle_msg(data).await else {
        return;
    };

    for notification in notifs {
        // Copy the sid and drop the read lock before any async work
        let sid_opt = {
            let read_clients = client_socket_map.read().await;
            read_clients.get(&notification.0.0).copied()
        };
        let Some(sid) = sid_opt else {
            warn!(
                "Could not find client to deliver notification, deleting client {}",
                notification.0.0
            );
            let _ = rule_manager.delete_client(notification.0).await;
            continue;
        };
        debug!(
            "Sending notification of {} to {}",
            notification.1.topic, notification.0
        );
        let Some(socket) = io.get_socket(sid) else {
            warn!(
                "Could not find client socket, deleting client {}",
                notification.0.0
            );
            let _ = rule_manager.delete_client(notification.0).await;
            continue;
        };
        if let Err(err) = socket.emit(RULE_SOCKET_KEY, &notification.1) {
            warn!(
                "Could not send rule notification to {}, err {}",
                notification.0, err
            );
        } else {
            debug!("Successfully sent notification to {}", notification.0);
        };
    }
}

/// Handles parsing and creating metadata for a newly received socket message.
fn handle_socket_msg(
    data: &ClientData,
    fault_regex_mpu: &Regex,
    fault_regex_bms: &Regex,
    fault_regex_charger: &Regex,
    timer_map: &mut FxHashMap<String, TimerData>,
    fault_ringbuffer: &mut AllocRingBuffer<FaultData>,
) {
    // check to see if we fit a timer case, and then act upon it
    // IMPORTANT: assumes a timer is never also a fault
    if let Some(time) = timer_map.get_mut(&data.name) {
        trace!("Triggering timer: {}", data.name);
        let new_val = *data.values.first().unwrap_or(&-1f32);
        if time.last_value != new_val {
            // retrieves previous total time for the last value
            let prev_val = time
                .total_time_per_value_map
                .get_mut(&time.last_value.to_string());
            // create a record of the time the last value started, and record that it has now ended.
            let new_total_val = TotalTimerData {
                start_time: time.last_change,
                end_time: Utc::now(),
            };
            // insert the record, into the total record for the given value
            // (e.g. '0' was on from 10:00 to 10:15, is added to the vec
            // of all the previous)
            if let Some(prev_val) = prev_val {
                let mut new_vec = prev_val.to_vec();
                new_vec.push(new_total_val);
                time.total_time_per_value_map
                    .insert(time.last_value.to_string(), new_vec);
            } else if time.last_change.timestamp_millis() != 0 {
                let new_vec = vec![new_total_val];
                time.total_time_per_value_map
                    .insert(time.last_value.to_string(), new_vec);
            }

            time.last_value = new_val;
            time.last_change = Utc::now();
        }
        return;
    }

    // check to see if this is a fault, and return the fault name and node
    // each bring is the logic to get a node, note the difference in DTI
    let (flt_txt, node) = match fault_regex_bms.captures_iter(&data.name).next() {
        Some(mtch) => (mtch.get(1).map_or("", |m| m.as_str()), Node::Bms),
        _ => match fault_regex_charger.captures_iter(&data.name).next() {
            Some(mtch) => (mtch.get(1).map_or("", |m| m.as_str()), Node::Charger),
            _ => match fault_regex_mpu.captures_iter(&data.name).next() {
                Some(mtch) => (mtch.get(1).map_or("", |m| m.as_str()), Node::Mpu),
                _ => {
                    if FAULT_BINS[0] == data.name {
                        let Some(flt) = map_dti_flt(*data.values.first().unwrap_or(&0f32) as usize)
                        else {
                            return;
                        };
                        (flt, Node::Dti)
                    } else {
                        return;
                    }
                }
            },
        },
    };

    // flt_text is the fault text name
    trace!("Matched on {}, {:?}", flt_txt, node);

    // default to sending a new fault
    //fault_ringbuffer is basically json of the most recent error
    let mut should_push = true;
    // iterate through current faults
    for item in fault_ringbuffer.iter_mut() {
        // if a fault of the same type is in the queue, and not expired

        if item.name == flt_txt && node.clone() == item.node && !item.expired {
            // update the last seen metric
            should_push = false;
            // if the time since the last fault is greater than [FAULT_MIN_REG_GAP], mark this fault as expired

            if (item.last_seen - data.timestamp) > FAULT_MIN_REG_GAP {
                item.expired = true;
                should_push = true;
            } else {
                // otherwise, if the fault isnt expired, ensure we dont create a duplicate fault
                item.last_seen = data.timestamp;
            }
        }
    }
    // send a new fault if no message matches and is not expired
    if should_push {
        fault_ringbuffer.enqueue(FaultData {
            node,
            name: flt_txt.to_string(),
            occured_at: data.timestamp,
            last_seen: data.timestamp,
            expired: false,
        });
    }
}

/// Sends a message to the socket, printing and IGNORING any error that may occur
/// * `client_data` - The client data to send over the broadcast
/// * `upload_counter` - The counter of data that has been uploaded, for basic rate limiting
/// * `upload-ratio` - The rate limit ratio
/// * `io` - The socket to upload to
/// * `socket_key` - The socket key to send to
async fn send_socket_msg<T>(
    client_data: &T,
    upload_counter: &mut u8,
    io: &SocketIo,
    socket_key: &'static str,
) where
    T: Serialize,
{
    *upload_counter = upload_counter.wrapping_add(1);
    if *upload_counter >= SOCKET_DISCARD_PERCENT.load(Ordering::Relaxed) {
        match io
            .emit(
                socket_key,
                &serde_json::to_string(client_data).expect("Could not serialize ClientData"),
            )
            .await
        {
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
        trace!("Discarding message!");
    }
}
