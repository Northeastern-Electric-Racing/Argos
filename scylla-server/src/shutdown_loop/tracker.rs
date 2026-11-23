//! Keeps the latest shutdown readings and turns them into the `Argos/Shutdown/*` datapoints scylla
//! publishes (ADR 0009): the loop status, and Fault topics for loop openings, mismatches and CAN
//! latch trips. Times are milliseconds on scylla's monotonic clock; published datapoints carry the
//! car's timestamps.

use chrono::{DateTime, TimeDelta, Utc};
use rustc_hash::{FxHashMap, FxHashSet};

use super::model::{Board, CAN_LATCH_TOPIC, SHUTDOWN_LOOP, VCU_CRITICAL_FAULT_TOPICS};
use super::status::{
    LoopStatus, MISMATCH_GRACE_MS, Reading, Readings, Verdict, apply_derived_readings,
    compute_loop_status,
};
use crate::metadata_structs::Node;

pub const VERDICT_TOPIC: &str = "Argos/Shutdown/Verdict";
pub const BREAK_NODE_TOPIC: &str = "Argos/Shutdown/Break_Node";
pub const NODE_STATES_TOPIC: &str = "Argos/Shutdown/Node_States";
pub const MISMATCH_TOPIC: &str = "Argos/Shutdown/Mismatch";
pub const DERIVED_CAN_LATCH_TOPIC: &str = CAN_LATCH_TOPIC;
/// Fault topics are `{prefix}{Vcu|Bms}/{name}`: 1 while the Fault is active, 0 once when it clears
pub const FAULT_TOPIC_PREFIX: &str = "Argos/Shutdown/Fault/";
/// Everything scylla itself publishes for the shutdown loop starts with this
pub const SHUTDOWN_TOPIC_PREFIX: &str = "Argos/Shutdown/";

/// How long a Fault must hold before it is raised, so an opening that a later message of the same
/// frame or the other board's next frame closes again never reaches the Fault list
pub const FAULT_HOLD_MS: i64 = 500;
/// Loop nodes an operator opens on purpose (GLV master switch, TSMS, HVD): an opening blamed on
/// these alone is recorded in the status topics but is not a Fault
pub const NO_FAULT_LOOP_NODES: [&str; 3] = ["glvms", "tsms", "hvd"];
const SHUTDOWN_OPEN: &str = "Shutdown_Open_";

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

/// The Faults `status` calls for, before any hold:
/// - `Shutdown_Open_<A>` or `Shutdown_Open_<A>_TO_<B>` for the suspect stretch from A to B, on the
///   board whose reading found the break; none when every suspect is an operator switch
///   ([`NO_FAULT_LOOP_NODES`]) or the stretch is just the CAN latch (its critical faults say more);
/// - `Shutdown_Mismatch_<NODE>` on the board of each reading against the break;
/// - `CAN_Latch_<FAULT>` on `Vcu` for each live tripped critical fault.
#[must_use]
pub fn candidate_faults(status: &LoopStatus, readings: &Readings, now: i64) -> FxHashSet<FaultKey> {
    let mut faults = FxHashSet::default();
    if let Some(b) = status.break_idx
        && let Some(board) = SHUTDOWN_LOOP[b].board
    {
        let ids: Vec<&str> = status
            .suspects
            .iter()
            .map(|&i| SHUTDOWN_LOOP[i].id)
            .collect();
        let only_switches = ids.iter().all(|id| NO_FAULT_LOOP_NODES.contains(id));
        if let (Some(first), Some(last)) = (ids.first(), ids.last())
            && !only_switches
            && ids != ["can-latch"]
        {
            let name = if first == last {
                format!("{SHUTDOWN_OPEN}{}", upper_id(first))
            } else {
                format!("{SHUTDOWN_OPEN}{}_TO_{}", upper_id(first), upper_id(last))
            };
            faults.insert(FaultKey { board, name });
        }
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

/// A Fault [`candidate_faults`] has called for continuously since `since`
#[derive(Clone, Copy, Debug)]
struct Candidate {
    since: i64,
    /// Published as active (1); only these are refreshed and cleared
    raised: bool,
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

/// Datapoints to publish, all with one timestamp on the car's time base
#[derive(Clone, Debug, PartialEq)]
pub struct Publish {
    pub timestamp: DateTime<Utc>,
    pub points: Vec<(String, Vec<f32>)>,
}

/// Latest shutdown readings and the Faults last published
#[derive(Default)]
pub struct ShutdownTracker {
    readings: Readings,
    inputs: FxHashSet<&'static str>,
    faults: FxHashMap<FaultKey, Candidate>,
    last: Option<Snapshot>,
    /// Newest car timestamp among the inputs recorded since the last evaluation
    burst_stamp: Option<DateTime<Utc>>,
    /// The newest input of the latest burst: its car timestamp and when scylla received it
    newest: Option<(DateTime<Utc>, i64)>,
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

    /// Records `value` on `topic`, received at `now` and stamped `stamp` (the datapoint's
    /// timestamp: the car's, or scylla's when the car clock is unset), if it is a shutdown input;
    /// returns whether it was
    pub fn record(&mut self, topic: &str, value: f32, now: i64, stamp: DateTime<Utc>) -> bool {
        if !value.is_finite() || !self.inputs.contains(topic) {
            return false;
        }
        let next = Reading::next(self.readings.get(topic), value, now);
        self.readings.insert(topic.to_string(), next);
        if self.burst_stamp.is_none_or(|b| stamp >= b) {
            self.burst_stamp = Some(stamp);
            self.newest = Some((stamp, now));
        }
        true
    }

    /// The datapoints to publish at `now`, or `None` if there are none.
    /// - The status topics go out when they change, and on every `heartbeat` while any input is
    ///   live (so once every input is stale, the Unknown status goes out once and then nothing).
    /// - A Fault is raised (1) once [`candidate_faults`] has called for it for [`FAULT_HOLD_MS`]
    ///   and, for a `Shutdown_Open_*`, a message on the break's topic arrived after that began. It
    ///   goes out again on every heartbeat, and once with 0 as soon as it is no longer called for.
    /// - While the verdict is Unknown, raised Faults are held: not refreshed, and cleared only once
    ///   every reading of their board is live again (a dropout is not a recovery).
    ///
    /// The timestamp is the newest input's in this burst; without new input, the newest input's
    /// plus the time since scylla received it.
    pub fn evaluate(&mut self, now: i64, heartbeat: bool) -> Option<Publish> {
        let burst = self.burst_stamp.take();
        if self.readings.is_empty() {
            return None;
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
        let any_live = self
            .inputs
            .iter()
            .any(|t| self.readings.get(*t).is_some_and(|r| r.is_live(now)));

        let mut points = Vec::new();
        if self.last.as_ref() != Some(&snapshot) || (heartbeat && any_live) {
            points.push((VERDICT_TOPIC.to_string(), vec![snapshot.verdict]));
            points.push((BREAK_NODE_TOPIC.to_string(), vec![snapshot.break_node]));
            points.push((NODE_STATES_TOPIC.to_string(), snapshot.node_states.clone()));
            points.push((MISMATCH_TOPIC.to_string(), vec![snapshot.mismatch]));
            if let Some(latch) = snapshot.can_latch {
                points.push((DERIVED_CAN_LATCH_TOPIC.to_string(), vec![latch]));
            }
            self.last = Some(snapshot);
        }
        points.extend(self.update_faults(&status, now, heartbeat));

        if points.is_empty() {
            return None;
        }
        let (newest, received) = self.newest?;
        let timestamp = burst.unwrap_or_else(|| newest + TimeDelta::milliseconds(now - received));
        Some(Publish { timestamp, points })
    }

    /// Fault datapoints for `status`: clears first, then raises and refreshes, each sorted
    fn update_faults(
        &mut self,
        status: &LoopStatus,
        now: i64,
        heartbeat: bool,
    ) -> Vec<(String, Vec<f32>)> {
        let called_for = candidate_faults(status, &self.readings, now);
        let mut cleared = Vec::new();
        if status.verdict == Verdict::Unknown {
            // an unknown verdict has no break, so nothing is called for: hold what was raised
            // until its board reads again, and forget candidates that never were
            let board_live = |board: Board| {
                SHUTDOWN_LOOP
                    .iter()
                    .filter(|n| n.board == Some(board) && !n.open_only)
                    .filter_map(|n| n.topic)
                    .chain(
                        if board == Board::Vcu {
                            &VCU_CRITICAL_FAULT_TOPICS[..]
                        } else {
                            &[]
                        }
                        .iter()
                        .copied(),
                    )
                    .all(|t| self.readings.get(t).is_some_and(|r| r.is_live(now)))
            };
            self.faults.retain(|key, c| {
                let gone = board_live(key.board);
                if c.raised && gone {
                    cleared.push(key.clone());
                }
                c.raised && !gone
            });
            cleared.sort();
            return cleared.iter().map(|f| (f.topic(), vec![0.0])).collect();
        }

        self.faults.retain(|key, c| {
            let keep = called_for.contains(key);
            if c.raised && !keep {
                cleared.push(key.clone());
            }
            keep
        });
        for key in called_for {
            self.faults.entry(key).or_insert(Candidate {
                since: now,
                raised: false,
            });
        }
        // a message on the break's topic after an opening began: for a cross-board break, the
        // other board has sampled since (the derived CAN latch counts a 0x502 message)
        let break_received = status
            .break_idx
            .and_then(|b| SHUTDOWN_LOOP[b].topic)
            .and_then(|t| self.readings.get(t))
            .map(|r| r.received_at);
        let mut active = Vec::new();
        for (key, c) in &mut self.faults {
            if c.raised {
                if heartbeat {
                    active.push(key.clone());
                }
                continue;
            }
            let held = now - c.since >= FAULT_HOLD_MS;
            let sampled_since =
                !key.name.starts_with(SHUTDOWN_OPEN) || break_received.is_some_and(|r| r > c.since);
            if held && sampled_since {
                c.raised = true;
                active.push(key.clone());
            }
        }
        cleared.sort();
        active.sort();
        cleared
            .iter()
            .map(|f| (f.topic(), vec![0.0]))
            .chain(active.iter().map(|f| (f.topic(), vec![1.0])))
            .collect()
    }

    /// The earliest time after `now` at which the status or the Faults can change with no new
    /// message: a reading going stale, a mismatch grace window or a Fault hold ending
    #[must_use]
    pub fn next_deadline(&self, now: i64) -> Option<i64> {
        let readings = self.readings.values().flat_map(|r| {
            [
                r.is_live(now)
                    .then(|| r.received_at + r.stale_after_ms() + 1),
                Some(r.changed_at + MISMATCH_GRACE_MS),
            ]
        });
        let holds = self
            .faults
            .values()
            .filter(|c| !c.raised)
            .map(|c| Some(c.since + FAULT_HOLD_MS));
        readings.chain(holds).flatten().filter(|&t| t > now).min()
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
    const TSMS: &str = "VCU/Shutdown/TSMS_GPIO";

    fn stamp(ms: i64) -> DateTime<Utc> {
        DateTime::from_timestamp_millis(1_700_000_000_000 + ms).unwrap()
    }
    fn record(t: &mut ShutdownTracker, topic: &str, value: f32, now: i64) -> bool {
        t.record(topic, value, now, stamp(now))
    }
    /// Every sense topic and critical fault, closed and clear
    fn closed_loop(t: &mut ShutdownTracker, now: i64) {
        for node in SHUTDOWN_LOOP {
            if let Some(topic) = node.topic
                && !node.open_only
            {
                record(t, topic, 1.0, now);
            }
        }
        for f in VCU_CRITICAL_FAULT_TOPICS {
            record(t, f, 0.0, now);
        }
    }
    /// Every sense topic from `topic` on, in loop order, open
    fn open_from(t: &mut ShutdownTracker, topic: &str, now: i64) {
        let topics: Vec<_> = SHUTDOWN_LOOP
            .iter()
            .filter(|n| !n.open_only)
            .filter_map(|n| n.topic)
            .collect();
        let start = topics.iter().position(|t| *t == topic).unwrap();
        for topic in &topics[start..] {
            record(t, topic, 0.0, now);
        }
    }
    fn get<'a>(out: Option<&'a Publish>, topic: &str) -> Option<&'a Vec<f32>> {
        out?.points.iter().find(|(t, _)| t == topic).map(|(_, v)| v)
    }
    fn fault_points(out: Option<&Publish>) -> Vec<(String, f32)> {
        out.map(|p| {
            p.points
                .iter()
                .filter(|(t, _)| t.starts_with(FAULT_TOPIC_PREFIX))
                .map(|(t, v)| (t.clone(), v[0]))
                .collect()
        })
        .unwrap_or_default()
    }
    /// Holds the opening from `now` for a second with a frame every 250 ms, then returns the
    /// Faults raised and the time
    fn hold_open(t: &mut ShutdownTracker, topic: &str, now: i64) -> (Vec<(String, f32)>, i64) {
        let mut raised = Vec::new();
        let mut at = now;
        for _ in 0..4 {
            open_from(t, topic, at);
            raised.extend(fault_points(t.evaluate(at, false).as_ref()));
            at += 250;
        }
        (raised, at)
    }

    #[test]
    fn publishes_nothing_before_any_reading() {
        let mut t = ShutdownTracker::new();
        assert!(t.evaluate(NOW, true).is_none());
        assert!(!record(&mut t, "Some/Other/Topic", 1.0, NOW));
        assert!(!record(&mut t, CAN_LATCH_TOPIC, 1.0, NOW));
        assert!(!record(&mut t, TSMS, f32::NAN, NOW));
        assert!(t.evaluate(NOW, true).is_none());
    }

    #[test]
    fn publishes_status_on_change_and_heartbeat() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        let out = t.evaluate(NOW, false);
        assert_eq!(get(out.as_ref(), VERDICT_TOPIC), Some(&vec![1.0]));
        assert_eq!(get(out.as_ref(), BREAK_NODE_TOPIC), Some(&vec![-1.0]));
        assert_eq!(get(out.as_ref(), DERIVED_CAN_LATCH_TOPIC), Some(&vec![1.0]));
        assert_eq!(
            get(out.as_ref(), NODE_STATES_TOPIC).map(Vec::len),
            Some(SHUTDOWN_LOOP.len())
        );
        // Unchanged: nothing until the heartbeat
        assert!(t.evaluate(NOW + 10, false).is_none());
        assert_eq!(
            get(t.evaluate(NOW + 20, true).as_ref(), VERDICT_TOPIC),
            Some(&vec![1.0])
        );
    }

    // Bug: an opening was a Fault the moment it was seen, so a half-applied frame or the other
    // board's older sample raised and cleared spurious Faults on every transition
    #[test]
    fn an_opening_is_a_fault_only_once_it_has_held_and_its_topic_has_reported_again() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, true);
        open_from(&mut t, "VCU/Shutdown/CKPT_GPIO", NOW + 100);
        let fault = "Argos/Shutdown/Fault/Vcu/Shutdown_Open_COCKPIT_BRB";
        assert_eq!(get(t.evaluate(NOW + 100, false).as_ref(), fault), None);
        // held, but nothing new on the cockpit BRB topic yet
        assert_eq!(get(t.evaluate(NOW + 700, true).as_ref(), fault), None);
        open_from(&mut t, "VCU/Shutdown/CKPT_GPIO", NOW + 750);
        assert_eq!(
            get(t.evaluate(NOW + 750, false).as_ref(), fault),
            Some(&vec![1.0])
        );
        // raised: refreshed on heartbeats only
        assert_eq!(get(t.evaluate(NOW + 800, false).as_ref(), fault), None);
        assert_eq!(
            get(t.evaluate(NOW + 900, true).as_ref(), fault),
            Some(&vec![1.0])
        );
        // closed again: one 0 at once, then nothing
        closed_loop(&mut t, NOW + 1000);
        assert_eq!(
            get(t.evaluate(NOW + 1000, false).as_ref(), fault),
            Some(&vec![0.0])
        );
        assert_eq!(get(t.evaluate(NOW + 1100, true).as_ref(), fault), None);
    }

    #[test]
    fn a_short_opening_is_never_a_fault() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, true);
        open_from(&mut t, "VCU/Shutdown/BOTS_GPIO", NOW);
        assert!(fault_points(t.evaluate(NOW, false).as_ref()).is_empty());
        open_from(&mut t, "VCU/Shutdown/BOTS_GPIO", NOW + 250);
        assert!(fault_points(t.evaluate(NOW + 250, false).as_ref()).is_empty());
        closed_loop(&mut t, NOW + 300);
        assert!(fault_points(t.evaluate(NOW + 300, false).as_ref()).is_empty());
        assert!(fault_points(t.evaluate(NOW + 1000, true).as_ref()).is_empty());
    }

    // Bug: the Fault named the measurement point, so a side BRB press read "BMS latch"
    #[test]
    fn an_opening_is_named_after_its_suspect_stretch_on_the_board_that_saw_it() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        let (faults, _) = hold_open(&mut t, "VCU/Shutdown/BMS_GPIO", NOW);
        assert_eq!(
            faults,
            [(
                "Argos/Shutdown/Fault/Vcu/Shutdown_Open_SIDE_BRB_R_TO_BMS_LATCH".to_string(),
                1.0
            )]
        );

        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        let (faults, _) = hold_open(&mut t, "BMS/Shutdown/Acc_Sense", NOW);
        assert_eq!(
            faults,
            [(
                "Argos/Shutdown/Fault/Bms/Shutdown_Open_EM_INTERLOCK_TO_ACC_SENSE".to_string(),
                1.0
            )]
        );
    }

    #[test]
    fn an_operator_switch_opening_is_recorded_but_not_a_fault() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, true);
        let (faults, at) = hold_open(&mut t, TSMS, NOW);
        assert!(faults.is_empty(), "{faults:?}");
        let out = t.evaluate(at, true);
        assert_eq!(get(out.as_ref(), VERDICT_TOPIC), Some(&vec![0.0]));
        let tsms = SHUTDOWN_LOOP.iter().position(|n| n.id == "tsms").unwrap() as f32;
        assert_eq!(get(out.as_ref(), BREAK_NODE_TOPIC), Some(&vec![tsms]));
    }

    #[test]
    fn a_can_latch_trip_is_a_fault_per_critical_fault_and_no_loop_opening() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, true);
        let mut raised = Vec::new();
        for at in [NOW + 100, NOW + 350, NOW + 600, NOW + 850] {
            closed_loop(&mut t, at);
            record(&mut t, VCU_CRITICAL_FAULT_TOPICS[2], 1.0, at);
            let out = t.evaluate(at, false);
            if at == NOW + 100 {
                assert_eq!(get(out.as_ref(), DERIVED_CAN_LATCH_TOPIC), Some(&vec![0.0]));
            }
            raised.extend(fault_points(out.as_ref()));
        }
        assert_eq!(
            raised,
            [(
                "Argos/Shutdown/Fault/Vcu/CAN_Latch_BMS_CAN_MONITOR_FAULT".to_string(),
                1.0
            )]
        );
    }

    // Bug: once a reading had arrived, the status went out every second forever, even with the
    // car off
    #[test]
    fn heartbeats_stop_once_every_input_is_stale_and_resume_with_new_input() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, true);
        let out = t.evaluate(NOW + 61_000, true);
        assert_eq!(get(out.as_ref(), VERDICT_TOPIC), Some(&vec![-1.0]));
        assert_eq!(get(out.as_ref(), DERIVED_CAN_LATCH_TOPIC), None);
        for k in (62_000..=600_000).step_by(1000) {
            assert!(t.evaluate(NOW + k, true).is_none(), "{k}");
        }
        record(&mut t, TSMS, 1.0, NOW + 601_000);
        assert!(get(t.evaluate(NOW + 601_000, true).as_ref(), VERDICT_TOPIC).is_some());
    }

    // Bug: a VCU dropout cleared every Fault, which read as a recovery on the Faults page
    #[test]
    fn faults_are_held_while_unknown_and_cleared_once_their_board_reads_again() {
        let mut t = ShutdownTracker::new();
        closed_loop(&mut t, NOW);
        let (faults, at) = hold_open(&mut t, "VCU/Shutdown/BOTS_GPIO", NOW);
        let fault = "Argos/Shutdown/Fault/Vcu/Shutdown_Open_BOTS";
        assert_eq!(faults, [(fault.to_string(), 1.0)]);
        // every input stale: unknown, the Fault neither refreshed nor cleared
        let out = t.evaluate(at + 61_000, true);
        assert_eq!(get(out.as_ref(), VERDICT_TOPIC), Some(&vec![-1.0]));
        assert!(fault_points(out.as_ref()).is_empty());
        // the BMS alone comes back: still unknown for the VCU's Fault
        for topic in [
            "BMS/Shutdown/Acc_Sense",
            "BMS/Shutdown/TSIP_Sense",
            "BMS/Shutdown/TS_Minus_Sense",
            "BMS/Shutdown/TS_Plus_Sense",
        ] {
            record(&mut t, topic, 1.0, at + 62_000);
        }
        assert!(fault_points(t.evaluate(at + 62_000, true).as_ref()).is_empty());
        // the VCU reads closed again
        closed_loop(&mut t, at + 63_000);
        assert_eq!(
            fault_points(t.evaluate(at + 63_000, false).as_ref()),
            [(fault.to_string(), 0.0)]
        );
    }

    // Bug: the datapoints carried scylla's clock while the car's carried the car's, so history
    // showed the verdict shifted against the readings that caused it
    #[test]
    fn publishes_on_the_car_time_base() {
        let mut t = ShutdownTracker::new();
        let car = stamp(-600_000);
        for node in SHUTDOWN_LOOP {
            if let Some(topic) = node.topic
                && !node.open_only
            {
                t.record(topic, 1.0, NOW, car);
            }
        }
        for f in VCU_CRITICAL_FAULT_TOPICS {
            t.record(f, 0.0, NOW, car);
        }
        assert_eq!(t.evaluate(NOW + 25, false).unwrap().timestamp, car);
        assert_eq!(
            t.evaluate(NOW + 1000, true).unwrap().timestamp,
            car + TimeDelta::milliseconds(1000)
        );
        // a burst is stamped with its newest input
        t.record(TSMS, 1.0, NOW + 1200, car + TimeDelta::milliseconds(1199));
        t.record(
            "VCU/Shutdown/HVD_GPIO",
            1.0,
            NOW + 1201,
            car + TimeDelta::milliseconds(1201),
        );
        assert_eq!(
            t.evaluate(NOW + 1225, true).unwrap().timestamp,
            car + TimeDelta::milliseconds(1201)
        );
    }

    #[test]
    fn next_deadline_is_the_earliest_staleness_grace_or_hold() {
        let mut t = ShutdownTracker::new();
        assert_eq!(t.next_deadline(NOW), None);
        closed_loop(&mut t, NOW);
        t.evaluate(NOW, false);
        // single messages: stale after 60 s, once their change times are past the grace window
        assert_eq!(t.next_deadline(NOW + 500), Some(NOW + 60_001));
        open_from(&mut t, "VCU/Shutdown/BOTS_GPIO", NOW + 1000);
        t.evaluate(NOW + 1000, false);
        // the BOTS opening's grace window and its Fault hold both end 500 ms after it
        assert_eq!(t.next_deadline(NOW + 1000), Some(NOW + 1500));
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
