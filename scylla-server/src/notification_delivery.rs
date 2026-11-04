use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use futures_util::StreamExt;
use futures_util::stream::FuturesUnordered;
use rustc_hash::{FxHashMap, FxHashSet};
use serde::Serialize;
use socketioxide::AckError;
use socketioxide::extract::SocketRef;
use socketioxide::socket::Sid;
use tokio::sync::mpsc;
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;
use tracing::{debug, info, warn};

use crate::notification_store::NotificationStore;
use crate::rule_structs::{
    ClientId, NotificationId, RULE_SOCKET_KEY, RuleManager, RuleNotification,
};

/// Event telling a client it fell too far behind: its missed notifications and subscriptions
/// were dropped
pub const RULE_DROPPED_SOCKET_KEY: &str = "rule_subscriptions_dropped";

/// What the delivery task reacts to; everything notification-related goes through it
pub enum NotificationEvent {
    /// A Rule fired, one entry per subscribed client
    Fired(Vec<(ClientId, RuleNotification)>),
    Connected(ClientId, SocketRef),
    Disconnected(ClientId, Sid),
}

#[derive(Serialize)]
struct SubscriptionsDropped {
    reason: &'static str,
}

type PendingAck =
    Pin<Box<dyn Future<Output = (ClientId, NotificationId, Result<(), AckError>)> + Send>>;

/// Owns the notification store, which clients are connected, and the acks being waited on, so
/// no other task touches notification state
struct Delivery {
    store: NotificationStore,
    sockets: FxHashMap<ClientId, SocketRef>,
    /// given up on while not connected, told when they next connect
    to_tell_dropped: FxHashSet<ClientId>,
    acks: FuturesUnordered<PendingAck>,
    rule_manager: Arc<RuleManager>,
}

/// Delivers Rule notifications with acks, storing each unacked one once until every client
/// it went to acks it, or a store limit gives up on the clients still waiting
pub async fn notification_delivery(
    cancel_token: CancellationToken,
    mut events: mpsc::UnboundedReceiver<NotificationEvent>,
    rule_manager: Arc<RuleManager>,
    store: NotificationStore,
) {
    info!(task = "notification_delivery", "starting");
    let mut delivery = Delivery {
        store,
        sockets: FxHashMap::default(),
        to_tell_dropped: FxHashSet::default(),
        acks: FuturesUnordered::new(),
        rule_manager,
    };
    let mut expire_interval = tokio::time::interval(Duration::from_secs(1));
    let mut stats_interval = tokio::time::interval(Duration::from_secs(10));
    loop {
        tokio::select! {
            () = cancel_token.cancelled() => break,
            event = events.recv() => match event {
                Some(event) => delivery.handle(event).await,
                None => break,
            },
            Some((client, notification_id, result)) = delivery.acks.next(), if !delivery.acks.is_empty() => {
                match result {
                    // any reply proves receipt; an argument-less ack() has nothing to decode
                    Ok(()) | Err(AckError::Decode(_)) => {
                        delivery.store.ack(&client, &notification_id);
                    }
                    Err(err) => debug!("Client {} did not ack notification {}, err {}", client, notification_id, err),
                }
            }
            _ = expire_interval.tick() => {
                let dropped = delivery.store.expire(Instant::now());
                delivery.give_up_on(dropped).await;
            }
            _ = stats_interval.tick() => {
                info!(
                    task = "notification_delivery",
                    stored = delivery.store.len(),
                    waiting = delivery.store.waiting_count(),
                    awaiting_acks = delivery.acks.len(),
                    "notification store"
                );
            }
        }
    }
}

impl Delivery {
    async fn handle(&mut self, event: NotificationEvent) {
        match event {
            NotificationEvent::Fired(notifications) => self.fired(notifications).await,
            NotificationEvent::Connected(client, socket) => {
                if self.to_tell_dropped.remove(&client) {
                    tell_dropped(&client, &socket);
                }
                let pending = self.store.pending_for(&client);
                if !pending.is_empty() {
                    info!(
                        "Resending {} unacked notifications to {}",
                        pending.len(),
                        client
                    );
                }
                self.sockets.insert(client.clone(), socket);
                for notification in pending {
                    self.send(&client, notification);
                }
            }
            NotificationEvent::Disconnected(client, sid) => {
                // a reconnect may have already replaced this socket with a newer one
                if self.sockets.get(&client).is_some_and(|s| s.id == sid) {
                    self.sockets.remove(&client);
                }
            }
        }
    }

    async fn fired(&mut self, notifications: Vec<(ClientId, RuleNotification)>) {
        // one firing reaches several clients; store it once for all of them
        let mut firings: Vec<(RuleNotification, Vec<ClientId>)> = Vec::new();
        for (client, notification) in notifications {
            match firings
                .iter_mut()
                .find(|(n, _)| n.notification_id == notification.notification_id)
            {
                Some((_, clients)) => clients.push(client),
                None => firings.push((notification, vec![client])),
            }
        }
        for (notification, clients) in firings {
            let dropped = self
                .store
                .store(notification.clone(), clients.clone(), Instant::now());
            let dropped = self.give_up_on(dropped).await;
            for client in clients.iter().filter(|c| !dropped.contains(c)) {
                self.send(client, notification.clone());
            }
        }
    }

    fn send(&mut self, client: &ClientId, notification: RuleNotification) {
        let Some(socket) = self.sockets.get(client) else {
            debug!(
                "Client {} not connected, holding notification until it reconnects",
                client
            );
            return;
        };
        match socket.emit_with_ack::<_, serde::de::IgnoredAny>(RULE_SOCKET_KEY, &notification) {
            Ok(ack) => {
                let client = client.clone();
                self.acks.push(Box::pin(async move {
                    (client, notification.notification_id, ack.await.map(|_| ()))
                }));
            }
            // still stored, so it is resent when the client reconnects
            Err(err) => warn!(
                "Could not send rule notification to {}, err {}",
                client, err
            ),
        }
    }

    /// Deletes the subscriptions of clients a store limit gave up on, and tells them
    async fn give_up_on(&mut self, clients: Vec<ClientId>) -> FxHashSet<ClientId> {
        let clients: FxHashSet<ClientId> = clients.into_iter().collect();
        for client in &clients {
            warn!("Client {} fell too far behind, deleting client", client);
            let _ = self.rule_manager.delete_client(client.clone()).await;
            match self.sockets.get(client) {
                Some(socket) => tell_dropped(client, socket),
                None => {
                    self.to_tell_dropped.insert(client.clone());
                }
            }
        }
        clients
    }
}

fn tell_dropped(client: &ClientId, socket: &SocketRef) {
    let message = SubscriptionsDropped {
        reason: "fell too far behind on rule notifications",
    };
    if let Err(err) = socket.emit(RULE_DROPPED_SOCKET_KEY, &message) {
        warn!(
            "Could not tell {} its subscriptions were dropped, err {}",
            client, err
        );
    }
}
