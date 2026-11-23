//! Where the shutdown loop is broken. A port of the angular-client's `shutdown-loop.utils.ts`
//! (`computeLoopStatus` and helpers): keep the two in step. Times are milliseconds since the epoch,
//! taken when scylla received each message (never the car's clock).

use rustc_hash::FxHashMap;

use super::model::{Board, CAN_LATCH_TOPIC, LoopNode, VCU_CRITICAL_FAULT_TOPICS};

/// Timeout before a topic's message rate is known, and the most any timeout can grow to
pub const STALE_AFTER_MS: i64 = 60_000;
/// The least a timeout can shrink to
pub const MIN_STALE_AFTER_MS: i64 = 3_000;
/// A reading is stale after this many message intervals with nothing new
pub const STALE_INTERVAL_MULTIPLE: f64 = 5.0;
/// Weight of the newest gap in the smoothed message interval
pub const INTERVAL_SMOOTHING: f64 = 0.25;
/// How long a contradiction must hold before it is a mismatch
pub const MISMATCH_GRACE_MS: i64 = 500;

/// Latest value of one topic
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Reading {
    pub value: f32,
    pub received_at: i64,
    /// When `value` last changed, or when it arrived after the reading went stale
    pub changed_at: i64,
    /// Smoothed time between messages; `None` until a second message arrives
    pub interval_ms: Option<f64>,
}

impl Reading {
    /// How long this reading stays live without a new message: a few message intervals, clamped
    #[must_use]
    pub fn stale_after_ms(&self) -> i64 {
        self.interval_ms.map_or(STALE_AFTER_MS, |interval| {
            ((interval * STALE_INTERVAL_MULTIPLE) as i64).clamp(MIN_STALE_AFTER_MS, STALE_AFTER_MS)
        })
    }

    #[must_use]
    pub fn is_live(&self, now: i64) -> bool {
        now - self.received_at <= self.stale_after_ms()
    }

    /// The reading after a message with `value` arrives at `now`. After the reading went stale it
    /// starts afresh: neither its change time nor its rate carry over the gap.
    #[must_use]
    pub fn next(prev: Option<&Reading>, value: f32, now: i64) -> Reading {
        let Some(prev) = prev.filter(|p| p.is_live(now)) else {
            return Reading {
                value,
                received_at: now,
                changed_at: now,
                interval_ms: None,
            };
        };
        let gap = (now - prev.received_at) as f64;
        let interval = prev
            .interval_ms
            .map_or(gap, |i| i + INTERVAL_SMOOTHING * (gap - i));
        Reading {
            value,
            received_at: now,
            changed_at: if (prev.value - value).abs() < f32::EPSILON {
                prev.changed_at
            } else {
                now
            },
            interval_ms: Some(interval),
        }
    }
}

pub type Readings = FxHashMap<String, Reading>;

fn live<'a>(readings: &'a Readings, topic: &str, now: i64) -> Option<&'a Reading> {
    readings.get(topic).filter(|r| r.is_live(now))
}

/// The CAN latch reading derived from the VCU's critical faults: open (0) while any live fault is
/// tripped, closed (1) only while every one is live and clear, `None` otherwise
#[must_use]
pub fn derive_can_latch(readings: &Readings, now: i64) -> Option<Reading> {
    let live: Vec<&Reading> = VCU_CRITICAL_FAULT_TOPICS
        .iter()
        .filter_map(|t| live(readings, t, now))
        .collect();
    let tripped: Vec<&Reading> = live.iter().copied().filter(|r| r.value != 0.0).collect();
    if let Some(latest) = tripped.iter().max_by_key(|r| r.received_at) {
        return Some(Reading {
            value: 0.0,
            received_at: latest.received_at,
            changed_at: tripped.iter().map(|r| r.changed_at).min()?,
            interval_ms: latest.interval_ms,
        });
    }
    if live.is_empty() || live.len() != VCU_CRITICAL_FAULT_TOPICS.len() {
        return None;
    }
    let oldest = live.iter().min_by_key(|r| r.received_at)?;
    Some(Reading {
        value: 1.0,
        received_at: oldest.received_at,
        changed_at: live.iter().map(|r| r.changed_at).max()?,
        interval_ms: oldest.interval_ms,
    })
}

/// Sets (or clears) the derived CAN latch reading in `readings`
pub fn apply_derived_readings(readings: &mut Readings, now: i64) {
    match derive_can_latch(readings, now) {
        Some(latch) => readings.insert(CAN_LATCH_TOPIC.to_string(), latch),
        None => readings.remove(CAN_LATCH_TOPIC),
    };
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NodeState {
    Closed,
    Suspect,
    DownstreamOpen,
    NoData,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NodeStatus {
    pub state: NodeState,
    /// Reads closed after the break, past the grace window
    pub mismatch: bool,
}

impl NodeStatus {
    /// Code published per node on `Argos/Shutdown/NodeStates`; keep in step with `NODE_STATE_CODE`
    /// in the angular-client's `shutdown-loop.server.ts`
    #[must_use]
    pub const fn code(self) -> f32 {
        match (self.state, self.mismatch) {
            (NodeState::Closed, _) => 0.0,
            (NodeState::Suspect, _) => 1.0,
            (NodeState::DownstreamOpen, false) => 2.0,
            (NodeState::NoData, _) => 3.0,
            (NodeState::DownstreamOpen, true) => 4.0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Verdict {
    Open,
    Closed,
    Unknown,
}

impl Verdict {
    /// Published on `Argos/Shutdown/Verdict`: 1 = closed, 0 = open (like the sense bits), -1 = unknown
    #[must_use]
    pub const fn code(self) -> f32 {
        match self {
            Verdict::Closed => 1.0,
            Verdict::Open => 0.0,
            Verdict::Unknown => -1.0,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct LoopStatus {
    pub verdict: Verdict,
    pub nodes: Vec<NodeStatus>,
    /// Index of the first live measurement point reading open
    pub break_idx: Option<usize>,
    pub suspects: Vec<usize>,
    pub mismatch: bool,
}

/// Works out where the series shutdown loop is broken. Each reading is the loop voltage just after
/// its node, so the first live reading of 0 marks the break; every node between the previous live
/// reading and that one is a suspect, and everything after it is open only because of the break.
#[must_use]
pub fn compute_loop_status(nodes: &[LoopNode], readings: &Readings, now: i64) -> LoopStatus {
    let live: Vec<Option<&Reading>> = nodes
        .iter()
        .map(|n| n.topic.and_then(|t| live(readings, t, now)))
        .collect();
    let board_live = |board: Board| {
        nodes
            .iter()
            .zip(&live)
            .any(|(n, r)| n.board == Some(board) && r.is_some())
    };

    let break_idx = live.iter().position(|r| r.is_some_and(|r| r.value == 0.0));
    // With no reading before the break, the GLV master switch is still known closed while the VCU
    // publishes (GLV is on); if the VCU is silent it is a suspect too
    let mut last_closed: Option<usize> = board_live(Board::Vcu).then_some(0);
    if let Some(b) = break_idx
        && let Some(p) = (0..b).rev().find(|&i| live[i].is_some())
    {
        last_closed = Some(p);
    }
    let all_live = nodes
        .iter()
        .zip(&live)
        .all(|(n, r)| n.topic.is_none() || r.is_some());
    let last_live = live.iter().rposition(Option::is_some);
    let break_reading = break_idx.and_then(|b| live[b]);
    let break_board = break_idx.and_then(|b| nodes[b].board);

    let statuses: Vec<NodeStatus> = nodes
        .iter()
        .enumerate()
        .map(|(i, node)| {
            let closed_up_to = last_closed.is_some_and(|p| i <= p);
            // measured but not live, or unmeasured with no live reading after it to prove it closed
            let no_data = (node.topic.is_some() && live[i].is_none())
                || (break_reading.is_none()
                    && node.topic.is_none()
                    && !all_live
                    && last_live.is_none_or(|l| i > l));
            let state = if no_data {
                NodeState::NoData
            } else if break_reading.is_none() || closed_up_to {
                NodeState::Closed
            } else if break_idx.is_some_and(|b| i <= b) {
                NodeState::Suspect
            } else {
                NodeState::DownstreamOpen
            };
            let mismatch = state == NodeState::DownstreamOpen
                && match (live[i], break_reading) {
                    (Some(r), Some(b)) => is_mismatch(r, b, node.board == break_board, now),
                    _ => false,
                };
            NodeStatus { state, mismatch }
        })
        .collect();

    let silent = nodes
        .iter()
        .zip(&statuses)
        .any(|(n, s)| n.board.is_some() && s.state == NodeState::NoData);
    let suspects: Vec<usize> = (0..statuses.len())
        .filter(|&i| statuses[i].state == NodeState::Suspect)
        .collect();
    let verdict = if !suspects.is_empty() {
        Verdict::Open
    } else if silent {
        Verdict::Unknown
    } else {
        Verdict::Closed
    };
    LoopStatus {
        verdict,
        mismatch: statuses.iter().any(|s| s.mismatch),
        nodes: statuses,
        break_idx: break_reading.and(break_idx),
        suspects,
    }
}

/// A downstream reading of closed contradicts the break once both values have held for the grace
/// window; one from another board must also have arrived the grace window after the break appeared,
/// since until that board samples again its last sample may predate the break
fn is_mismatch(reading: &Reading, brk: &Reading, same_board: bool, now: i64) -> bool {
    if reading.value == 0.0 {
        return false;
    }
    let sampled_after = same_board || reading.received_at - brk.changed_at >= MISMATCH_GRACE_MS;
    sampled_after && now - brk.changed_at.max(reading.changed_at) >= MISMATCH_GRACE_MS
}

#[cfg(test)]
#[allow(clippy::float_cmp)] // codes and sense values are exact
mod tests {
    use super::super::model::SHUTDOWN_LOOP;
    use super::*;

    const NOW: i64 = 1_000_000;

    fn measured() -> impl Iterator<Item = &'static LoopNode> {
        SHUTDOWN_LOOP.iter().filter(|n| n.topic.is_some())
    }
    fn topics_of(board: Board) -> Vec<&'static str> {
        measured()
            .filter(|n| n.board == Some(board))
            .filter_map(|n| n.topic)
            .collect()
    }
    fn reading(value: f32, received_at: i64, changed_at: i64) -> Reading {
        Reading {
            value,
            received_at,
            changed_at,
            interval_ms: None,
        }
    }
    fn all_closed() -> Readings {
        measured()
            .map(|n| {
                (
                    n.topic.unwrap().to_string(),
                    reading(1.0, NOW, NOW - 10_000),
                )
            })
            .collect()
    }
    fn open_from(readings: &mut Readings, topic: &str) {
        let topics: Vec<_> = measured().filter_map(|n| n.topic).collect();
        let start = topics.iter().position(|t| *t == topic).unwrap();
        for t in &topics[start..] {
            readings.insert((*t).to_string(), reading(0.0, NOW, NOW - 10_000));
        }
    }
    fn silence(readings: &mut Readings, board: Board) {
        for t in topics_of(board) {
            readings.remove(t);
        }
    }
    fn run(readings: &Readings) -> LoopStatus {
        compute_loop_status(SHUTDOWN_LOOP, readings, NOW)
    }
    fn idx(id: &str) -> usize {
        SHUTDOWN_LOOP.iter().position(|n| n.id == id).unwrap()
    }
    fn state(status: &LoopStatus, id: &str) -> NodeState {
        status.nodes[idx(id)].state
    }
    fn suspect_ids(status: &LoopStatus) -> Vec<&'static str> {
        status
            .suspects
            .iter()
            .map(|&i| SHUTDOWN_LOOP[i].id)
            .collect()
    }

    #[test]
    fn closed_when_all_live_and_one() {
        let s = run(&all_closed());
        assert_eq!(s.verdict, Verdict::Closed);
        assert!(s.nodes.iter().all(|n| n.state == NodeState::Closed));
        assert_eq!(s.break_idx, None);
    }

    #[test]
    fn unknown_when_no_readings() {
        let s = run(&Readings::default());
        assert_eq!(s.verdict, Verdict::Unknown);
        assert!(s.nodes.iter().all(|n| n.state == NodeState::NoData));
    }

    #[test]
    fn unknown_when_bms_stale() {
        let mut r = all_closed();
        for t in topics_of(Board::Bms) {
            r.insert(t.to_string(), reading(1.0, NOW - 60_001, NOW - 70_000));
        }
        let s = run(&r);
        assert_eq!(s.verdict, Verdict::Unknown);
        assert_eq!(state(&s, "acc-sense"), NodeState::NoData);
        assert_eq!(state(&s, "tsms"), NodeState::Closed);
        assert_eq!(state(&s, "em-interlock"), NodeState::NoData);
        assert_eq!(state(&s, "glvms"), NodeState::Closed);
    }

    #[test]
    fn single_culprit() {
        let mut r = all_closed();
        open_from(&mut r, "VCU/Shutdown/TSMS_GPIO");
        let s = run(&r);
        assert_eq!(s.verdict, Verdict::Open);
        assert_eq!(suspect_ids(&s), ["tsms"]);
        assert_eq!(s.break_idx, Some(idx("tsms")));
        for id in ["hvd", "em-interlock", "acc-sense", "ts-plus", "airs"] {
            assert_eq!(state(&s, id), NodeState::DownstreamOpen, "{id}");
        }
        assert_eq!(state(&s, "cockpit-brb"), NodeState::Closed);
    }

    #[test]
    fn unmeasured_stretch_is_suspect() {
        let mut r = all_closed();
        open_from(&mut r, "VCU/Shutdown/BMS_GPIO");
        let s = run(&r);
        assert_eq!(suspect_ids(&s), ["side-brb-r", "side-brb-l", "bms-latch"]);
        assert_eq!(state(&s, "glvms"), NodeState::Closed);
    }

    #[test]
    fn em_placeholder_suspect_and_stale_node_widens_stretch() {
        let mut r = all_closed();
        open_from(&mut r, "BMS/Shutdown/Acc_Sense");
        assert_eq!(suspect_ids(&run(&r)), ["em-interlock", "acc-sense"]);
        r.remove("VCU/Shutdown/HVD_GPIO");
        let s = run(&r);
        assert_eq!(state(&s, "hvd"), NodeState::NoData);
        assert_eq!(state(&s, "tsms"), NodeState::Closed);
        assert_eq!(suspect_ids(&s), ["em-interlock", "acc-sense"]);
    }

    #[test]
    fn blames_from_loop_start_when_vcu_silent() {
        let mut r = all_closed();
        open_from(&mut r, "BMS/Shutdown/Acc_Sense");
        silence(&mut r, Board::Vcu);
        assert_eq!(
            suspect_ids(&run(&r)),
            [
                "glvms",
                "side-brb-r",
                "side-brb-l",
                "em-interlock",
                "acc-sense"
            ]
        );
    }

    #[test]
    fn mismatch_after_grace_only() {
        let mut r = all_closed();
        r.insert(
            "VCU/Shutdown/BOTS_GPIO".into(),
            reading(0.0, NOW, NOW - 1000),
        );
        r.insert(
            "VCU/Shutdown/TSMS_GPIO".into(),
            reading(1.0, NOW, NOW - 1000),
        );
        let s = run(&r);
        assert!(s.nodes[idx("tsms")].mismatch);
        assert_eq!(s.nodes[idx("tsms")].code(), 4.0);
        assert!(s.mismatch);
        assert_eq!(s.verdict, Verdict::Open);

        r.insert(
            "VCU/Shutdown/BOTS_GPIO".into(),
            reading(0.0, NOW, NOW - 499),
        );
        assert!(!run(&r).mismatch);
    }

    #[test]
    fn no_cross_board_mismatch_until_sampled_after_break() {
        let mut r = all_closed();
        open_from(&mut r, "VCU/Shutdown/TSMS_GPIO");
        for t in ["VCU/Shutdown/TSMS_GPIO", "VCU/Shutdown/HVD_GPIO"] {
            r.insert(t.into(), reading(0.0, NOW, NOW - 1000));
        }
        for t in topics_of(Board::Bms) {
            r.insert(
                t.into(),
                Reading {
                    interval_ms: Some(2000.0),
                    ..reading(1.0, NOW - 1500, NOW - 60_000)
                },
            );
        }
        assert!(!run(&r).mismatch);
        r.insert(
            "BMS/Shutdown/Acc_Sense".into(),
            Reading {
                interval_ms: Some(2000.0),
                ..reading(1.0, NOW - 100, NOW - 60_000)
            },
        );
        let s = run(&r);
        assert!(s.nodes[idx("acc-sense")].mismatch);
        assert!(!s.nodes[idx("tsip-sense")].mismatch);
    }

    #[test]
    fn each_reading_judged_by_its_own_age() {
        let mut r = all_closed();
        for t in topics_of(Board::Vcu) {
            r.insert(t.into(), reading(1.0, NOW - 61_000, NOW - 70_000));
        }
        r.insert(CAN_LATCH_TOPIC.into(), reading(1.0, NOW, NOW));
        let s = run(&r);
        assert_eq!(state(&s, "tsms"), NodeState::NoData);
        assert_eq!(state(&s, "can-latch"), NodeState::Closed);
        assert_eq!(s.verdict, Verdict::Unknown);
    }

    #[test]
    fn staleness_is_a_clamped_multiple_of_the_interval() {
        let r = |i| Reading {
            interval_ms: i,
            ..reading(1.0, NOW, NOW)
        };
        assert_eq!(r(None).stale_after_ms(), STALE_AFTER_MS);
        assert_eq!(r(Some(250.0)).stale_after_ms(), MIN_STALE_AFTER_MS);
        assert_eq!(r(Some(2000.0)).stale_after_ms(), 10_000);
        assert_eq!(r(Some(20_000.0)).stale_after_ms(), STALE_AFTER_MS);
        assert!(r(Some(2000.0)).is_live(NOW + 10_000));
        assert!(!r(Some(2000.0)).is_live(NOW + 10_001));
    }

    #[test]
    fn next_reading_learns_rate_keeps_change_time_and_restarts_after_stale() {
        let first = Reading::next(None, 1.0, NOW);
        assert_eq!(first, reading(1.0, NOW, NOW));
        let second = Reading::next(Some(&first), 1.0, NOW + 250);
        assert_eq!(second.changed_at, NOW);
        assert_eq!(second.interval_ms, Some(250.0));
        let late = Reading::next(Some(&second), 1.0, NOW + 1500);
        assert_eq!(late.interval_ms, Some(500.0));
        assert_eq!(
            Reading::next(Some(&late), 0.0, NOW + 1600).changed_at,
            NOW + 1600
        );
        let back = Reading::next(Some(&second), 1.0, NOW + 250 + MIN_STALE_AFTER_MS + 1);
        assert_eq!(back.changed_at, back.received_at);
        assert_eq!(back.interval_ms, None);
    }

    fn faults(value: f32, received_at: i64) -> Readings {
        VCU_CRITICAL_FAULT_TOPICS
            .iter()
            .map(|t| {
                (
                    (*t).to_string(),
                    Reading {
                        interval_ms: Some(250.0),
                        ..reading(value, received_at, NOW - 1000)
                    },
                )
            })
            .collect()
    }

    #[test]
    fn can_latch_from_live_faults_only() {
        assert_eq!(derive_can_latch(&faults(0.0, NOW), NOW).unwrap().value, 1.0);
        let mut f = faults(0.0, NOW);
        f.get_mut(VCU_CRITICAL_FAULT_TOPICS[2]).unwrap().value = 1.0;
        assert_eq!(derive_can_latch(&f, NOW).unwrap().value, 0.0);
        // A tripped fault that went stale is unknown, not tripped forever
        f.get_mut(VCU_CRITICAL_FAULT_TOPICS[2]).unwrap().received_at = NOW - 10_000;
        assert_eq!(derive_can_latch(&f, NOW), None);
        assert_eq!(derive_can_latch(&faults(1.0, NOW - 10_000), NOW), None);
        assert_eq!(derive_can_latch(&Readings::default(), NOW), None);

        let mut r = faults(0.0, NOW);
        apply_derived_readings(&mut r, NOW);
        assert_eq!(r[CAN_LATCH_TOPIC].value, 1.0);
        apply_derived_readings(&mut r, NOW + 10_000);
        assert!(!r.contains_key(CAN_LATCH_TOPIC));
    }
}
