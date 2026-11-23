use std::{sync::atomic::Ordering, time::Duration};

use chrono::{DateTime, Utc};
use tokio::{sync::broadcast, time::Instant};
use tokio_util::sync::CancellationToken;
use tracing::{debug, info, trace, warn};

use crate::{
    ClientData,
    argos_inserter::ArgosInserter,
    shutdown_loop::tracker::{Publish, SHUTDOWN_TOPIC_PREFIX, ShutdownTracker},
};

/// How often the loop status and active Faults are published even when nothing changed, while any
/// input is live, so clients can tell the status is fresh
pub const HEARTBEAT_MS: i64 = 1000;
/// How long after the first message of a burst the loop is evaluated. The car publishes each
/// signal of a CAN frame as its own message, so evaluating per message would publish half-applied
/// frames; later messages don't push this back, so a steady stream is still evaluated this often.
pub const COALESCE_MS: i64 = 25;

/// When the shutdown loop is evaluated: once per burst of input, on the heartbeat, and when a
/// staleness, grace or Fault hold deadline passes. Times are ms on scylla's monotonic clock.
pub struct Scheduler {
    tracker: ShutdownTracker,
    burst_due: Option<i64>,
    timer_due: Option<i64>,
    heartbeat_due: i64,
    heartbeat_pending: bool,
}

impl Scheduler {
    #[must_use]
    pub fn new(now: i64) -> Self {
        Self {
            tracker: ShutdownTracker::new(),
            burst_due: None,
            timer_due: None,
            heartbeat_due: now + HEARTBEAT_MS,
            heartbeat_pending: false,
        }
    }

    /// Records a datapoint received at `now`; the first shutdown input of a burst schedules an
    /// evaluation [`COALESCE_MS`] later
    pub fn input(&mut self, topic: &str, value: f32, now: i64, stamp: DateTime<Utc>) {
        if self.tracker.record(topic, value, now, stamp) {
            self.burst_due.get_or_insert(now + COALESCE_MS);
        }
    }

    /// When [`Scheduler::wake`] should next run
    #[must_use]
    pub fn next_wake(&self) -> i64 {
        [self.burst_due, self.timer_due, Some(self.heartbeat_due)]
            .into_iter()
            .flatten()
            .min()
            .unwrap_or(self.heartbeat_due)
    }

    /// Evaluates the loop if anything is due at `now`. A heartbeat or deadline that falls inside a
    /// burst waits for the burst, so a half-applied frame is never evaluated.
    pub fn wake(&mut self, now: i64) -> Option<Publish> {
        if now >= self.heartbeat_due {
            // a stalled task resumes with one heartbeat, not a run of them
            self.heartbeat_due = now + HEARTBEAT_MS;
            self.heartbeat_pending = true;
        }
        if self.burst_due.is_some_and(|b| now < b) {
            // the burst's evaluation covers a deadline that passed and works out the next one
            if self.timer_due.is_some_and(|t| now >= t) {
                self.timer_due = None;
            }
            return None;
        }
        let burst = self.burst_due.take().is_some();
        let timer = self.timer_due.is_some_and(|t| now >= t);
        if !(burst || timer || self.heartbeat_pending) {
            return None;
        }
        let heartbeat = std::mem::take(&mut self.heartbeat_pending);
        let out = self.tracker.evaluate(now, heartbeat);
        self.timer_due = self.tracker.next_deadline(now);
        out
    }
}

/// Works out the shutdown loop status from the live datapoints and publishes it as `Argos/Shutdown/*`
/// datapoints into the same channels MQTT data takes: `socket_tx` reaches clients, Rules and the
/// Fault list, `inserter` stores them with the current Run (ADR 0009)
pub async fn shutdown_handler(
    cancel_token: CancellationToken,
    mut data_rx: broadcast::Receiver<ClientData>,
    socket_tx: broadcast::Sender<ClientData>,
    inserter: ArgosInserter,
) {
    info!(task = "shutdown_handler", "starting");
    // staleness and grace windows use a monotonic clock: a wall-clock step must not move them
    let start = Instant::now();
    let elapsed = || start.elapsed().as_millis() as i64;
    let mut scheduler = Scheduler::new(elapsed());
    loop {
        let wake_at = start + Duration::from_millis(scheduler.next_wake().max(0) as u64);
        tokio::select! {
            () = cancel_token.cancelled() => {
                debug!("Shutting down shutdown handler!");
                break;
            },
            res = data_rx.recv() => match res {
                Ok(data) => {
                    // our own output comes back through the socket channel
                    if data.name.starts_with(SHUTDOWN_TOPIC_PREFIX) {
                        continue;
                    }
                    if let Some(&value) = data.values.first() {
                        scheduler.input(&data.name, value, elapsed(), data.timestamp);
                    }
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    warn!("Shutdown handler lagged behind, skipped {} messages!", n);
                }
                Err(broadcast::error::RecvError::Closed) => {
                    debug!("Data channel closed, shutting down shutdown handler!");
                    break;
                }
            },
            () = tokio::time::sleep_until(wake_at) => {
                if let Some(out) = scheduler.wake(elapsed()) {
                    publish(out, &socket_tx, &inserter);
                }
            }
        }
    }
}

fn publish(out: Publish, socket_tx: &broadcast::Sender<ClientData>, inserter: &ArgosInserter) {
    let run_id = crate::RUN_ID.load(Ordering::Relaxed);
    // every datapoint needs a Run, which the first car message creates
    if run_id == -1 {
        return;
    }
    let mut unsent = 0;
    for (name, values) in out.points {
        trace!("Publishing {}: {:?}", name, values);
        let data = ClientData {
            run_id,
            name,
            unit: String::new(),
            values,
            timestamp: out.timestamp,
        };
        inserter.insert(data.clone());
        if socket_tx.send(data).is_err() {
            unsent += 1;
        }
    }
    if unsent > 0 {
        warn!(
            "Could not send {} shutdown datapoints to the socket",
            unsent
        );
    }
}

#[cfg(test)]
#[allow(clippy::float_cmp)] // codes and sense values are exact
mod tests {
    use chrono::TimeDelta;

    use super::*;
    use crate::shutdown_loop::model::{SHUTDOWN_LOOP, VCU_CRITICAL_FAULT_TOPICS};
    use crate::shutdown_loop::tracker::{BREAK_NODE_TOPIC, FAULT_TOPIC_PREFIX, VERDICT_TOPIC};

    /// The order the Calypso sim publishes the VCU's 0x123 signals in, one message each
    const VCU_ORDER: [&str; 9] = [
        "BMS_GPIO",
        "BOTS_GPIO",
        "BSPD_GPIO",
        "HV_C_GPIO",
        "HVD_GPIO",
        "IMD_GPIO",
        "CKPT_GPIO",
        "INERTIA_SW_GPIO",
        "TSMS_GPIO",
    ];
    const BMS_ORDER: [&str; 4] = ["Acc_Sense", "TSIP_Sense", "TS_Minus_Sense", "TS_Plus_Sense"];

    fn idx(id: &str) -> f32 {
        SHUTDOWN_LOOP.iter().position(|n| n.id == id).unwrap() as f32
    }

    /// Drives a [`Scheduler`] the way the handler does, on a virtual clock
    struct Sim {
        s: Scheduler,
        out: Vec<(i64, Publish)>,
        /// (first, last) receive time of each VCU frame
        vcu_frames: Vec<(i64, i64)>,
    }

    impl Sim {
        fn new() -> Self {
            Self {
                s: Scheduler::new(0),
                out: Vec::new(),
                vcu_frames: Vec::new(),
            }
        }
        fn run_until(&mut self, t: i64) {
            loop {
                let w = self.s.next_wake();
                if w > t {
                    break;
                }
                if let Some(p) = self.s.wake(w) {
                    self.out.push((w, p));
                }
            }
        }
        fn send(&mut self, t: i64, topic: &str, value: f32) {
            self.run_until(t);
            let stamp = DateTime::from_timestamp_millis(1_700_000_000_000 + t).unwrap();
            self.s.input(topic, value, t, stamp);
        }
        /// One 0x123 frame from `t`, signals 1 ms apart; `open` gives each signal's value
        fn vcu(&mut self, t: i64, open: impl Fn(&str) -> bool) {
            for (signal, i) in VCU_ORDER.iter().zip(0_i64..) {
                let value = if open(signal) { 0.0 } else { 1.0 };
                self.send(t + i, &format!("VCU/Shutdown/{signal}"), value);
            }
            self.vcu_frames.push((t, t + 8));
        }
        fn faults(&mut self, t: i64, tripped: bool) {
            for (f, i) in VCU_CRITICAL_FAULT_TOPICS.iter().zip(0_i64..) {
                self.send(t + i, f, if tripped { 1.0 } else { 0.0 });
            }
        }
        fn bms(&mut self, t: i64, closed: bool) {
            for (signal, i) in BMS_ORDER.iter().zip(0_i64..) {
                let value = if closed { 1.0 } else { 0.0 };
                self.send(t + i, &format!("BMS/Shutdown/{signal}"), value);
            }
        }
        /// VCU and fault frames every 250 ms from `from` until `to`, BMS frames every `bms_ms`
        /// starting `bms_lag` after `from`
        fn frames(
            &mut self,
            from: i64,
            to: i64,
            vcu_open: impl Fn(&str) -> bool,
            bms: (i64, i64, bool),
        ) {
            let (bms_lag, bms_ms, bms_closed) = bms;
            let mut next_bms = from + bms_lag;
            let mut t = from;
            while t < to {
                while next_bms < t {
                    self.bms(next_bms, bms_closed);
                    next_bms += bms_ms;
                }
                self.vcu(t, &vcu_open);
                self.faults(t + 100, false);
                t += 250;
            }
            while next_bms < to {
                self.bms(next_bms, bms_closed);
                next_bms += bms_ms;
            }
            self.run_until(to);
        }
        fn faults_published(&self, from: i64) -> Vec<(i64, String, f32)> {
            self.out
                .iter()
                .filter(|(t, _)| *t >= from)
                .flat_map(|(t, p)| {
                    p.points
                        .iter()
                        .filter(|(n, _)| n.starts_with(FAULT_TOPIC_PREFIX))
                        .map(move |(n, v)| (*t, n.clone(), v[0]))
                })
                .collect()
        }
        fn values(&self, topic: &str, from: i64) -> Vec<f32> {
            self.out
                .iter()
                .filter(|(t, _)| *t >= from)
                .flat_map(|(_, p)| p.points.iter().filter(|(n, _)| n == topic))
                .map(|(_, v)| v[0])
                .collect()
        }
        /// No status is published while a VCU frame is being applied, and at most one per frame
        fn assert_one_status_per_frame(&self) {
            for &(first, last) in &self.vcu_frames {
                let during = |from: i64, to: i64| {
                    self.out
                        .iter()
                        .filter(|(t, p)| {
                            (from..=to).contains(t)
                                && p.points.iter().any(|(n, _)| n == VERDICT_TOPIC)
                        })
                        .count()
                };
                assert_eq!(during(first + 1, last), 0, "mid-frame status at {first}");
                assert!(
                    during(first + 1, first + COALESCE_MS) <= 1,
                    "frame at {first}"
                );
            }
        }
    }

    const CLOSED: fn(&str) -> bool = |_| false;
    const BMS_4HZ_CLOSED: (i64, i64, bool) = (300, 250, true);

    // Bug: closing the loop raised a run of short-lived Faults while the VCU frame was half
    // applied and the BMS still held its old open sample
    #[test]
    fn closing_from_a_tsms_break_raises_no_fault_and_walks_only_through_acc_sense() {
        let mut sim = Sim::new();
        let tsms_open = |s: &str| matches!(s, "TSMS_GPIO" | "HVD_GPIO");
        sim.frames(0, 3000, tsms_open, (300, 250, false));
        sim.frames(3000, 6000, CLOSED, BMS_4HZ_CLOSED);
        assert_eq!(sim.faults_published(0), []);
        let breaks = sim.values(BREAK_NODE_TOPIC, 3000);
        let walk: Vec<f32> = breaks.iter().copied().fold(Vec::new(), |mut w, b| {
            if w.last() != Some(&b) {
                w.push(b);
            }
            w
        });
        assert!(
            walk == [idx("acc-sense"), -1.0] || walk == [idx("tsms"), idx("acc-sense"), -1.0],
            "{walk:?}"
        );
        sim.assert_one_status_per_frame();
    }

    // A fixed hold can't cover a BMS slower than 2 Hz: the opening it still shows after the VCU
    // closed waits for a BMS sample taken since
    #[test]
    fn closing_with_a_slow_bms_raises_no_fault() {
        let mut sim = Sim::new();
        let tsms_open = |s: &str| matches!(s, "TSMS_GPIO" | "HVD_GPIO");
        sim.frames(0, 3000, tsms_open, (0, 1000, false));
        sim.frames(3000, 6000, CLOSED, (1000, 1000, true));
        assert_eq!(sim.faults_published(0), []);
    }

    #[test]
    fn resetting_the_bms_latch_raises_no_fault_and_clears_its_opening_once() {
        let mut sim = Sim::new();
        sim.frames(0, 2000, |_| true, (300, 250, false));
        let fault = "Argos/Shutdown/Fault/Vcu/Shutdown_Open_SIDE_BRB_R_TO_BMS_LATCH";
        assert!(
            sim.faults_published(0)
                .iter()
                .any(|(_, n, v)| n == fault && *v == 1.0)
        );
        sim.frames(2000, 5000, CLOSED, BMS_4HZ_CLOSED);
        // from the reset frame's first message on (the heartbeat at 2000 runs just before it)
        let after: Vec<_> = sim
            .faults_published(2001)
            .into_iter()
            .map(|(_, n, v)| (n, v))
            .collect();
        assert_eq!(after, [(fault.to_string(), 0.0)]);
        sim.assert_one_status_per_frame();
    }

    #[test]
    fn a_held_opening_is_raised_once_refreshed_and_cleared_once() {
        let mut sim = Sim::new();
        sim.frames(0, 2000, CLOSED, BMS_4HZ_CLOSED);
        let open = |s: &str| matches!(s, "CKPT_GPIO" | "TSMS_GPIO" | "HVD_GPIO");
        sim.frames(2000, 4000, open, (300, 250, false));
        sim.frames(4000, 6000, CLOSED, BMS_4HZ_CLOSED);
        let fault = "Argos/Shutdown/Fault/Vcu/Shutdown_Open_COCKPIT_BRB";
        let published = sim.faults_published(0);
        assert!(
            published.iter().all(|(_, n, _)| n == fault),
            "{published:?}"
        );
        let ones: Vec<i64> = published
            .iter()
            .filter(|p| p.2 == 1.0)
            .map(|p| p.0)
            .collect();
        // raised once the opening held 500 ms and a later 0x123 frame confirmed it
        assert!(ones[0] >= 2500, "{ones:?}");
        // then refreshed by heartbeats
        assert!(ones.len() >= 2, "{ones:?}");
        assert!(ones.iter().all(|&t| t <= 4000), "{ones:?}");
        let zeros: Vec<i64> = published
            .iter()
            .filter(|p| p.2 == 0.0)
            .map(|p| p.0)
            .collect();
        assert_eq!(zeros.len(), 1);
        assert!((4000..4100).contains(&zeros[0]), "{zeros:?}");
        sim.assert_one_status_per_frame();
    }

    #[test]
    fn a_300_ms_opening_is_not_a_fault() {
        let mut sim = Sim::new();
        sim.frames(0, 2000, CLOSED, BMS_4HZ_CLOSED);
        let open = |s: &str| matches!(s, "BOTS_GPIO" | "CKPT_GPIO" | "TSMS_GPIO" | "HVD_GPIO");
        sim.frames(2000, 2300, open, (300, 250, true));
        sim.frames(2300, 4000, CLOSED, BMS_4HZ_CLOSED);
        assert_eq!(sim.faults_published(0), []);
        // still in the status history
        assert!(sim.values(VERDICT_TOPIC, 2000).contains(&0.0));
    }

    #[test]
    fn time_driven_changes_go_out_at_their_deadline_not_the_next_heartbeat() {
        let mut sim = Sim::new();
        sim.frames(0, 2000, CLOSED, BMS_4HZ_CLOSED);
        // 0x123 stops; 4 Hz readings go stale 3 s after their last message
        sim.faults(2100, false);
        sim.run_until(2000 + 3000 + 50);
        let unknown_at = sim
            .out
            .iter()
            .filter(|(t, _)| *t > 2000)
            .find(|(_, p)| {
                p.points
                    .iter()
                    .any(|(n, v)| n == VERDICT_TOPIC && v[0] == -1.0)
            })
            .map(|(t, _)| *t)
            .unwrap();
        // the last 0x123 frame began at 1750: its first signal is stale at 4751
        assert!((4751..4760).contains(&unknown_at), "{unknown_at}");
    }

    #[test]
    fn heartbeats_keep_the_status_fresh_while_inputs_are_live() {
        let mut sim = Sim::new();
        sim.frames(0, 5000, CLOSED, BMS_4HZ_CLOSED);
        let verdicts: Vec<i64> = sim
            .out
            .iter()
            .filter(|(_, p)| p.points.iter().any(|(n, _)| n == VERDICT_TOPIC))
            .map(|(t, _)| *t)
            .collect();
        assert!(
            verdicts
                .windows(2)
                .all(|w| w[1] - w[0] <= HEARTBEAT_MS + COALESCE_MS)
        );
        // stamped on the inputs' time base
        let (t, p) = sim.out.last().unwrap();
        assert!(
            p.timestamp - DateTime::from_timestamp_millis(1_700_000_000_000 + t).unwrap()
                <= TimeDelta::zero()
        );
    }
}
