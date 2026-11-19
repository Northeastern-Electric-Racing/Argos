//! Conflation of the live `data` event (spike #989).
//!
//! With a window set (`SCYLLA_SOCKET_CONFLATE_WINDOW_MS`), the socket handler
//! does not emit each datapoint as it arrives. It hands it to a [`Conflator`],
//! which keeps only the latest value of each topic, and emits what it holds
//! once per window. A topic that sent nothing in a window emits nothing.
//!
//! Only the `data` event is conflated. Faults, timers and rule notifications
//! still see every datapoint, since the socket handler feeds them before the
//! datapoint reaches the conflator, and the database never goes through here.
//!
//! "Latest" is latest to arrive, which is what a client displays today (it
//! appends each datapoint as it lands). Values leave in the order their topic
//! first arrived in the window. Each topic emits at most once per window, so a
//! topic's values still reach the client in arrival order, and a value waits
//! at most one window.

use rustc_hash::FxHashMap;

use crate::ClientData;

/// The latest pending value of each topic, waiting for the next flush.
#[derive(Default)]
pub struct Conflator {
    /// Each topic's slot in `slots`. Kept across flushes, so a topic costs one
    /// key allocation over the server's life, not one per window. It grows
    /// with the number of distinct topics, which the car bounds.
    index: FxHashMap<String, usize>,
    /// The pending value of each topic, `None` once flushed.
    slots: Vec<Option<ClientData>>,
    /// Slots holding a value, in the order their topic first arrived this window.
    dirty: Vec<usize>,
    /// Datapoints taken and emitted since [`Conflator::take_counts`].
    received: u64,
    emitted: u64,
}

impl Conflator {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Holds `data` as its topic's latest value, replacing any value the topic
    /// already has pending this window.
    pub fn push(&mut self, data: ClientData) {
        self.received += 1;
        let idx = if let Some(&idx) = self.index.get(&data.name) {
            idx
        } else {
            let idx = self.slots.len();
            self.index.insert(data.name.clone(), idx);
            self.slots.push(None);
            idx
        };
        if self.slots[idx].replace(data).is_none() {
            self.dirty.push(idx);
        }
    }

    /// Takes every pending value, one per topic, in first-arrival order.
    pub fn drain(&mut self) -> impl Iterator<Item = ClientData> + Send + '_ {
        self.emitted += self.dirty.len() as u64;
        let slots = &mut self.slots;
        self.dirty
            .drain(..)
            .filter_map(move |idx| slots[idx].take())
    }

    /// How many topics have a value waiting.
    #[must_use]
    pub fn pending(&self) -> usize {
        self.dirty.len()
    }

    /// The datapoints taken and emitted since the last call, then resets both.
    pub fn take_counts(&mut self) -> (u64, u64) {
        let counts = (self.received, self.emitted);
        self.received = 0;
        self.emitted = 0;
        counts
    }
}

#[cfg(test)]
#[path = "conflator_bench.rs"]
mod conflator_bench;

#[cfg(test)]
mod tests {
    use super::*;

    fn data(name: &str, value: f32) -> ClientData {
        ClientData {
            run_id: 1,
            name: name.to_string(),
            unit: String::new(),
            values: vec![value],
            timestamp: chrono::DateTime::from_timestamp_millis(0).unwrap(),
        }
    }

    fn flush(c: &mut Conflator) -> Vec<(String, f32)> {
        c.drain().map(|d| (d.name, d.values[0])).collect()
    }

    #[test]
    fn keeps_only_the_latest_value_of_each_topic() {
        let mut c = Conflator::new();
        c.push(data("a", 1.0));
        c.push(data("a", 2.0));
        c.push(data("a", 3.0));
        assert_eq!(flush(&mut c), vec![("a".into(), 3.0)]);
    }

    #[test]
    fn emits_in_first_arrival_order() {
        let mut c = Conflator::new();
        c.push(data("b", 1.0));
        c.push(data("a", 1.0));
        c.push(data("b", 2.0));
        c.push(data("c", 1.0));
        assert_eq!(
            flush(&mut c),
            vec![("b".into(), 2.0), ("a".into(), 1.0), ("c".into(), 1.0)]
        );
    }

    #[test]
    fn a_quiet_topic_emits_nothing_next_window() {
        let mut c = Conflator::new();
        c.push(data("a", 1.0));
        c.push(data("b", 1.0));
        assert_eq!(flush(&mut c).len(), 2);
        assert_eq!(c.pending(), 0);
        c.push(data("b", 2.0));
        assert_eq!(flush(&mut c), vec![("b".into(), 2.0)]);
        assert!(flush(&mut c).is_empty());
    }

    #[test]
    fn counts_what_came_in_and_what_went_out() {
        let mut c = Conflator::new();
        for v in 0..10 {
            c.push(data("a", v as f32));
        }
        c.push(data("b", 0.0));
        let _ = flush(&mut c);
        assert_eq!(c.take_counts(), (11, 2));
        assert_eq!(c.take_counts(), (0, 0));
    }
}
