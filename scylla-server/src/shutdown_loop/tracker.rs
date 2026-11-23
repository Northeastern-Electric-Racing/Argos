//! Keeps the latest shutdown readings and turns them into the `Argos/Shutdown/*` datapoints scylla
//! publishes (ADR 0009): the loop status, and Fault topics for loop breaks, mismatches and CAN latch trips.

use rustc_hash::{FxHashMap, FxHashSet};

use super::model::{Board, CAN_LATCH_TOPIC, SHUTDOWN_LOOP, VCU_CRITICAL_FAULT_TOPICS};
use super::status::{LoopStatus, Reading, Readings, apply_derived_readings, compute_loop_status};
use crate::metadata_structs::Node;

pub const VERDICT_TOPIC: &str = "Argos/Shutdown/Verdict";
pub const BREAK_NODE_TOPIC: &str = "Argos/Shutdown/BreakNode";
pub const NODE_STATES_TOPIC: &str = "Argos/Shutdown/NodeStates";
pub const MISMATCH_TOPIC: &str = "Argos/Shutdown/Mismatch";
pub const DERIVED_CAN_LATCH_TOPIC: &str = "Argos/Shutdown/CAN_Latch";
/// Fault topics are `{prefix}{Vcu|Bms}/{name}`: 1 while the Fault is active, 0 once when it clears
pub const FAULT_TOPIC_PREFIX: &str = "Argos/Shutdown/Fault/";
/// Everything scylla itself publishes for the shutdown loop starts with this
pub const SHUTDOWN_TOPIC_PREFIX: &str = "Argos/Shutdown/";

/// A Fault this module raises, attributed to the board (CAN node) that saw it
#[derive(Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct FaultKey {
    pub board: Board,
    pub name: String,
}

impl FaultKey {
    #[must_use]
    pub fn topic(&self) -> String {
        format!(
            "{FAULT_TOPIC_PREFIX}{}/{}",
            self.board.fault_segment(),
            self.name
        )
    }
}

/// The CAN node and Fault name in a shutdown Fault topic, if `topic` is one
#[must_use]
pub fn parse_fault_topic(topic: &str) -> Option<(Node, &str)> {
    let (node, name) = topic.strip_prefix(FAULT_TOPIC_PREFIX)?.split_once('/')?;
    let node = match node {
        "Vcu" => Node::Vcu,
        "Bms" => Node::Bms,
        _ => return None,
    };
    (!name.is_empty()).then_some((node, name))
}

fn upper_id(id: &str) -> String {
    id.replace('-', "_").to_uppercase()
}

/// The Faults active for `status`: where the loop broke (the board whose reading found it), any
/// node reading against the break, and each live critical VCU fault holding the CAN latch open
#[must_use]
pub fn active_faults(status: &LoopStatus, readings: &Readings, now: i64) -> FxHashSet<FaultKey> {
    let mut faults = FxHashSet::default();
    if let Some(b) = status.break_idx
        && let Some(board) = SHUTDOWN_LOOP[b].board
    {
        faults.insert(FaultKey {
            board,
            name: format!("Shutdown_Open_{}", upper_id(SHUTDOWN_LOOP[b].id)),
        });
    }
    for (node, s) in SHUTDOWN_LOOP.iter().zip(&status.nodes) {
        if s.mismatch
            && let Some(board) = node.board
        {
            faults.insert(FaultKey {
                board,
                name: format!("Shutdown_Mismatch_{}", upper_id(node.id)),
            });
        }
    }
    for topic in VCU_CRITICAL_FAULT_TOPICS {
        if readings
            .get(topic)
            .is_some_and(|r| r.is_live(now) && r.value != 0.0)
        {
            let fault = topic.rsplit('/').next().unwrap_or(topic);
            faults.insert(FaultKey {
                board: Board::Vcu,
                name: format!("CAN_Latch_{fault}"),
            });
        }
    }
    faults
}

/// What the status topics last said, to publish again only on change between heartbeats
#[derive(Clone, Debug, PartialEq)]
struct Snapshot {
    verdict: f32,
    break_node: f32,
    node_states: Vec<f32>,
    mismatch: f32,
    can_latch: Option<f32>,
}

/// Latest shutdown readings and the Faults last published
#[derive(Default)]
pub struct ShutdownTracker {
    readings: Readings,
    inputs: FxHashSet<&'static str>,
    active: FxHashSet<FaultKey>,
    last: Option<Snapshot>,
}

impl ShutdownTracker {
    #[must_use]
    pub fn new() -> Self {
        let inputs = SHUTDOWN_LOOP
            .iter()
            .filter_map(|n| n.topic)
            .filter(|t| *t != CAN_LATCH_TOPIC)
            .chain(VCU_CRITICAL_FAULT_TOPICS)
            .collect();
        Self {
            inputs,
            ..Self::default()
        }
    }

    /// Records `value` on `topic` if it is a shutdown input; returns whether it was
    pub fn record(&mut self, topic: &str, value: f32, now: i64) -> bool {
        if !value.is_finite() || !self.inputs.contains(topic) {
            return false;
        }
        let next = Reading::next(self.readings.get(topic), value, now);
        self.readings.insert(topic.to_string(), next);
        true
    }

    /// The datapoints to publish at `now` as `(topic, values)`. The status topics go out when they
    /// change, or every time when `heartbeat`; each active Fault goes out when it starts and on every
    /// heartbeat (keeping its last-seen time fresh), and once more with 0 when it clears. Nothing is
    /// published before the first shutdown reading arrives.
    pub fn evaluate(&mut self, now: i64, heartbeat: bool) -> Vec<(String, Vec<f32>)> {
        if self.readings.is_empty() {
            return Vec::new();
        }
        apply_derived_readings(&mut self.readings, now);
        let status = compute_loop_status(SHUTDOWN_LOOP, &self.readings, now);
        let snapshot = Snapshot {
            verdict: status.verdict.code(),
            break_node: status.break_idx.map_or(-1.0, |b| b as f32),
            node_states: status.nodes.iter().map(|n| n.code()).collect(),
            mismatch: if status.mismatch { 1.0 } else { 0.0 },
            can_latch: self
                .readings
                .get(CAN_LATCH_TOPIC)
                .filter(|r| r.is_live(now))
                .map(|r| r.value),
        };

        let mut out = Vec::new();
        if heartbeat || self.last.as_ref() != Some(&snapshot) {
            out.push((VERDICT_TOPIC.to_string(), vec![snapshot.verdict]));
            out.push((BREAK_NODE_TOPIC.to_string(), vec![snapshot.break_node]));
            out.push((NODE_STATES_TOPIC.to_string(), snapshot.node_states.clone()));
            out.push((MISMATCH_TOPIC.to_string(), vec![snapshot.mismatch]));
            if let Some(latch) = snapshot.can_latch {
                out.push((DERIVED_CAN_LATCH_TOPIC.to_string(), vec![latch]));
            }
            self.last = Some(snapshot);
        }

        let active = active_faults(&status, &self.readings, now);
        let mut cleared: Vec<_> = self.active.difference(&active).cloned().collect();
        cleared.sort();
        out.extend(cleared.iter().map(|f| (f.topic(), vec![0.0])));
        let mut raised: Vec<_> = active
            .iter()
            .filter(|f| heartbeat || !self.active.contains(*f))
            .cloned()
            .collect();
        raised.sort();
        out.extend(raised.iter().map(|f| (f.topic(), vec![1.0])));
        self.active = active;
        out
    }

    /// Latest readings by topic, for inspection
    #[must_use]
    pub fn readings(&self) -> &FxHashMap<String, Reading> {
        &self.readings
    }
}

#[cfg(test)]
#[allow(clippy::float_cmp)] // codes and sense values are exact
mod tests {
    use super::*;

    const NOW: i64 = 1_000_000;

    fn closed_loop(t: &mut ShutdownTracker, now: i64) {
        for node in SHUTDOWN_LOOP {
            if let Some(topic) = node.topic {
                t.record(topic, 1.0, now);
            }
        }
        for f in VCU_CRITICAL_FAULT_TOPICS {
            t.record(f, 0.0, now);
        }
    }
    fn get<'a>(out: &'a [(String, Vec<f32>)], topic: &str) -> Option<&'a Vec<f32>> {
        out.iter().find(|(t, _)| t == topic).map(|(_, v)| v)
    }

    #[test]
    fn publishes_nothing_before_any_reading() {
        let mut t = ShutdownTracker::new();
        assert!(t.evaluate(NOW, true).is_empty());
        assert!(!t.record("Some/Other/Topic", 1.0, NOW));
        assert!(!t.record(CAN_LATCH_TOPIC, 1.0, NOW));
        assert!(!t.record("VCU/Shutdown/TSMS_GPIO", f32::NAN, NOW));
        assert!(t.evaluate(NOW, true).is_empty());
    }

    #[test]
    fn publishes_status_on_change_and_heartbeat() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        let out = t.evaluate(NOW, false);
        assert_eq!(get(&out, VERDICT_TOPIC), Some(&vec![1.0]));
        assert_eq!(get(&out, BREAK_NODE_TOPIC), Some(&vec![-1.0]));
        assert_eq!(get(&out, DERIVED_CAN_LATCH_TOPIC), Some(&vec![1.0]));
        assert_eq!(
            get(&out, NODE_STATES_TOPIC).map(Vec::len),
            Some(SHUTDOWN_LOOP.len())
        );
        // Unchanged: nothing until the heartbeat
        assert!(t.evaluate(NOW + 10, false).is_empty());
        assert_eq!(
            get(&t.evaluate(NOW + 20, true), VERDICT_TOPIC),
            Some(&vec![1.0])
        );
    }

    #[test]
    fn loop_break_is_a_fault_on_the_board_that_saw_it_until_it_closes() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, true);
        for topic in [
            "VCU/Shutdown/TSMS_GPIO",
            "VCU/Shutdown/HVD_GPIO",
            "BMS/Shutdown/Acc_Sense",
            "BMS/Shutdown/TSIP_Sense",
            "BMS/Shutdown/TS_Minus_Sense",
            "BMS/Shutdown/TS_Plus_Sense",
        ] {
            t.record(topic, 0.0, NOW + 100);
        }
        let out = t.evaluate(NOW + 100, false);
        let tsms = SHUTDOWN_LOOP.iter().position(|n| n.id == "tsms").unwrap() as f32;
        assert_eq!(get(&out, VERDICT_TOPIC), Some(&vec![0.0]));
        assert_eq!(get(&out, BREAK_NODE_TOPIC), Some(&vec![tsms]));
        let fault = "Argos/Shutdown/Fault/Vcu/Shutdown_Open_TSMS";
        assert_eq!(get(&out, fault), Some(&vec![1.0]));
        // Still open: the Fault repeats on heartbeats only
        assert_eq!(get(&t.evaluate(NOW + 200, false), fault), None);
        assert_eq!(get(&t.evaluate(NOW + 300, true), fault), Some(&vec![1.0]));
        // Closed again: one 0, then nothing
        closed_loop(&mut t, NOW + 400);
        assert_eq!(get(&t.evaluate(NOW + 400, false), fault), Some(&vec![0.0]));
        assert_eq!(get(&t.evaluate(NOW + 500, true), fault), None);
    }

    #[test]
    fn can_latch_trip_is_a_vcu_fault_per_critical_fault() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.record(VCU_CRITICAL_FAULT_TOPICS[2], 1.0, NOW + 100);
        let out = t.evaluate(NOW + 100, false);
        assert_eq!(get(&out, DERIVED_CAN_LATCH_TOPIC), Some(&vec![0.0]));
        assert_eq!(
            get(
                &out,
                "Argos/Shutdown/Fault/Vcu/CAN_Latch_BMS_CAN_MONITOR_FAULT"
            ),
            Some(&vec![1.0])
        );
        assert_eq!(
            get(&out, "Argos/Shutdown/Fault/Vcu/Shutdown_Open_CAN_LATCH"),
            Some(&vec![1.0])
        );
    }

    #[test]
    fn stale_inputs_clear_faults_and_go_unknown() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.record(VCU_CRITICAL_FAULT_TOPICS[0], 1.0, NOW);
        t.evaluate(NOW, true);
        let out = t.evaluate(NOW + 61_000, true);
        assert_eq!(get(&out, VERDICT_TOPIC), Some(&vec![-1.0]));
        assert_eq!(get(&out, DERIVED_CAN_LATCH_TOPIC), None);
        assert_eq!(
            get(
                &out,
                "Argos/Shutdown/Fault/Vcu/CAN_Latch_CAN_OUTGOING_FAULT"
            ),
            Some(&vec![0.0])
        );
    }

    #[test]
    fn parses_fault_topics() {
        let key = FaultKey {
            board: Board::Bms,
            name: "Shutdown_Open_ACC_SENSE".into(),
        };
        assert_eq!(
            parse_fault_topic(&key.topic()),
            Some((Node::Bms, "Shutdown_Open_ACC_SENSE"))
        );
        assert_eq!(
            parse_fault_topic("Argos/Shutdown/Fault/Vcu/X"),
            Some((Node::Vcu, "X"))
        );
        assert_eq!(parse_fault_topic("Argos/Shutdown/Fault/Dti/X"), None);
        assert_eq!(parse_fault_topic("Argos/Shutdown/Fault/Vcu/"), None);
        assert_eq!(parse_fault_topic("BMS/Faults/X"), None);
    }
}
