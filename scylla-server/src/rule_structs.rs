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

use crate::rule_structs::BiMapRemoveResult::*;
use crate::ClientData;

static ASCII_LOWER: [char; 26] = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
    't', 'u', 'v', 'w', 'x', 'y', 'z',
];

#[derive(Debug, Clone)]
pub enum BiMapRemoveResult<T> {
    /// Removed succesfully, and also removed any empty mappings \
    /// Contains the data that was thrown out from the map because they were unused.
    RemovedWithCleanUp(T),
    /// Removed succesfully, no empty mappings to clean up
    RemovedOnly,
    NothingToRemove,
}

pub struct BiMultiMap<L, R> {
    left_to_right: FxHashMap<L, FxHashSet<R>>,
    right_to_left: FxHashMap<R, FxHashSet<L>>,
}

impl<L: Hash + Eq + Clone, R: Hash + Eq + Clone> BiMultiMap<L, R> {
    pub fn new() -> Self {
        Self {
            left_to_right: FxHashMap::default(),
            right_to_left: FxHashMap::default(),
        }
    }

    pub fn lefts(&self) -> Vec<L> {
        self.left_to_right.keys().cloned().collect()
    }

    pub fn rights(&self) -> Vec<R> {
        self.right_to_left.keys().cloned().collect()
    }

    pub fn get_right(&self, left: &L) -> Option<&FxHashSet<R>> {
        self.left_to_right.get(left)
    }

    pub fn get_left(&self, right: &R) -> Option<&FxHashSet<L>> {
        self.right_to_left.get(right)
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

    /// Remove all mappings for a given left key, if none left keys remain for a right key, remove that right key as well. \
    /// Returns: BiMapRemoveResult with optional set of empty rights that were cleaned from map.
    pub fn remove_left(&mut self, left: &L) -> BiMapRemoveResult<FxHashSet<R>> {
        Self::remove_key(&mut self.left_to_right, &mut self.right_to_left, left)
    }

    /// Remove all mappings for a given right key, if none right keys remain for a left key, remove that left key as well. \
    /// Returns: BiMapRemoveResult with optional set of empty lefts that were cleaned from map.
    pub fn remove_right(&mut self, right: &R) -> BiMapRemoveResult<FxHashSet<L>> {
        Self::remove_key(&mut self.right_to_left, &mut self.left_to_right, right)
    }

    /// Remove a specific mapping from left to right, cleaning up empty entries as needed.\
    /// Returns: BiMapRemoveresult with optional right that was cleaned from map.
    pub fn remove_right_from_left(&mut self, left: &L, right: &R) -> BiMapRemoveResult<R> {
        Self::remove_mapping(
            &mut self.left_to_right,
            &mut self.right_to_left,
            left,
            right,
        )
    }

    /// Remove a specific mapping from right to left, cleaning up empty entries as needed. \
    /// Returns: BiMapRemoveresult with optional left that was cleaned from map.
    pub fn remove_left_from_right(&mut self, right: &R, left: &L) -> BiMapRemoveResult<L> {
        Self::remove_mapping(
            &mut self.right_to_left,
            &mut self.left_to_right,
            right,
            left,
        )
    }

    fn remove_key<K, V>(
        k_to_v: &mut FxHashMap<K, FxHashSet<V>>,
        v_to_k: &mut FxHashMap<V, FxHashSet<K>>,
        key: &K,
    ) -> BiMapRemoveResult<FxHashSet<V>>
    where
        K: Hash + Eq + Clone,
        V: Hash + Eq + Clone,
    {
        let Some(values) = k_to_v.remove(key) else {
            return NothingToRemove;
        };

        let mut empty_values = FxHashSet::default();
        for value in values {
            if let Some(keys) = v_to_k.get_mut(&value) {
                keys.remove(key);
                if keys.is_empty() {
                    v_to_k.remove(&value);
                    empty_values.insert(value);
                }
            }
        }

        if empty_values.is_empty() {
            RemovedOnly
        } else {
            RemovedWithCleanUp(empty_values)
        }
    }

    fn remove_mapping<K, V>(
        k_to_v: &mut FxHashMap<K, FxHashSet<V>>,
        v_to_k: &mut FxHashMap<V, FxHashSet<K>>,
        key: &K,
        value: &V,
    ) -> BiMapRemoveResult<V>
    where
        K: Hash + Eq + Clone,
        V: Hash + Eq + Clone,
    {
        let Some(values) = k_to_v.get_mut(key) else {
            return NothingToRemove;
        };

        if !values.remove(value) {
            return NothingToRemove;
        }

        if values.is_empty() {
            k_to_v.remove(key);
        }

        if let Some(keys) = v_to_k.get_mut(value) {
            keys.remove(key);
            if keys.is_empty() {
                v_to_k.remove(value);
                RemovedWithCleanUp(value.clone())
            } else {
                RemovedOnly
            }
        } else {
            NothingToRemove
        }
    }
}

/// cooldown time
const COOLDOWN_TIME: std::time::Duration = std::time::Duration::from_secs(60);

/// socket key for sending rule notification events
pub const RULE_SOCKET_KEY: &str = "rule_notify";

// since client IDs, rule IDs, and topics are scattered about, wrap them here

/// a client_id, add to derives to get more string features
#[derive(PartialEq, Eq, Hash, Display, Clone, AsRef, Serialize)]
pub struct ClientId(pub String);

/// a Rule ID, add to derives to get more string features
#[derive(PartialEq, Eq, Hash, Display, Clone, Serialize, Deserialize)]
pub struct RuleId(pub String);

/// a MQTT topic to trigger on, add to derives to get more string features
#[derive(PartialEq, Eq, Hash, Display, Clone, Serialize, Deserialize)]
pub struct Topic(pub String);

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
#[derive(Deserialize, Serialize, Clone)]
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

#[derive(Serialize, Clone)]
/// Rule with subscription information
pub struct ClientRule {
    #[serde(flatten)]
    pub rule: Rule,
    pub subscribers: Vec<ClientId>,
    pub is_subscribed: bool,
}

#[derive(Serialize, Clone)]
/// Response containing all rules with subscription status
pub struct RulesResponse {
    pub requesting_client_id: String,
    pub rules: Vec<ClientRule>,
}

/// errors seen in the rule manager
#[derive(Debug)]
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
        let rule_ids = match self.topic_index.read().await.get(&data.name) {
            Some(rule_ids) => rule_ids.clone(), // Clone so we can drop resource
            None => {
                warn!("Could not find rule in topic -> rule index: {}", data.name);
                return Err(RuleManagerError::NoMatchingRule);
            }
        };

        let mut notifications: Vec<(ClientId, RuleNotification)> = Vec::new();
        for rule_id in rule_ids {
            let clients_op = self.subscriptions.read().await.get_left(&rule_id).cloned();

            if clients_op.is_none() {
                continue;
            }
            let clients = clients_op.unwrap();

            let triggered = match self
                .rules
                .write()
                .await
                .get_mut(&rule_id)
                .map(|rule| rule.tick(&data.values))
            {
                Some(Some(val)) => val,
                // Rule tick failed
                Some(None) => return Err(RuleManagerError::RuleFailure),
                None => {
                    warn!("Could not find rule in rules map: {}", rule_id);
                    return Err(RuleManagerError::NoMatchingRule);
                }
            };

            if !triggered {
                continue;
            }

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

        if notifications.is_empty() {
            Ok(None)
        } else {
            Ok(Some(notifications))
        }
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

    /// Deletes a rule from client. \
    /// If no more rules exist for that client, the client is also removed.
    pub async fn delete_rule(
        &self,
        client_id: ClientId,
        rule_id: RuleId,
    ) -> Result<(), RuleManagerError> {
        // Remove rule from client
        match self
            .subscriptions
            .write()
            .await
            .remove_right_from_left(&client_id, &rule_id)
        {
            RemovedWithCleanUp(_) | RemovedOnly => Ok(()),
            NothingToRemove => {
                warn!(
                    "Could not find client in subscriptions bimap to delete rule: {}",
                    client_id
                );
                Err(RuleManagerError::NoSuchClient)
            }
        }
    }

    /// Deletes a client, and all of its rules.
    /// Removes rules that are no longer subscribed to if needed.
    pub async fn delete_client(&self, client_id: ClientId) -> Result<(), RuleManagerError> {
        // Removing from left returns rules that no longer have clients
        match self.subscriptions.write().await.remove_left(&client_id) {
            RemovedWithCleanUp(_) | RemovedOnly => Ok(()),
            NothingToRemove => {
                warn!(
                    "Could not find client in subscriptions bimap to delete client: {}",
                    client_id
                );
                Err(RuleManagerError::NoSuchClient)
            }
        }
    }

    pub async fn get_all_rules(&self) -> Vec<Rule> {
        self.rules
            .read()
            .await
            .values()
            .into_iter()
            .map(|rule| rule.clone())
            .collect()
    }

    pub async fn get_all_rules_with_subscription_status(
        &self,
        requesting_client_id: Option<ClientId>,
    ) -> RulesResponse {
        let rules_guard = self.rules.read().await;
        let subscriptions_guard = self.subscriptions.read().await;

        let client_id_str = requesting_client_id
            .as_ref()
            .map(|id| id.0.clone())
            .unwrap_or_default();

        let rules = rules_guard
            .iter()
            .map(|(rule_id, rule)| {
                let subscribers = subscriptions_guard
                    .get_left(rule_id)
                    .cloned()
                    .unwrap_or_default();

                let is_subscribed = if let Some(ref client_id) = requesting_client_id {
                    subscribers.contains(client_id)
                } else {
                    false
                };

                ClientRule {
                    rule: rule.clone(),
                    subscribers: subscribers.into_iter().collect(),
                    is_subscribed,
                }
            })
            .collect();

        RulesResponse {
            requesting_client_id: client_id_str,
            rules,
        }
    }

    pub async fn get_all_clients(&self) -> Vec<ClientId> {
        self.subscriptions.read().await.lefts()
    }
}
