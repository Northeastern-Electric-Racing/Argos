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
use std::time::Duration;
use tracing::trace;
use tracing::warn;

use crate::ClientData;

static ASCII_LOWER: [char; 26] = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
    't', 'u', 'v', 'w', 'x', 'y', 'z',
];

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
    /// <client_id, <rule_id, rule>>
    clients_map: FxHashMap<ClientId, FxHashMap<Topic, Vec<Rule>>>,
    /// <topic, Vec<client_id>>
    rules_lookup: FxHashMap<Topic, FxHashSet<ClientId>>,
}
impl Default for RuleManager {
    fn default() -> Self {
        Self::new()
    }
}

impl RuleManager {
    pub fn new() -> Self {
        Self {
            clients_map: FxHashMap::default(),
            rules_lookup: FxHashMap::default(),
        }
    }

    /// Handles a new socket message, returning a RuleNotification for one to many clients if action should be taken
    pub fn handle_msg(
        &mut self,
        data: &ClientData,
    ) -> Result<Option<Vec<(ClientId, RuleNotification)>>, RuleManagerError> {
        // TODO uneccessary clone
        let topic = Topic(data.name.clone());

        let Some(clients) = self.rules_lookup.get(&topic) else {
            trace!("(normal) Could not find rule in rule cache: {}", data.name);
            return Err(RuleManagerError::NoMatchingRule);
        };
        let mut notifications: Vec<(ClientId, RuleNotification)> = Vec::new();

        // warning if the clients is empty we havent been cleaning right
        if clients.is_empty() {
            warn!("Empty rule cache entry for {}!", data.name);
        }

        for client_want in clients {
            let Some(rules) = self.clients_map.get_mut(client_want) else {
                warn!("Client cached but not found!");
                return Err(RuleManagerError::Failure);
            };

            if let Some(rule_set) = rules.get_mut(&topic) {
                for rule in rule_set {
                    // return rule failure if underlying tick fails
                    let Some(is_triggered) = rule.tick(&data.values) else {
                        return Err(RuleManagerError::RuleFailure);
                    };
                    if is_triggered {
                        notifications.push((
                            client_want.clone(),
                            RuleNotification {
                                id: rule.id.clone(),
                                topic: topic.clone(),
                                values: data.values.clone(),
                                time: data.timestamp,
                            },
                        ));
                    }
                }
            }
        }
        // pass back the results
        if notifications.is_empty() {
            Ok(None)
        } else {
            Ok(Some(notifications))
        }
    }

    /// Adds a rule, creating or activating the client if needed
    pub fn add_rule(&mut self, client: ClientId, rule: Rule) -> Result<(), RuleManagerError> {
        // go through the topics and add to rules lookup table
        match self.rules_lookup.get_mut(&rule.topic) {
            Some(rules) => {
                rules.insert(client.clone());
            }
            None => {
                let mut new_set = FxHashSet::default();
                new_set.insert(client.clone());
                self.rules_lookup.insert(rule.topic.clone(), new_set);
            }
        }

        // push rule, make client active and push rule, or create client and push rule
        match self.clients_map.get_mut(&client) {
            Some(client) => match client.get_mut(&rule.topic) {
                Some(set) => set.push(rule),
                None => {
                    client.insert(rule.topic.clone(), vec![rule]);
                }
            },

            None => {
                let mut map = FxHashMap::default();
                map.insert(rule.topic.clone(), vec![rule]);
                self.clients_map.insert(client, map);
            }
        };

        Ok(())
    }

    /// Deletes a rule, leaving the client existing and active no matter what
    pub fn delete_rule(
        &mut self,
        client_id: ClientId,
        rule_id: RuleId,
    ) -> Result<(), RuleManagerError> {
        // first, find the rules from the clients map
        let Some(rules) = self.clients_map.get_mut(&client_id) else {
            warn!("Could not find client {}", client_id);
            return Err(RuleManagerError::NoSuchClient);
        };

        let mut removed: Option<Rule> = None;
        for rule_vals in rules.values_mut() {
            let Some(pos) = rule_vals.iter().position(|a| a.id == rule_id) else {
                break;
            };
            removed = Some(rule_vals.remove(pos));
        }

        let Some(removed) = removed else {
            warn!("Could not find rule: {}", rule_id);
            return Err(RuleManagerError::NoMatchingRule);
        };

        // now, yeet the rule from the lookup cache, ONLY IF the client doesnt have any rules with the given topic left
        let lookup_preserve = rules.contains_key(&removed.topic);

        if !lookup_preserve {
            let Some(clients) = self.rules_lookup.get_mut(&removed.topic) else {
                warn!("Could not find rule in cache!");
                return Err(RuleManagerError::Failure);
            };
            // remove the client from the cache for that topic, deleting rule from cache if necessary
            clients.retain(|client| *client != client_id);
            // delete client from cache is normal, the client could still exist without rules in client_map
            if clients.is_empty() {
                self.rules_lookup.remove(&removed.topic);
            }
        } // else we dont touch the lookup cache

        Ok(())
    }

    /// deletes a client, and all of its rules
    pub fn delete_client(&mut self, client_id: ClientId) -> Result<(), RuleManagerError> {
        // first, yeet from clients map
        let Some(rules) = self.clients_map.remove(&client_id) else {
            warn!("Could not find client to delete: {}", client_id);
            return Err(RuleManagerError::NoSuchClient);
        };

        // now, for each unique topic found amongst the rules, yeet it from the lookup
        // this uses a hashset to de-dup the rules to avoid annoying warnings
        for rule in rules.keys() {
            warn!("DELETING {}", rule);
            let Some(client_list) = self.rules_lookup.get_mut(rule) else {
                warn!("Could not find topic in rule lookup table!");
                return Err(RuleManagerError::Failure);
            };
            client_list.retain(|client| *client != client_id);
            // remove the whole entry if no clients exist for the topic
            if client_list.is_empty() {
                self.rules_lookup.remove(rule);
            }
        }

        Ok(())
    }
}
