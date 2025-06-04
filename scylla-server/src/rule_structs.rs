use chrono::DateTime;
use chrono::Utc;
use evalexpr::{
    eval_boolean_with_context, ContextWithMutableVariables, DefaultNumericTypes, HashMapContext,
};
use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use serde_with::DurationSeconds;
use tracing::trace;
use std::time::Duration;
use tracing::warn;

use crate::ClientData;

static ASCII_LOWER: [char; 26] = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
    't', 'u', 'v', 'w', 'x', 'y', 'z',
];

#[derive(Serialize)]
pub struct RuleNotification {
    pub id: String,
    pub topic: String,
    pub values: Vec<f32>,
    pub time: DateTime<Utc>,
}

#[serde_as]
#[derive(Deserialize)]
/// A single modular rule, can be serial/deserialized
pub struct Rule {
    id: String,
    pub topic: String,
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
    pub fn new(
        id: String,
        topic: String,
        debounce_time: std::time::Duration,
        expr: String,
    ) -> Self {
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
            if tokio::time::Instant::now()
                - self.last_seen.expect("Dont know when cooldown started")
                < std::time::Duration::from_secs(60)
            {
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
            } else if self.last_seen.unwrap() - self.first_seen.unwrap() > self.debounce_time {
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
    clients_map: FxHashMap<String, FxHashMap<String, Rule>>,
    /// <topic, Vec<client_id>>
    rules_lookup: FxHashMap<String, Vec<String>>,
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
    ) -> Result<Option<Vec<(String, RuleNotification)>>, RuleManagerError> {
        let Some(clients) = self.rules_lookup.get(&data.name) else {
            trace!("(normal) Could not find rule in rule cache: {}", data.name);
            return Err(RuleManagerError::NoMatchingRule);
        };
        let mut notifications: Vec<(String, RuleNotification)> = Vec::new();
        for client_want in clients {
            let Some(rules) = self.clients_map.get_mut(client_want) else {
                warn!("Client cached but not found!");
                return Err(RuleManagerError::Failure);
            };
            for rule in rules.values_mut() {
                if rule.topic == data.name {
                    // return rule failure if underlying tick fails
                    let Some(is_triggered) = rule.tick(&data.values) else {
                        return Err(RuleManagerError::RuleFailure);
                    };
                    if is_triggered {
                        notifications.push((
                            client_want.to_string(),
                            RuleNotification {
                                id: rule.id.clone(),
                                topic: rule.topic.clone(),
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
    pub fn add_rule(&mut self, client: String, rule: Rule) -> Result<(), RuleManagerError> {
        // go through the topics and add to rules lookup table
        match self.rules_lookup.get_mut(&rule.topic) {
            Some(rules) => {
                rules.push(client.clone());
            }
            None => {
                self.rules_lookup
                    .insert(rule.topic.clone(), vec![client.clone()]);
            }
        }

        // push rule, make client active and push rule, or create client and push rule
        match self.clients_map.get_mut(&client) {
            Some(client) => {
                client.insert(rule.id.clone(), rule);
            }

            None => {
                let mut map = FxHashMap::default();
                map.insert(rule.id.clone(), rule);
                self.clients_map.insert(client, map);
            }
        };

        Ok(())
    }

    /// Deletes a rule, leaving the client existing and active no matter what
    pub fn delete_rule(
        &mut self,
        client_id: String,
        rule_id: String,
    ) -> Result<(), RuleManagerError> {
        // first, find the rules from the clients map
        let Some(rules) = self.clients_map.get_mut(&client_id) else {
            warn!("Could not find client {}", client_id);
            return Err(RuleManagerError::NoSuchClient);
        };

        let Some(removed) = rules.remove(&rule_id) else {
            warn!("Could not find rule: {}", rule_id);
            return Err(RuleManagerError::NoMatchingRule);
        };

        // now, yeet the rule from the lookup cache
        let Some(clients) = self.rules_lookup.get_mut(&removed.topic) else {
            warn!("Could not find rule in cache!");
            return Err(RuleManagerError::Failure);
        };
        // remove the client from the cache for that topic, deleting rule from cache if necessary
        clients.retain(|client| *client != client_id);
        // delete client from cache is normal, the client could still exist without rules in client_map
        if clients.is_empty() {
            self.rules_lookup.remove(&rule_id);
        }

        Ok(())
    }

    /// deletes a client, and all of its rules
    pub fn delete_client(&mut self, client_id: String) -> Result<(), RuleManagerError> {
        // first, yeet from clients map
        let Some(rules) = self.clients_map.remove(&client_id) else {
            warn!("Could not find client to delete: {}", client_id);
            return Err(RuleManagerError::NoSuchClient);
        };

        // now, yeet the topics from the lookup
        for rule in rules.values() {
            let Some(client_list) = self.rules_lookup.get_mut(&rule.topic) else {
                warn!("Could not find topic in rule lookup table!");
                return Err(RuleManagerError::Failure);
            };
            client_list.retain(|client| *client != client_id);
            if client_list.is_empty() {
                self.rules_lookup.remove(&rule.topic);
            }
        }

        Ok(())
    }
}

pub const RULE_SOCKET_KEY: &str = "rule_notify";
