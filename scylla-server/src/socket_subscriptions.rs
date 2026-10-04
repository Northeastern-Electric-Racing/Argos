use rustc_hash::{FxHashMap, FxHashSet};
use socketioxide::socket::Sid;
use tracing::warn;

/// Ack payload for the `set_subscriptions` event: number of filters stored.
#[derive(serde::Serialize, Debug)]
pub struct SubscriptionAck {
    pub count: usize,
}

/// Per-socket selective-delivery state for the `data` event.
///
/// Wire contract (spike):
/// * client emits `set_subscriptions` with a JSON array of MQTT-style filters
///   (exact topics, `+` single-level, trailing `#` multi-level)
/// * replace-set semantics: the payload replaces that socket's entire filter set
/// * a socket that never sent `set_subscriptions` stays on the full firehose;
///   after the first send it is selective (`[]` = no `data` topics at all)
/// * only the `data` event is gated — `metadata`, `faults`, `timers` and
///   `rule_notify` are always delivered
#[derive(Default)]
pub struct SubscriptionState {
    /// sockets that never sent `set_subscriptions` — receive every data topic
    firehose: FxHashSet<Sid>,
    /// sockets that sent `set_subscriptions` — receive only matching topics
    filters: FxHashMap<Sid, Vec<String>>,
    /// memoized topic -> matching selective sockets, built lazily per topic and
    /// cleared whenever any filter set changes (navigation/disconnect only)
    index: FxHashMap<String, Vec<Sid>>,
}

impl SubscriptionState {
    /// Registers a newly connected socket on the firehose (today's behavior).
    pub fn connect(&mut self, sid: Sid) {
        self.firehose.insert(sid);
    }

    /// Removes all state for a disconnected socket.
    pub fn disconnect(&mut self, sid: Sid) {
        self.firehose.remove(&sid);
        if self.filters.remove(&sid).is_some() {
            self.index.clear();
        }
    }

    /// Replace-set semantics: stores `new_filters` as the socket's entire filter
    /// set, dropping invalid MQTT filters. Returns the number of filters stored.
    pub fn set_filters(&mut self, sid: Sid, new_filters: Vec<String>) -> usize {
        self.firehose.remove(&sid);
        let valid: Vec<String> = new_filters
            .into_iter()
            .filter(|f| {
                let ok = rumqttc::valid_filter(f);
                if !ok {
                    warn!("Socket {} sent invalid MQTT filter {:?}, dropping", sid, f);
                }
                ok
            })
            .collect();
        let count = valid.len();
        self.filters.insert(sid, valid);
        self.index.clear();
        count
    }

    /// True when no socket is selective — the caller can take the broadcast
    /// fast path, identical to the pre-spike firehose.
    pub fn all_firehose(&self) -> bool {
        self.filters.is_empty()
    }

    /// Every socket that should receive `topic`: firehose sockets plus selective
    /// sockets whose filter set matches. O(1) per message via the memoized index
    /// (the index entry is built on first sight of a topic after invalidation).
    pub fn recipients(&mut self, topic: &str) -> Vec<Sid> {
        self.ensure_index(topic);
        let selective = self.index.get(topic).map(Vec::as_slice).unwrap_or(&[]);
        let mut out = Vec::with_capacity(self.firehose.len() + selective.len());
        out.extend(self.firehose.iter().copied());
        out.extend_from_slice(selective);
        out
    }

    fn ensure_index(&mut self, topic: &str) {
        if !self.index.contains_key(topic) {
            let sids: Vec<Sid> = self
                .filters
                .iter()
                .filter(|(_, filters)| filters.iter().any(|f| rumqttc::matches(topic, f)))
                .map(|(sid, _)| *sid)
                .collect();
            self.index.insert(topic.to_string(), sids);
        }
    }

    #[cfg(test)]
    fn index_len(&self) -> usize {
        self.index.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sids<const N: usize>() -> [Sid; N] {
        std::array::from_fn(|_| Sid::new())
    }

    #[test]
    fn firehose_is_the_default() {
        let mut state = SubscriptionState::default();
        let [a, b] = sids();
        state.connect(a);
        state.connect(b);
        assert!(state.all_firehose());
        let recipients = state.recipients("BMS/PerCell/Seg1/Cell3");
        assert!(recipients.contains(&a) && recipients.contains(&b));
    }

    #[test]
    fn set_replaces_entire_filter_set() {
        let mut state = SubscriptionState::default();
        let [a] = sids();
        state.connect(a);
        state.set_filters(a, vec!["BMS/#".to_string()]);
        assert!(state.recipients("BMS/PerCell/Seg1").contains(&a));

        // second set fully replaces the first
        state.set_filters(a, vec!["GPS/Speed".to_string()]);
        assert!(!state.recipients("BMS/PerCell/Seg1").contains(&a));
        assert!(state.recipients("GPS/Speed").contains(&a));
    }

    #[test]
    fn empty_set_receives_no_data_topics() {
        let mut state = SubscriptionState::default();
        let [a, b] = sids();
        state.connect(a);
        state.connect(b);
        state.set_filters(a, vec![]);
        let recipients = state.recipients("GPS/Speed");
        assert!(!recipients.contains(&a), "selective socket with [] must get nothing");
        assert!(recipients.contains(&b), "firehose socket must still get everything");
        assert!(!state.all_firehose());
    }

    #[test]
    fn wildcard_matching() {
        let mut state = SubscriptionState::default();
        let [multi, single, exact] = sids();
        state.connect(multi);
        state.connect(single);
        state.connect(exact);
        state.set_filters(multi, vec!["BMS/PerCell/#".to_string()]);
        state.set_filters(single, vec!["+/Speed".to_string()]);
        state.set_filters(exact, vec!["GPS/Speed".to_string()]);

        assert!(state.recipients("BMS/PerCell/Seg1/Cell3").contains(&multi));
        assert!(!state.recipients("BMS/Pack/Voltage").contains(&multi));

        assert!(state.recipients("GPS/Speed").contains(&single));
        assert!(
            !state.recipients("GPS/Sub/Speed").contains(&single),
            "`+` must match exactly one level"
        );

        assert!(state.recipients("GPS/Speed").contains(&exact));
        assert!(!state.recipients("GPS/Speed2").contains(&exact));
    }

    #[test]
    fn index_is_memoized_and_invalidated_on_change() {
        let mut state = SubscriptionState::default();
        let [a] = sids();
        state.connect(a);
        state.set_filters(a, vec!["BMS/#".to_string()]);

        state.recipients("BMS/Pack/Voltage");
        state.recipients("GPS/Speed");
        assert_eq!(state.index_len(), 2, "entries memoized per topic");

        state.set_filters(a, vec!["GPS/#".to_string()]);
        assert_eq!(state.index_len(), 0, "any set change clears the index");
        assert!(state.recipients("GPS/Speed").contains(&a));
        assert!(!state.recipients("BMS/Pack/Voltage").contains(&a));
    }

    #[test]
    fn disconnect_cleans_up_and_invalidates() {
        let mut state = SubscriptionState::default();
        let [fire, selective] = sids();
        state.connect(fire);
        state.connect(selective);
        state.set_filters(selective, vec!["BMS/#".to_string()]);
        state.recipients("BMS/Pack/Voltage");

        state.disconnect(selective);
        assert_eq!(state.index_len(), 0, "selective disconnect clears the index");
        assert!(!state.recipients("BMS/Pack/Voltage").contains(&selective));
        assert!(state.all_firehose(), "last selective socket left");

        state.disconnect(fire);
        assert!(state.recipients("BMS/Pack/Voltage").is_empty());
    }

    #[test]
    fn invalid_filters_are_dropped() {
        let mut state = SubscriptionState::default();
        let [a] = sids();
        state.connect(a);
        let count = state.set_filters(
            a,
            vec!["BMS/#".to_string(), "bad/#/middle".to_string()],
        );
        assert_eq!(count, 1, "invalid `#`-in-the-middle filter must be dropped");
        assert!(state.recipients("BMS/Pack").contains(&a));
        assert!(!state.recipients("bad/x/middle").contains(&a));
    }
}
