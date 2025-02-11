use chrono::{DateTime, Utc};
use regex::Regex;
use ringbuffer::{AllocRingBuffer, RingBuffer};
use serde::Serialize;
use socketioxide::SocketIo;
use std::{collections::HashMap, sync::atomic::Ordering, time::Duration};
use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;
use tracing::{debug, trace, warn};

use crate::metadata_structs::{
    map_dti_flt, FaultData, Node, TimerData, DATA_SOCKET_KEY, FAULT_BINS, FAULT_MIN_REG_GAP,
    FAULT_SOCKET_KEY, TIMERS_TOPICS, TIMER_SOCKET_KEY,
};
use crate::ClientData;

pub async fn socket_handler(
    cancel_token: CancellationToken,
    mut data_channel: broadcast::Receiver<ClientData>,
    upload_ratio: u8,
    io: SocketIo,
) {
    let mut upload_counter = 0u8;
    loop {
        tokio::select! {
            _ = cancel_token.cancelled() => {
                debug!("Shutting down socket handler!");
                break;
            },
            Ok(data) = data_channel.recv() => {
                send_socket_msg(&data, &mut upload_counter, upload_ratio, &io, DATA_SOCKET_KEY);
            }
        }
    }
}

pub async fn socket_handler_with_metadata(
    cancel_token: CancellationToken,
    mut data_channel: broadcast::Receiver<ClientData>,
    upload_ratio: u8,
    io: SocketIo,
) {
    let mut upload_counter = 0u8;

    // INTERVAL TIMERS for periodic things to be sent
    let mut view_interval = tokio::time::interval(Duration::from_secs(3));
    let mut timers_interval = tokio::time::interval(Duration::from_secs(1));
    let mut recent_faults_interval = tokio::time::interval(Duration::from_secs(1));

    // init timers
    let mut timer_map: HashMap<String, TimerData> = HashMap::new();
    for item in TIMERS_TOPICS {
        timer_map.insert(
            item.to_string(),
            TimerData {
                topic: item,
                last_change: DateTime::UNIX_EPOCH,
                last_value: 0.0f32,
            },
        );
    }

    // init faults
    let fault_regex_bms: Regex =
        Regex::new(r"BMS\/Status\/F\/(.*)").expect("Could not compile regex!");
    let fault_regex_charger: Regex =
        Regex::new(r"Charger\/Box\/F_(.*)").expect("Could not compile regex!");
    let fault_regex_mpu: Regex =
        Regex::new(r"MPU\/Fault\/F_(.*)").expect("Could not compile regex!");
    let mut fault_ringbuffer = AllocRingBuffer::<FaultData>::new(25);

    loop {
        tokio::select! {
            _ = cancel_token.cancelled() => {
                debug!("Shutting down socket handler!");
                break;
            },
            Ok(data) = data_channel.recv() => {
                send_socket_msg(
                    &data,
                    &mut upload_counter,
                    upload_ratio,
                    &io,
                    DATA_SOCKET_KEY,
                );
                handle_socket_msg(data, &fault_regex_mpu, &fault_regex_bms, &fault_regex_charger, &mut timer_map, &mut fault_ringbuffer);
            }
            _ = recent_faults_interval.tick() => {
                send_socket_msg(
                    &fault_ringbuffer.to_vec(),
                    &mut upload_counter,
                        upload_ratio,
                        &io,
                        FAULT_SOCKET_KEY,
                )
            },
            _ = timers_interval.tick() => {
                trace!("Sending Timers Intervals!");
                for item in timer_map.values() {
                    send_socket_msg(item, &mut upload_counter, upload_ratio, &io, TIMER_SOCKET_KEY);
                }

            },
            _ = view_interval.tick() => {
                    trace!("Updating viewership data!");
                    let sockets = io.sockets();
                    let sockets_cnt = match sockets {
                        Ok(s) => s.len() as f32,
                        Err(_) => -1f32,
                    };
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
                        upload_ratio,
                        &io,
                        DATA_SOCKET_KEY,
                    );
            }
        }
    }
}

/// Handles parsing and creating metadata for a newly received socket message.
fn handle_socket_msg(
    data: ClientData,
    fault_regex_mpu: &Regex,
    fault_regex_bms: &Regex,
    fault_regex_charger: &Regex,
    timer_map: &mut HashMap<String, TimerData>,
    fault_ringbuffer: &mut AllocRingBuffer<FaultData>,
) {
    // check to see if we fit a timer case, and then act upon it
    // IMPORTANT: assumes a timer is never also a fault
    if let Some(time) = timer_map.get_mut(&data.name) {
        trace!("Triggering timer: {}", data.name);
        let new_val = *data.values.first().unwrap_or(&-1f32);
        if time.last_value != new_val {
            time.last_value = new_val;
            time.last_change = Utc::now();
        }
        return;
    }

    // check to see if this is a fault, and return the fault name and node
    // each bring is the logic to get a node, note the difference in DTI
    let (flt_txt, node) = if let Some(mtch) = fault_regex_bms.captures_iter(&data.name).next() {
        (mtch.get(1).map_or("", |m| m.as_str()), Node::Bms)
    } else if let Some(mtch) = fault_regex_charger.captures_iter(&data.name).next() {
        (mtch.get(1).map_or("", |m| m.as_str()), Node::Charger)
    } else if let Some(mtch) = fault_regex_mpu.captures_iter(&data.name).next() {
        (mtch.get(1).map_or("", |m| m.as_str()), Node::Mpu)
    } else if FAULT_BINS[0] == data.name {
        let Some(flt) = map_dti_flt(*data.values.first().unwrap_or(&0f32) as usize) else {
            return;
        };
        (flt, Node::Dti)
    } else {
        return;
    };

    trace!("Matched on {}, {:?}", flt_txt, node);

    // default to sending a new fault
    let mut should_push = true;
    // iterate through current faults
    for item in fault_ringbuffer.iter_mut() {
        // if a fault of the same type is in the queue, and not expired
        if item.name == flt_txt && node.clone() == item.node && !item.expired {
            // update the last seen metric
            item.last_seen = data.timestamp;
            // if the time since the last fault is greater than [FAULT_MIN_REG_GAP], mark this fault as expired
            if (data.timestamp - item.last_seen) > FAULT_MIN_REG_GAP {
                item.expired = true;
            } else {
                // otherwise, if the fault isnt expired, ensure we dont create a duplicate fault
                should_push = false;
            }
        }
    }
    // send a new fault if no message matches and is not expired
    if should_push {
        fault_ringbuffer.push(FaultData {
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
fn send_socket_msg<T>(
    client_data: &T,
    upload_counter: &mut u8,
    upload_ratio: u8,
    io: &SocketIo,
    socket_key: &'static str,
) where
    T: Serialize,
{
    *upload_counter = upload_counter.wrapping_add(1);
    if *upload_counter >= upload_ratio {
        match io.emit(
            socket_key,
            &serde_json::to_string(client_data).expect("Could not serialize ClientData"),
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
        trace!("Discarding message!");
    }
}
