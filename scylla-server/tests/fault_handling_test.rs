use chrono::{DateTime, TimeDelta, Utc};
use regex::Regex;
use ringbuffer::{AllocRingBuffer, RingBuffer};
use rustc_hash::FxHashMap;
use scylla_server::{
    metadata_structs::{FaultData, Node, TimerData, FAULT_MIN_REG_GAP},
    ClientData,
};

/// Test the handle_socket_msg function for fault handling behavior
/// This is a simplified version focusing just on the fault logic
fn handle_socket_msg_test(
    data: &ClientData,
    fault_regex_mpu: &Regex,
    fault_regex_bms: &Regex,
    fault_regex_charger: &Regex,
    timer_map: &mut FxHashMap<String, TimerData>,
    fault_ringbuffer: &mut AllocRingBuffer<FaultData>,
) {
    use scylla_server::metadata_structs::{map_dti_flt, FAULT_BINS};

    // check to see if we fit a timer case, and then act upon it
    // IMPORTANT: assumes a timer is never also a fault
    if timer_map.get_mut(&data.name).is_some() {
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

    // default to sending a new fault
    let mut should_push = true;
    // iterate through current faults
    for item in fault_ringbuffer.iter_mut() {
        // if a fault of the same type is in the queue, and not expired
        if item.name == flt_txt && node.clone() == item.node && !item.expired {
            // check if enough time has passed since the fault was last seen to expire it
            if (data.timestamp - item.last_seen) > FAULT_MIN_REG_GAP {
                item.expired = true;
            } else {
                // if the fault is still active, update the last seen metric
                item.last_seen = data.timestamp;
                // ensure we dont create a duplicate fault
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

/// Test helper to expire faults that haven't been seen for too long
fn expire_old_faults(fault_ringbuffer: &mut AllocRingBuffer<FaultData>, current_time: DateTime<Utc>) {
    for item in fault_ringbuffer.iter_mut() {
        if !item.expired && (current_time - item.last_seen) > FAULT_MIN_REG_GAP {
            item.expired = true;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fault_expiration_logic() {
        let fault_regex_bms = Regex::new(r"BMS\/Faults\/(.*)").unwrap();
        let fault_regex_charger = Regex::new(r"Charger\/Box\/F_(.*)").unwrap();
        let fault_regex_mpu = Regex::new(r"MPU\/Fault\/Critical\/(.*)").unwrap();
        let mut timer_map: FxHashMap<String, TimerData> = FxHashMap::default();
        let mut fault_ringbuffer = AllocRingBuffer::<FaultData>::new(25);

        let base_time = Utc::now();

        // Create a fault
        let fault_data = ClientData {
            name: "BMS/Faults/Battery_Therm".to_string(),
            unit: "".to_string(),
            run_id: 1,
            timestamp: base_time,
            values: vec![1.0],
        };

        // Process the first fault
        handle_socket_msg_test(
            &fault_data,
            &fault_regex_mpu,
            &fault_regex_bms,
            &fault_regex_charger,
            &mut timer_map,
            &mut fault_ringbuffer,
        );

        // Should have one fault that's not expired
        assert_eq!(fault_ringbuffer.len(), 1);
        let fault = &fault_ringbuffer[0];
        assert_eq!(fault.name, "Battery_Therm");
        assert_eq!(fault.node, Node::Bms);
        assert!(!fault.expired);
        assert_eq!(fault.last_seen, base_time);

        // Process the same fault again within the gap period
        let second_time = base_time + TimeDelta::seconds(4); // Within 8 second gap
        let fault_data2 = ClientData {
            name: "BMS/Faults/Battery_Therm".to_string(),
            unit: "".to_string(),
            run_id: 1,
            timestamp: second_time,
            values: vec![1.0],
        };

        handle_socket_msg_test(
            &fault_data2,
            &fault_regex_mpu,
            &fault_regex_bms,
            &fault_regex_charger,
            &mut timer_map,
            &mut fault_ringbuffer,
        );

        // Should still have one fault, but last_seen should be updated
        assert_eq!(fault_ringbuffer.len(), 1);
        let fault = &fault_ringbuffer[0];
        assert!(!fault.expired);
        assert_eq!(fault.last_seen, second_time);

        // Process the same fault again after the gap period should expire the old one
        let third_time = base_time + TimeDelta::seconds(13); // Beyond 8 second gap from last_seen (4 + 9 > 8)
        let fault_data3 = ClientData {
            name: "BMS/Faults/Battery_Therm".to_string(),
            unit: "".to_string(),
            run_id: 1,
            timestamp: third_time,
            values: vec![1.0],
        };

        handle_socket_msg_test(
            &fault_data3,
            &fault_regex_mpu,
            &fault_regex_bms,
            &fault_regex_charger,
            &mut timer_map,
            &mut fault_ringbuffer,
        );

        // Should have two faults: one expired, one new
        assert_eq!(fault_ringbuffer.len(), 2);
        let first_fault = &fault_ringbuffer[0];
        let second_fault = &fault_ringbuffer[1];
        
        assert!(first_fault.expired);
        assert_eq!(first_fault.last_seen, second_time); // Should not have been updated after expiration
        
        assert!(!second_fault.expired);
        assert_eq!(second_fault.last_seen, third_time);
    }

    #[test]
    fn test_fault_expiration_during_interval() {
        let mut fault_ringbuffer = AllocRingBuffer::<FaultData>::new(25);
        
        let base_time = Utc::now();
        
        // Add a fault
        fault_ringbuffer.push(FaultData {
            node: Node::Bms,
            name: "Test_Fault".to_string(),
            occured_at: base_time,
            last_seen: base_time,
            expired: false,
        });

        // Check that fault is not expired initially
        assert!(!fault_ringbuffer[0].expired);

        // Simulate interval tick after the expiration time
        let expiration_time = base_time + TimeDelta::seconds(10); // Beyond 8 second gap
        expire_old_faults(&mut fault_ringbuffer, expiration_time);

        // Fault should now be expired
        assert!(fault_ringbuffer[0].expired);
    }
}