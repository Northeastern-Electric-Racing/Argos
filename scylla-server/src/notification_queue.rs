use std::time::Duration;

use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use tokio::time::Instant;

use crate::rule_structs::{ClientId, RuleNotification};

/// A notification numbered within its client's stream, as sent to the client
#[derive(Serialize, Clone)]
pub struct QueuedNotification {
    /// identifies the client's numbering; a new stream (server restart, or the client was given up
    /// on) restarts `seq` at 1, so the client must reset what it has seen
    pub stream: String,
    pub seq: u64,
    #[serde(flatten)]
    pub notification: RuleNotification,
}

/// A client's report of the last notification it received with no gaps before it, sent
/// regularly so it doubles as a check-in
#[derive(Deserialize, Debug)]
pub struct CheckIn {
    pub stream: Option<String>,
    pub last_seq: u64,
}

struct Pending {
    notification: QueuedNotification,
    sent_at: Instant,
}

struct ClientQueue {
    stream: String,
    next_seq: u64,
    pending: Vec<Pending>,
    last_check_in: Instant,
}

/// Per-client queues of numbered Rule notifications, kept until the client reports receiving them
pub struct NotificationQueue {
    clients: FxHashMap<ClientId, ClientQueue>,
    /// unique to this server run, so stream ids don't repeat across restarts
    stream_prefix: String,
    next_stream: u64,
    /// how long after a send a still-unreported notification is resent on check-in
    resend_after: Duration,
}

impl NotificationQueue {
    #[must_use]
    pub fn new(stream_prefix: String, resend_after: Duration) -> Self {
        Self {
            clients: FxHashMap::default(),
            stream_prefix,
            next_stream: 0,
            resend_after,
        }
    }

    fn client_queue(&mut self, client: ClientId, now: Instant) -> &mut ClientQueue {
        self.clients.entry(client).or_insert_with(|| {
            let stream = format!("{}-{}", self.stream_prefix, self.next_stream);
            self.next_stream += 1;
            ClientQueue {
                stream,
                next_seq: 1,
                pending: Vec::new(),
                last_check_in: now,
            }
        })
    }

    /// Numbers a notification for a client and holds it until reported, returning it to send
    pub fn push(
        &mut self,
        client: ClientId,
        notification: RuleNotification,
        now: Instant,
    ) -> QueuedNotification {
        let queue = self.client_queue(client, now);
        let queued = QueuedNotification {
            stream: queue.stream.clone(),
            seq: queue.next_seq,
            notification,
        };
        queue.next_seq += 1;
        queue.pending.push(Pending {
            notification: queued.clone(),
            sent_at: now,
        });
        queued
    }

    /// Records a check-in, forgets what the client has received, and returns the notifications to
    /// resend: everything after `last_seq` not sent within `resend_after`
    pub fn check_in(
        &mut self,
        client: ClientId,
        check_in: &CheckIn,
        now: Instant,
    ) -> Vec<QueuedNotification> {
        let resend_after = self.resend_after;
        let queue = self.client_queue(client, now);
        queue.last_check_in = now;
        // a report about another stream says nothing about this one
        let last_seq = if check_in.stream.as_ref() == Some(&queue.stream) {
            check_in.last_seq
        } else {
            0
        };
        queue.pending.retain(|p| p.notification.seq > last_seq);
        queue
            .pending
            .iter_mut()
            .filter(|p| now.saturating_duration_since(p.sent_at) >= resend_after)
            .map(|p| {
                p.sent_at = now;
                p.notification.clone()
            })
            .collect()
    }

    /// Gives up on clients that have not checked in for `timeout`, returning them so their
    /// subscriptions can be deleted
    pub fn expire(&mut self, now: Instant, timeout: Duration) -> Vec<ClientId> {
        let expired: Vec<ClientId> = self
            .clients
            .iter()
            .filter(|(_, queue)| now.saturating_duration_since(queue.last_check_in) >= timeout)
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

    const RESEND_AFTER: Duration = Duration::from_secs(2);
    const TIMEOUT: Duration = Duration::from_secs(15);

    fn client(id: &str) -> ClientId {
        ClientId(id.to_string())
    }

    fn notification() -> RuleNotification {
        RuleNotification {
            id: RuleId("rule".to_string()),
            topic: Topic("test/topic".to_string()),
            values: vec![1.0],
            time: Utc::now(),
        }
    }

    fn queue() -> NotificationQueue {
        NotificationQueue::new("run".to_string(), RESEND_AFTER)
    }

    fn check_in(stream: Option<&str>, last_seq: u64) -> CheckIn {
        CheckIn {
            stream: stream.map(str::to_string),
            last_seq,
        }
    }

    fn seqs(notifications: &[QueuedNotification]) -> Vec<u64> {
        notifications.iter().map(|n| n.seq).collect()
    }

    #[test]
    fn notifications_are_numbered_per_client_from_one() {
        let now = Instant::now();
        let mut q = queue();
        let a1 = q.push(client("a"), notification(), now);
        let a2 = q.push(client("a"), notification(), now);
        let b1 = q.push(client("b"), notification(), now);

        assert_eq!((a1.seq, a2.seq, b1.seq), (1, 2, 1));
        assert_eq!(a1.stream, a2.stream);
        assert_ne!(a1.stream, b1.stream);
    }

    #[test]
    fn check_in_resends_unreported_notifications_once_resend_after_has_passed() {
        let start = Instant::now();
        let mut q = queue();
        let stream = q.push(client("a"), notification(), start).stream;
        q.push(client("a"), notification(), start);
        q.push(client("a"), notification(), start);

        let resent = q.check_in(
            client("a"),
            &check_in(Some(&stream), 1),
            start + RESEND_AFTER,
        );
        assert_eq!(seqs(&resent), [2, 3]);
    }

    #[test]
    fn check_in_does_not_resend_notifications_just_sent() {
        let start = Instant::now();
        let mut q = queue();
        let stream = q.push(client("a"), notification(), start).stream;
        q.push(client("a"), notification(), start + Duration::from_secs(1));

        let resent = q.check_in(
            client("a"),
            &check_in(Some(&stream), 0),
            start + RESEND_AFTER,
        );
        assert_eq!(seqs(&resent), [1]);
    }

    #[test]
    fn a_resent_notification_waits_resend_after_before_the_next_resend() {
        let start = Instant::now();
        let mut q = queue();
        let stream = q.push(client("a"), notification(), start).stream;
        let first = start + RESEND_AFTER;

        assert_eq!(
            seqs(&q.check_in(client("a"), &check_in(Some(&stream), 0), first)),
            [1]
        );
        assert!(
            q.check_in(
                client("a"),
                &check_in(Some(&stream), 0),
                first + Duration::from_secs(1)
            )
            .is_empty()
        );
        assert_eq!(
            seqs(&q.check_in(
                client("a"),
                &check_in(Some(&stream), 0),
                first + RESEND_AFTER
            )),
            [1]
        );
    }

    #[test]
    fn reported_notifications_are_forgotten() {
        let start = Instant::now();
        let mut q = queue();
        let stream = q.push(client("a"), notification(), start).stream;
        q.push(client("a"), notification(), start);

        q.check_in(client("a"), &check_in(Some(&stream), 2), start);
        assert!(
            q.check_in(
                client("a"),
                &check_in(Some(&stream), 0),
                start + RESEND_AFTER
            )
            .is_empty()
        );
    }

    #[test]
    fn check_in_from_another_stream_resends_everything() {
        let start = Instant::now();
        let mut q = queue();
        q.push(client("a"), notification(), start);
        q.push(client("a"), notification(), start);

        // e.g. the client last heard from a previous server run
        let resent = q.check_in(
            client("a"),
            &check_in(Some("old-run-0"), 5),
            start + RESEND_AFTER,
        );
        assert_eq!(seqs(&resent), [1, 2]);
        let resent = q.check_in(client("a"), &check_in(None, 0), start + RESEND_AFTER * 2);
        assert_eq!(seqs(&resent), [1, 2]);
    }

    #[test]
    fn client_that_stops_checking_in_expires_and_is_forgotten() {
        let start = Instant::now();
        let mut q = queue();
        let old_stream = q.push(client("a"), notification(), start).stream;
        q.check_in(client("a"), &check_in(Some(&old_stream), 0), start);

        assert!(
            q.expire(start + TIMEOUT - Duration::from_secs(1), TIMEOUT)
                .is_empty()
        );
        let expired: Vec<String> = q
            .expire(start + TIMEOUT, TIMEOUT)
            .into_iter()
            .map(|c| c.0)
            .collect();
        assert_eq!(expired, ["a"]);

        // a returning client gets a fresh stream, so it knows to reset what it has seen
        let fresh = q.push(client("a"), notification(), start + TIMEOUT);
        assert_eq!(fresh.seq, 1);
        assert_ne!(fresh.stream, old_stream);
    }

    #[test]
    fn checking_in_postpones_expiry() {
        let start = Instant::now();
        let mut q = queue();
        q.check_in(client("a"), &check_in(None, 0), start);
        q.check_in(
            client("a"),
            &check_in(None, 0),
            start + Duration::from_secs(10),
        );

        assert!(q.expire(start + TIMEOUT, TIMEOUT).is_empty());
    }

    #[test]
    fn client_first_seen_by_a_notification_expires_if_it_never_checks_in() {
        let start = Instant::now();
        let mut q = queue();
        q.push(client("a"), notification(), start);

        let expired: Vec<String> = q
            .expire(start + TIMEOUT, TIMEOUT)
            .into_iter()
            .map(|c| c.0)
            .collect();
        assert_eq!(expired, ["a"]);
    }
}
