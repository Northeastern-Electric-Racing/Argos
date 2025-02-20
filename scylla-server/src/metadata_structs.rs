use ::serde::Serialize;
use chrono::{DateTime, TimeDelta, Utc, serde::ts_milliseconds};

pub const DATA_SOCKET_KEY: &str = "data";

#[derive(Serialize)]
pub struct TimerData {
    /// the topic being timed
    pub topic: &'static str,
    /// the last time the value changed
    #[serde(with = "ts_milliseconds")]
    pub last_change: DateTime<Utc>,
    /// the value at the above time
    pub last_value: f32,
}
pub const TIMER_SOCKET_KEY: &str = "timers";
pub const TIMERS_TOPICS: &[&str] = &[
    "BMS/Status/Balancing",
    "BMS/Status/State",
    "BMS/Charging/Control",
];

#[derive(Serialize, PartialEq, Clone, Debug)]
pub enum Node {
    Bms,
    Dti,
    Mpu,
    Charger,
}

#[derive(Serialize, Clone)]
pub struct FaultData {
    /// the node the fault came from
    pub node: Node,
    /// the word describing the fault
    pub name: String,
    /// when the fault occured
    #[serde(with = "ts_milliseconds")]
    pub occured_at: DateTime<Utc>,
    /// when the fault was last seen
    #[serde(with = "ts_milliseconds")]
    pub last_seen: DateTime<Utc>,
    /// whether another fault of the same node and name as occured after this fault
    pub expired: bool,
}
pub const FAULT_SOCKET_KEY: &str = "faults";
pub const FAULT_MIN_REG_GAP: TimeDelta = TimeDelta::seconds(8);

pub const FAULT_BINS: &[&str] = &["DTI/Fault/FaultCode"];

#[must_use]
pub const fn map_dti_flt(index: usize) -> Option<&'static str> {
    match index {
        1 => Some("Overvoltage"),
        3 => Some("DRV"),
        4 => Some("ABS_Overcurrent"),
        5 => Some("CTLR_Overtemp"),
        6 => Some("Motor_Overtemp"),
        7 => Some("Sensor_wire"),
        8 => Some("Sensor_general"),
        9 => Some("CAN_command"),
        0x0A => Some("Analog_input"),
        // 0 and 2 are not an actual alerting fault
        _ => None,
    }
}
