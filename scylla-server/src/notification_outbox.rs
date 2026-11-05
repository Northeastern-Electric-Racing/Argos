use std::collections::VecDeque;
use std::time::Duration;

use rustc_hash::FxHashMap;
use tokio::time::Instant;

use crate::rule_structs::{ClientId, NotificationId, RuleNotification};

/// Most unacked notifications held per client; the oldest is dropped past this
pub const MAX_PENDING_PER_CLIENT: usize = 100;

#[derive(Default)]
struct ClientOutbox {
    pending: VecDeque<RuleNotification>,
    /// when the client was first seen offline since it last connected
    offline_since: Option<Instant>,
}

/// Rule notifications sent (or due) to a client that it has not acked yet, kept so they can be
/// resent when the client reconnects.
pub struct NotificationOutbox {
    clients: FxHashMap<ClientId, ClientOutbox>,
    max_pending: usize,
}

impl Default for NotificationOutbox {
    fn default() -> Self {
        Self::new(MAX_PENDING_PER_CLIENT)
    }
}

impl NotificationOutbox {
    #[must_use]
    pub fn new(max_pending: usize) -> Self {
        Self {
            clients: FxHashMap::default(),
            max_pending,
        }
    }

    /// Holds a notification for a client until it is acked
    pub fn push(&mut self, client: ClientId, notification: RuleNotification) {
        let outbox = self.clients.entry(client).or_default();
        if outbox.pending.len() >= self.max_pending {
            outbox.pending.pop_front();
        }
        outbox.pending.push_back(notification);
    }

    /// Removes an acked notification, returning whether it was still pending
    pub fn ack(&mut self, client: &ClientId, notification_id: &NotificationId) -> bool {
        let Some(outbox) = self.clients.get_mut(client) else {
            return false;
        };
        let before = outbox.pending.len();
        outbox
            .pending
            .retain(|n| &n.notification_id != notification_id);
        outbox.pending.len() != before
    }

    /// The client's unacked notifications, oldest first
    #[must_use]
    pub fn pending(&self, client: &ClientId) -> Vec<RuleNotification> {
        self.clients
            .get(client)
            .map(|outbox| outbox.pending.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// Records that the client is not connected, keeping the earliest time if already offline
    pub fn mark_offline(&mut self, client: ClientId, now: Instant) {
        self.clients
            .entry(client)
            .or_default()
            .offline_since
            .get_or_insert(now);
    }

    /// Records that the client has reconnected
    pub fn mark_online(&mut self, client: &ClientId) {
        if let Some(outbox) = self.clients.get_mut(client) {
            outbox.offline_since = None;
        }
    }

    /// Forgets clients that have unacked notifications and have been offline for at least
    /// `grace`, returning them so their subscriptions can be deleted
    pub fn expire(&mut self, now: Instant, grace: Duration) -> Vec<ClientId> {
        let expired: Vec<ClientId> = self
            .clients
            .iter()
            .filter(|(_, outbox)| {
                !outbox.pending.is_empty()
                    && outbox
                        .offline_since
                        .is_some_and(|since| now.saturating_duration_since(since) >= grace)
            })
            .map(|(client, _)| client.clone())
            .collect();
        for client in &expired {
            self.clients.remove(client);
        }
        expired
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;
    use crate::rule_structs::{RuleId, Topic};

    fn client(id: &str) -> ClientId {
        ClientId(id.to_string())
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

    fn pending_ids(outbox: &NotificationOutbox, client: &ClientId) -> Vec<String> {
        outbox
            .pending(client)
            .into_iter()
            .map(|n| n.notification_id.0)
            .collect()
    }

    #[test]
    fn pushed_notifications_are_pending_in_order() {
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));
        outbox.push(client("a"), notification("2"));

        assert_eq!(pending_ids(&outbox, &client("a")), ["1", "2"]);
    }

    #[test]
    fn unknown_client_has_nothing_pending() {
        let outbox = NotificationOutbox::default();
        assert!(outbox.pending(&client("a")).is_empty());
    }

    #[test]
    fn ack_removes_only_that_notification() {
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));
        outbox.push(client("a"), notification("2"));

        assert!(outbox.ack(&client("a"), &NotificationId("1".to_string())));
        assert_eq!(pending_ids(&outbox, &client("a")), ["2"]);
    }

    #[test]
    fn ack_of_unknown_notification_returns_false() {
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));

        assert!(!outbox.ack(&client("a"), &NotificationId("2".to_string())));
        assert!(!outbox.ack(&client("b"), &NotificationId("1".to_string())));
        assert_eq!(pending_ids(&outbox, &client("a")), ["1"]);
    }

    #[test]
    fn clients_are_kept_separate() {
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));
        outbox.push(client("b"), notification("2"));

        assert_eq!(pending_ids(&outbox, &client("a")), ["1"]);
        assert_eq!(pending_ids(&outbox, &client("b")), ["2"]);
    }

    const GRACE: Duration = Duration::from_secs(300);

    fn expired_ids(outbox: &mut NotificationOutbox, now: Instant) -> Vec<String> {
        let mut ids: Vec<String> = outbox.expire(now, GRACE).into_iter().map(|c| c.0).collect();
        ids.sort();
        ids
    }

    #[test]
    fn client_offline_past_grace_with_pending_expires_and_is_forgotten() {
        let start = Instant::now();
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));
        outbox.mark_offline(client("a"), start);

        assert_eq!(expired_ids(&mut outbox, start + GRACE), ["a"]);
        assert!(outbox.pending(&client("a")).is_empty());
        assert_eq!(
            expired_ids(&mut outbox, start + GRACE * 2),
            Vec::<String>::new()
        );
    }

    #[test]
    fn client_within_grace_does_not_expire() {
        let start = Instant::now();
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));
        outbox.mark_offline(client("a"), start);

        assert_eq!(
            expired_ids(&mut outbox, start + GRACE - Duration::from_secs(1)),
            Vec::<String>::new()
        );
        assert_eq!(pending_ids(&outbox, &client("a")), ["1"]);
    }

    #[test]
    fn connected_client_does_not_expire() {
        let start = Instant::now();
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));

        assert_eq!(
            expired_ids(&mut outbox, start + GRACE * 2),
            Vec::<String>::new()
        );
    }

    #[test]
    fn reconnecting_cancels_expiry() {
        let start = Instant::now();
        let mut outbox = NotificationOutbox::default();
        outbox.push(client("a"), notification("1"));
        outbox.mark_offline(client("a"), start);
        outbox.mark_online(&client("a"));

        assert_eq!(
            expired_ids(&mut outbox, start + GRACE),
            Vec::<String>::new()
        );
        assert_eq!(pending_ids(&outbox, &client("a")), ["1"]);
    }

    #[test]
    fn grace_counts_from_the_first_time_offline() {
        let start = Instant::now();
        let mut outbox = NotificationOutbox::default();
        outbox.mark_offline(client("a"), start);
        outbox.push(client("a"), notification("1"));
        outbox.mark_offline(client("a"), start + GRACE - Duration::from_secs(1));

        assert_eq!(expired_ids(&mut outbox, start + GRACE), ["a"]);
    }

    #[test]
    fn offline_client_with_nothing_pending_does_not_expire() {
        let start = Instant::now();
        let mut outbox = NotificationOutbox::default();
        outbox.mark_offline(client("a"), start);
        outbox.push(client("b"), notification("1"));
        outbox.mark_offline(client("b"), start);

        assert_eq!(expired_ids(&mut outbox, start + GRACE), ["b"]);
    }

    #[test]
    fn oldest_notification_is_dropped_past_the_cap() {
        let mut outbox = NotificationOutbox::new(2);
        outbox.push(client("a"), notification("1"));
        outbox.push(client("a"), notification("2"));
        outbox.push(client("a"), notification("3"));

        assert_eq!(pending_ids(&outbox, &client("a")), ["2", "3"]);
    }
}
