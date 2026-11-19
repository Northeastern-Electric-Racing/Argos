//! Spike #990: cap how many live "data" messages per second each Socket.IO client gets.
//!
//! Each client has a token bucket that refills at the cap and holds at most
//! [`BURST_SECS`] worth of tokens. A message goes to a client only if that client's
//! bucket has a token, regardless of topic. Only the live data stream is capped;
//! the database path, faults, timers, metadata and rule notifications are untouched.

use std::hash::Hash;
use std::time::Instant;

use rustc_hash::FxHashMap;

/// How many seconds of messages a client's bucket can hold, so a quiet client can
/// absorb a short burst at full speed before the cap applies.
pub const BURST_SECS: f64 = 0.1;

/// A token bucket refilling at `rate` tokens per second, holding at most `capacity`.
#[derive(Debug, Clone)]
pub struct TokenBucket {
    rate: f64,
    capacity: f64,
    tokens: f64,
    last: Instant,
}

impl TokenBucket {
    /// A full bucket allowing `rate` messages per second, with `burst_secs` of headroom
    /// (at least one message).
    #[must_use]
    pub fn new(rate: u32, burst_secs: f64, now: Instant) -> Self {
        let rate = f64::from(rate);
        let capacity = (rate * burst_secs).max(1.0);
        Self {
            rate,
            capacity,
            tokens: capacity,
            last: now,
        }
    }

    /// Refills for the time since the last call, then takes a token if one is there.
    pub fn try_take(&mut self, now: Instant) -> bool {
        let elapsed = now.saturating_duration_since(self.last).as_secs_f64();
        self.last = now;
        self.tokens = (self.tokens + elapsed * self.rate).min(self.capacity);
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

/// Which connected clients a message may go to.
#[derive(Debug, PartialEq, Eq)]
pub enum Admission<K> {
    /// Every client: send one broadcast, as without a cap.
    All,
    /// No client: drop the message.
    None,
    /// Only these clients: emit to each one.
    Some(Vec<K>),
}

/// Per-client token buckets, keyed by socket id.
#[derive(Debug)]
pub struct ClientRateCap<K> {
    rate: u32,
    burst_secs: f64,
    buckets: FxHashMap<K, TokenBucket>,
}

impl<K: Hash + Eq + Copy> ClientRateCap<K> {
    /// A cap of `rate` messages per second per client (`rate` must be non-zero).
    #[must_use]
    pub fn new(rate: u32, burst_secs: f64) -> Self {
        Self {
            rate,
            burst_secs,
            buckets: FxHashMap::default(),
        }
    }

    /// Decides, for one message, which of the currently connected `clients` get it,
    /// taking a token from each one that does. A newly seen client starts with a full
    /// bucket; buckets of clients no longer connected are dropped.
    pub fn admit(&mut self, clients: &[K], now: Instant) -> Admission<K> {
        if self.buckets.len() > clients.len()
            || clients.iter().any(|c| !self.buckets.contains_key(c))
        {
            self.buckets.retain(|k, _| clients.contains(k));
        }
        let mut allowed = Vec::new();
        for client in clients {
            let bucket = self
                .buckets
                .entry(*client)
                .or_insert_with(|| TokenBucket::new(self.rate, self.burst_secs, now));
            if bucket.try_take(now) {
                allowed.push(*client);
            }
        }
        if allowed.is_empty() {
            Admission::None
        } else if allowed.len() == clients.len() {
            Admission::All
        } else {
            Admission::Some(allowed)
        }
    }

    /// The number of clients currently tracked.
    #[must_use]
    pub fn tracked(&self) -> usize {
        self.buckets.len()
    }
}

#[cfg(test)]
#[path = "socket_rate_cap_bench.rs"]
mod bench;

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn bucket_allows_burst_then_refills_at_rate() {
        let t0 = Instant::now();
        let mut b = TokenBucket::new(100, 0.1, t0);
        // 10 tokens of burst headroom
        assert_eq!((0..20).filter(|_| b.try_take(t0)).count(), 10);
        // 50 ms later: 5 tokens refilled
        let t1 = t0 + Duration::from_millis(50);
        assert_eq!((0..20).filter(|_| b.try_take(t1)).count(), 5);
        // a long gap never holds more than the capacity
        let t2 = t1 + Duration::from_secs(10);
        assert_eq!((0..20).filter(|_| b.try_take(t2)).count(), 10);
    }

    #[test]
    fn bucket_capacity_is_at_least_one() {
        let t0 = Instant::now();
        let mut b = TokenBucket::new(1, 0.1, t0);
        assert!(b.try_take(t0));
        assert!(!b.try_take(t0 + Duration::from_millis(500)));
        assert!(b.try_take(t0 + Duration::from_secs(1)));
    }

    #[test]
    fn steady_overload_delivers_the_cap() {
        let t0 = Instant::now();
        let mut b = TokenBucket::new(500, BURST_SECS, t0);
        // 2,900 msgs/s for 10 s
        let n = 29_000u32;
        let kept = (0..n)
            .filter(|i| b.try_take(t0 + Duration::from_secs_f64(f64::from(*i) / 2900.0)))
            .count();
        // 10 s at 500/s plus the initial 50-message burst
        assert!((5_000..=5_051).contains(&kept), "kept {kept}");
    }

    #[test]
    fn admit_is_per_client_and_forgets_disconnected() {
        let t0 = Instant::now();
        let mut cap = ClientRateCap::new(10, 0.1);
        assert_eq!(cap.admit(&[1u32, 2], t0), Admission::All);
        // both buckets (capacity 1) are now empty
        assert_eq!(cap.admit(&[1, 2], t0), Admission::None);
        // a client joining later starts full
        assert_eq!(cap.admit(&[1, 2, 3], t0), Admission::Some(vec![3]));
        assert_eq!(cap.tracked(), 3);
        // client 2 leaves; 100 ms later everyone has a token again
        let t1 = t0 + Duration::from_millis(100);
        assert_eq!(cap.admit(&[1, 3], t1), Admission::All);
        assert_eq!(cap.tracked(), 2);
    }

    #[test]
    fn admit_with_no_clients_drops() {
        let mut cap = ClientRateCap::<u32>::new(10, 0.1);
        assert_eq!(cap.admit(&[], Instant::now()), Admission::None);
    }
}
