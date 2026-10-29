use std::collections::VecDeque;
use std::time::Duration;

use rustc_hash::FxHashSet;
use tokio::time::Instant;

use crate::rule_structs::{ClientId, NotificationId, RuleNotification};

struct Stored {
    notification: RuleNotification,
    /// clients that have not acked it yet
    waiting: FxHashSet<ClientId>,
    since: Instant,
}

/// Rule notifications not yet acked by every client they went to, each stored once with the
/// clients still waiting on it. A client that a limit drops a notification from has fallen too
/// far behind and is given up on.
pub struct NotificationStore {
    /// oldest first
    stored: VecDeque<Stored>,
    max_stored: usize,
    max_age: Duration,
}

impl NotificationStore {
    #[must_use]
    pub fn new(max_stored: usize, max_age: Duration) -> Self {
        Self {
            stored: VecDeque::new(),
            max_stored,
            max_age,
        }
    }

    /// Stores a notification until every client acks it, returning clients given up on because
    /// the store was full
    pub fn store(
        &mut self,
        notification: RuleNotification,
        clients: impl IntoIterator<Item = ClientId>,
        now: Instant,
    ) -> Vec<ClientId> {
        let mut dropped = Vec::new();
        while self.stored.len() >= self.max_stored {
            let Some(oldest) = self.stored.pop_front() else {
                break;
            };
            dropped.extend(oldest.waiting);
        }
        self.stored.push_back(Stored {
            notification,
            waiting: clients.into_iter().collect(),
            since: now,
        });
        self.give_up_on(dropped)
    }

    /// Records that a client received a notification, returning whether it was waiting on it
    pub fn ack(&mut self, client: &ClientId, notification_id: &NotificationId) -> bool {
        let Some(index) = self
            .stored
            .iter()
            .position(|s| &s.notification.notification_id == notification_id)
        else {
            return false;
        };
        let removed = self.stored[index].waiting.remove(client);
        if self.stored[index].waiting.is_empty() {
            self.stored.remove(index);
        }
        removed
    }

    /// Notifications the client has not acked, oldest first
    #[must_use]
    pub fn pending_for(&self, client: &ClientId) -> Vec<RuleNotification> {
        self.stored
            .iter()
            .filter(|s| s.waiting.contains(client))
            .map(|s| s.notification.clone())
            .collect()
    }

    /// Drops notifications older than the age limit, returning clients given up on because
    /// they were still waiting on one
    pub fn expire(&mut self, now: Instant) -> Vec<ClientId> {
        let mut dropped = Vec::new();
        while self
            .stored
            .front()
            .is_some_and(|s| now.saturating_duration_since(s.since) >= self.max_age)
        {
            if let Some(oldest) = self.stored.pop_front() {
                dropped.extend(oldest.waiting);
            }
        }
        self.give_up_on(dropped)
    }

    /// Forgets the given clients everywhere, dropping notifications no one is left waiting on, and
    /// returns them deduplicated
    fn give_up_on(&mut self, clients: Vec<ClientId>) -> Vec<ClientId> {
        let clients: FxHashSet<ClientId> = clients.into_iter().collect();
        if clients.is_empty() {
            return Vec::new();
        }
        for stored in &mut self.stored {
            stored.waiting.retain(|c| !clients.contains(c));
        }
        self.stored.retain(|s| !s.waiting.is_empty());
        clients.into_iter().collect()
    }

    /// Number of notifications stored
    #[must_use]
    pub fn len(&self) -> usize {
        self.stored.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.stored.is_empty()
    }

    /// Number of (notification, waiting client) pairs, i.e. what per-client queues would store
    #[must_use]
    pub fn waiting_count(&self) -> usize {
        self.stored.iter().map(|s| s.waiting.len()).sum()
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;
    use crate::rule_structs::{RuleId, Topic};

    const MAX_AGE: Duration = Duration::from_secs(600);

    fn client(id: &str) -> ClientId {
        ClientId(id.to_string())
    }

    fn clients(ids: &[&str]) -> Vec<ClientId> {
        ids.iter().map(|id| client(id)).collect()
    }

    fn notification(id: &str) -> RuleNotification {
        RuleNotification {
            notification_id: NotificationId(id.to_string()),
            id: RuleId("rule".to_string()),
            topic: Topic("test/topic".to_string()),
            values: vec![1.0],
            time: Utc::now(),
        }
    }

    fn pending_ids(store: &NotificationStore, id: &str) -> Vec<String> {
        store
            .pending_for(&client(id))
            .into_iter()
            .map(|n| n.notification_id.0)
            .collect()
    }

    fn sorted(clients: Vec<ClientId>) -> Vec<String> {
        let mut ids: Vec<String> = clients.into_iter().map(|c| c.0).collect();
        ids.sort();
        ids
    }

    #[test]
    fn a_notification_is_stored_once_for_all_its_clients() {
        let mut store = NotificationStore::new(10, MAX_AGE);
        store.store(notification("1"), clients(&["a", "b"]), Instant::now());

        assert_eq!(store.len(), 1);
        assert_eq!(store.waiting_count(), 2);
        assert_eq!(pending_ids(&store, "a"), ["1"]);
        assert_eq!(pending_ids(&store, "b"), ["1"]);
    }

    #[test]
    fn pending_is_oldest_first_and_only_the_clients_own() {
        let now = Instant::now();
        let mut store = NotificationStore::new(10, MAX_AGE);
        store.store(notification("1"), clients(&["a"]), now);
        store.store(notification("2"), clients(&["b"]), now);
        store.store(notification("3"), clients(&["a", "b"]), now);

        assert_eq!(pending_ids(&store, "a"), ["1", "3"]);
        assert!(store.pending_for(&client("c")).is_empty());
    }

    #[test]
    fn ack_removes_only_that_client_and_drops_the_notification_once_all_have_acked() {
        let mut store = NotificationStore::new(10, MAX_AGE);
        store.store(notification("1"), clients(&["a", "b"]), Instant::now());
        let id = NotificationId("1".to_string());

        assert!(store.ack(&client("a"), &id));
        assert!(!store.ack(&client("a"), &id));
        assert_eq!(pending_ids(&store, "a"), Vec::<String>::new());
        assert_eq!(pending_ids(&store, "b"), ["1"]);

        assert!(store.ack(&client("b"), &id));
        assert!(store.is_empty());
    }

    #[test]
    fn filling_the_store_drops_the_oldest_and_gives_up_on_its_waiting_clients() {
        let now = Instant::now();
        let mut store = NotificationStore::new(2, MAX_AGE);
        store.store(notification("1"), clients(&["a", "b"]), now);
        store.store(notification("2"), clients(&["a", "c"]), now);

        let dropped = store.store(notification("3"), clients(&["c"]), now);

        assert_eq!(sorted(dropped), ["a", "b"]);
        // a given-up client is forgotten everywhere, not just on the dropped notification
        assert_eq!(pending_ids(&store, "a"), Vec::<String>::new());
        assert_eq!(pending_ids(&store, "c"), ["2", "3"]);
        assert_eq!(store.len(), 2);
    }

    #[test]
    fn a_client_that_acked_the_dropped_notification_is_not_given_up_on() {
        let now = Instant::now();
        let mut store = NotificationStore::new(1, MAX_AGE);
        store.store(notification("1"), clients(&["a", "b"]), now);
        store.ack(&client("a"), &NotificationId("1".to_string()));

        let dropped = store.store(notification("2"), clients(&["a"]), now);

        assert_eq!(sorted(dropped), ["b"]);
        assert_eq!(pending_ids(&store, "a"), ["2"]);
    }

    #[test]
    fn notifications_past_the_age_limit_expire_and_give_up_on_their_clients() {
        let start = Instant::now();
        let mut store = NotificationStore::new(10, MAX_AGE);
        store.store(notification("1"), clients(&["a"]), start);
        store.store(
            notification("2"),
            clients(&["b"]),
            start + Duration::from_secs(1),
        );

        assert!(
            store
                .expire(start + MAX_AGE - Duration::from_secs(1))
                .is_empty()
        );
        assert_eq!(sorted(store.expire(start + MAX_AGE)), ["a"]);
        assert_eq!(pending_ids(&store, "b"), ["2"]);
    }

    #[test]
    fn a_given_up_client_is_reported_once_even_if_several_of_its_notifications_drop() {
        let start = Instant::now();
        let mut store = NotificationStore::new(10, MAX_AGE);
        store.store(notification("1"), clients(&["a"]), start);
        store.store(notification("2"), clients(&["a"]), start);

        assert_eq!(sorted(store.expire(start + MAX_AGE)), ["a"]);
        assert!(store.is_empty());
    }
}
