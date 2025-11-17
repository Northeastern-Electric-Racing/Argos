use chrono::DateTime;
use chrono::Utc;
use derive_more::AsRef;
use derive_more::Display;
use evalexpr::{
    eval_boolean_with_context, ContextWithMutableVariables, DefaultNumericTypes, HashMapContext,
};
use rustc_hash::FxHashMap;
use rustc_hash::FxHashSet;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use serde_with::DurationSeconds;
use std::borrow::Borrow;
use std::hash::Hash;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::trace;
use tracing::warn;

use crate::ClientData;

static ASCII_LOWER: [char; 26] = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
    't', 'u', 'v', 'w', 'x', 'y', 'z',
];

struct BiMultiMap<L, R> {
    left_to_right: FxHashMap<L, FxHashSet<R>>,
    right_to_left: FxHashMap<R, FxHashSet<L>>,
}

#[allow(dead_code)]
impl<L: Hash + Eq + Clone, R: Hash + Eq + Clone> BiMultiMap<L, R> {
    pub fn new() -> Self {
        Self {
            left_to_right: FxHashMap::default(),
            right_to_left: FxHashMap::default(),
        }
    }

    pub fn get_right(&self, left: &L) -> Option<&FxHashSet<R>> {
        self.left_to_right.get(left)
    }

    pub fn get_left(&self, right: &R) -> Option<&FxHashSet<L>> {
        self.right_to_left.get(right)
    }

    pub fn get_right_mut(&mut self, left: &L) -> Option<&mut FxHashSet<R>> {
        self.left_to_right.get_mut(left)
    }

    pub fn get_left_mut(&mut self, right: &R) -> Option<&mut FxHashSet<L>> {
        self.right_to_left.get_mut(right)
    }

    pub fn insert(&mut self, left: &L, right: &R) {
        self.left_to_right
            .entry(left.clone())
            .or_insert_with(FxHashSet::default)
            .insert(right.clone());
        self.right_to_left
            .entry(right.clone())
            .or_insert_with(FxHashSet::default)
            .insert(left.clone());
    }

    /// remove all mappings for a given left key, if none left keys remain for a right key, remove that right key as well
    pub fn remove_left(&mut self, left: &L) {
        if let Some(rights) = self.left_to_right.remove(left) {
            for right in rights {
                if let Some(lefts) = self.right_to_left.get_mut(&right) {
                    lefts.remove(left);
                    if lefts.is_empty() {
                        self.right_to_left.remove(&right);
                    }
                }
            }
        }
    }

    /// remove all mappings for a given right key, if none right keys remain for a left key, remove that left key as well
    pub fn remove_right(&mut self, right: &R) {
        if let Some(lefts) = self.right_to_left.remove(right) {
            for left in lefts {
                if let Some(rights) = self.left_to_right.get_mut(&left) {
                    rights.remove(right);
                    if rights.is_empty() {
                        self.left_to_right.remove(&left);
                    }
                }
            }
        }
    }
}

/// cooldown time
const COOLDOWN_TIME: std::time::Duration = std::time::Duration::from_secs(60);

/// socket key for sending rule notification events
pub const RULE_SOCKET_KEY: &str = "rule_notify";

// since client IDs, rule IDs, and topics are scattered about, wrap them here

/// a client_id, add to derives to get more string features
#[derive(PartialEq, Eq, Hash, Display, Clone, AsRef)]
pub struct ClientId(pub String);

/// a Rule ID, add to derives to get more string features
#[derive(PartialEq, Eq, Hash, Display, Clone, Serialize, Deserialize)]
pub struct RuleId(pub String);

/// a MQTT topic to trigger on, add to derives to get more string features
#[derive(PartialEq, Eq, Hash, Display, Clone, Serialize, Deserialize)]
pub struct Topic(String);

impl Borrow<str> for Topic {
    fn borrow(&self) -> &str {
        &self.0
    }
}

impl Borrow<String> for Topic {
    fn borrow(&self) -> &String {
        &self.0
    }
}

#[derive(Serialize)]
pub struct RuleNotification {
    pub id: RuleId,
    pub topic: Topic,
    pub values: Vec<f32>,
    pub time: DateTime<Utc>,
}

#[serde_as]
#[derive(Deserialize)]
/// A single modular rule, can be serial/deserialized
pub struct Rule {
    id: RuleId,
    pub topic: Topic,
    #[serde_as(as = "DurationSeconds<u64>")]
    debounce_time: Duration,
    expr: String,
    #[serde(skip)]
    last_seen: Option<tokio::time::Instant>,
    #[serde(skip)]
    first_seen: Option<tokio::time::Instant>,
    #[serde(skip)]
    during_cooldown: bool,
}

impl Rule {
    /// create a new rule
    pub fn new(id: RuleId, topic: Topic, debounce_time: std::time::Duration, expr: String) -> Self {
        Self {
            id,
            topic,
            debounce_time,
            expr,
            last_seen: None,
            first_seen: None,
            during_cooldown: false,
        }
    }

    /// process an event of seeing this topic, with the given values
    fn process_seen(&self, values: &[f32]) -> Option<bool> {
        let mut context: HashMapContext<DefaultNumericTypes> =
            HashMapContext::<DefaultNumericTypes>::new();
        for i in 0..values.len() {
            if let Err(err) = context.set_value(
                ASCII_LOWER
                    .get(i)
                    .expect("out of bounds alphabet")
                    .to_string(),
                evalexpr::Value::from_float(*values.get(i).unwrap() as f64),
            ) {
                warn!("Could not eval: {}", err);
                return None;
            };
        }
        match eval_boolean_with_context(&self.expr, &context) {
            Ok(res) => Some(res),
            Err(err) => {
                warn!("Failed to evaluate rule expression: {}", err);
                None
            }
        }
    }

    /// process a tick (seeing this topic)
    /// returns a boolean of whether the rule was triggered, or None if err
    pub fn tick(&mut self, values: &[f32]) -> Option<bool> {
        if self.during_cooldown {
            // check cooldown should still be happening then bail if so
            let Some(last_seen) = self.last_seen else {
                warn!("Don't know when cooldown began!");
                return None;
            };
            if tokio::time::Instant::now() - last_seen < COOLDOWN_TIME {
                return Some(false);
            } else {
                // end cooldown, restart counting
                self.during_cooldown = false;
                self.first_seen = None;
                self.last_seen = None;
            }
        }
        // process whether we have seen it, abort if error
        let res = self.process_seen(values)?;

        // if we have triggered and we arent during cooldown
        if res && !self.during_cooldown {
            self.last_seen = Some(tokio::time::Instant::now());
            // if this is the first time we see it
            if self.first_seen.is_none() {
                self.first_seen = Some(tokio::time::Instant::now());
            } else if self.last_seen.expect("impossible last seen")
                - self.first_seen.expect("impossible first seen")
                > self.debounce_time
            {
                // we have a winner, lets cleanup and enter cooldown state
                self.during_cooldown = true;
                return Some(true);
            }
        }
        Some(false)
    }
}

/// errors seen in the rule manager
pub enum RuleManagerError {
    NoMatchingRule,
    NoSuchClient,
    RuleFailure,
    Failure,
}

/// the rule manager
pub struct RuleManager {
    /// <rule_id, rule>
    rules: RwLock<FxHashMap<RuleId, Rule>>,
    /// <topic, Vec<rule_id>>
    topic_index: RwLock<FxHashMap<Topic, FxHashSet<RuleId>>>,
    /// bimap<client_id, rule_id>
    subscriptions: RwLock<BiMultiMap<ClientId, RuleId>>,
}
impl Default for RuleManager {
    fn default() -> Self {
        Self::new()
    }
}

impl RuleManager {
    pub fn new() -> Self {
        Self {
            rules: RwLock::new(FxHashMap::default()),
            topic_index: RwLock::new(FxHashMap::default()),
            subscriptions: RwLock::new(BiMultiMap::new()),
        }
    }

    /// Handles a new socket message, returning a RuleNotification for one to many clients if action should be taken
    pub async fn handle_msg(
        &self,
        data: &ClientData,
    ) -> Result<Option<Vec<(ClientId, RuleNotification)>>, RuleManagerError> {
        // Read from topic to rule index and drop lock immediately
        let rule_ids = {
            let topic_index_read = self.topic_index.read().await;
            match topic_index_read.get(&data.name) {
                Some(rule_ids) => rule_ids.clone(),
                None => {
                    trace!("Could not find rule in topic -> rule index: {}", data.name);
                    return Err(RuleManagerError::NoMatchingRule);
                }
            }
        };

        let mut notifications: Vec<(ClientId, RuleNotification)> = Vec::new();

        for rule_id in rule_ids {
            let rule_triggered = {
                let mut rules_write = self.rules.write().await;
                let Some(rule) = rules_write.get_mut(&rule_id) else {
                    trace!("Could not find rule in rules map: {}", rule_id);
                    return Err(RuleManagerError::NoMatchingRule);
                };
                let Some(triggered) = rule.tick(&data.values) else {
                    return Err(RuleManagerError::RuleFailure);
                };
                triggered
            };

            let clients = {
                let subscriptions_read = self.subscriptions.read().await;
                // get all clients subscribed to this rule
                match subscriptions_read.get_left(&rule_id) {
                    Some(clients) => clients.clone(),
                    None => {
                        trace!(
                            "(indexed) Could not find clients for rule in subscriptions bimap: {}",
                            data.name
                        );
                        return Err(RuleManagerError::NoMatchingRule);
                    }
                }
            };

            // Clients should never be empty
            if clients.is_empty() {
                warn!("Empty subscriptions entry for rule {}!", rule_id);
            }

            // Push notifications for all clients who are subscribed to this rule
            if rule_triggered {
                for client in clients {
                    notifications.push((
                        client.clone(),
                        RuleNotification {
                            id: rule_id.clone(),
                            topic: Topic(data.name.clone()),
                            values: data.values.clone(),
                            time: data.timestamp,
                        },
                    ));
                }
            }
        }
        Ok(Some(notifications))
    }

    /// Adds a rule, creating or activating the client if needed
    pub async fn add_rule(&self, client: ClientId, rule: Rule) -> Result<(), RuleManagerError> {
        // Add to subscriptions bimap
        self.subscriptions
            .write()
            .await
            .insert(&client, &rule.id.clone());

        // Add to topic index
        self.topic_index
            .write()
            .await
            .entry(rule.topic.clone())
            .or_insert(FxHashSet::default())
            .insert(rule.id.clone());

        // Add to rules lookup
        self.rules.write().await.insert(rule.id.clone(), rule);
        Ok(())
    }

    /// Deletes a rule from client, if no more clients exist for the rule, delete it entirely
    pub async fn delete_rule(
        &self,
        client_id: ClientId,
        rule_id: RuleId,
    ) -> Result<(), RuleManagerError> {
        // Remove rule from client
        let no_more_clients = {
            let mut subscriptions_write = self.subscriptions.write().await;
            let Some(rules) = subscriptions_write.get_right_mut(&client_id) else {
                warn!(
                    "Could not find client in subscriptions bimap to delete rule: {}",
                    client_id
                );
                return Err(RuleManagerError::NoSuchClient); // Keep this early return
            };
            rules.remove(&rule_id);
            if rules.is_empty() {
                subscriptions_write.remove_left(&client_id);
                true
            } else {
                false
            }
        };

        // If no more clients exist for this rule, delete it from rules and topic index
        // Gaurd
        if !no_more_clients {
            return Ok(());
        }

        // Remove from topic index and rules map
        let topic = match self.rules.read().await.get(&rule_id) {
            Some(rule) => rule.topic.clone(),
            None => {
                warn!("No matching rule found for rule_id {}", rule_id);
                return Err(RuleManagerError::NoMatchingRule);
            }
        };
        self.topic_index.write().await.remove(&topic);
        self.rules.write().await.remove(&rule_id);

        Ok(())
    }

    /// deletes a client, and all of its rules
    pub async fn delete_client(&self, client_id: ClientId) -> Result<(), RuleManagerError> {
        // Just remove using bi multi map
        self.subscriptions.write().await.remove_left(&client_id);
        Ok(())
    }
}
