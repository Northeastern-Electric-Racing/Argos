use evalexpr::{
    eval_boolean_with_context, ContextWithMutableVariables, DefaultNumericTypes, HashMapContext,
};
use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use serde_with::DurationSeconds;
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
}

#[serde_as]
#[derive(Deserialize)]
pub struct Rule {
    id: String,
    topic: String,
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

enum ClientRuleState {
    Alive(Vec<Rule>),
    Inactive,
}
pub enum RuleManagerError {
    NoMatchingRule,
    NoSuchClient,
    RuleFailure,
    Failure,
}

pub enum RulesStateChange {
    /// client_id, rule
    AddRule(String, Rule),
    /// client_id, rule_id
    DeleteRule(String, String),
    /// client_id
    DeleteClient(String),
}

pub struct RuleManager {
    /// <client_id, client_rules>
    clients_map: FxHashMap<String, ClientRuleState>,
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

    /// Handles a new socket message, returning a RuleNotification if action should be taken
    pub fn handle_msg(
        &mut self,
        data: ClientData,
    ) -> Result<Option<RuleNotification>, RuleManagerError> {
        let Some(clients) = self.rules_lookup.get(&data.name) else {
            return Err(RuleManagerError::NoMatchingRule);
        };
        for client_want in clients {
            let Some(rule_state) = self.clients_map.get_mut(client_want) else {
                warn!("Client cached but not found!");
                return Err(RuleManagerError::Failure);
            };
            let ClientRuleState::Alive(rules) = rule_state else {
                warn!("Rule cached but not found");
                return Err(RuleManagerError::Failure);
            };
            for rule in rules {
                if rule.topic == data.name {
                    let Some(is_triggered) = rule.tick(&data.values) else {
                        return Err(RuleManagerError::RuleFailure);
                    };
                    if is_triggered {
                        return Ok(Some(RuleNotification {
                            id: rule.id.clone(),
                            topic: rule.topic.clone(),
                            values: data.values,
                        }));
                    }
                }
            }
        }

        Ok(None)
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
            Some(client) => match client {
                ClientRuleState::Alive(rules) => rules.push(rule),
                ClientRuleState::Inactive => *client = ClientRuleState::Alive(vec![rule]),
            },
            None => {
                self.clients_map
                    .insert(client, ClientRuleState::Alive(vec![rule]));
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
        let Some(data) = self.clients_map.get_mut(&client_id) else {
            warn!("Could not find client {}", client_id);
            return Err(RuleManagerError::NoSuchClient);
        };

        // unwrap the rules
        let ClientRuleState::Alive(rules) = data else {
            warn!("Could not find rule to delete: {}", rule_id);
            return Err(RuleManagerError::NoMatchingRule);
        };

        // retain all rules but one with the ID
        rules.retain(|rule| rule.id != rule_id);

        // now, yeet the rule from the lookup cache
        let Some(clients) = self.rules_lookup.get_mut(&rule_id) else {
            warn!("Could not find rule in cache!");
            return Err(RuleManagerError::Failure);
        };
        // remove the client from the cache for that topic, deleting rule from cache if necessary
        clients.retain(|client| *client != client_id);
        if clients.is_empty() {
            self.rules_lookup.remove(&rule_id);
        }

        Ok(())
    }

    /// deletes a client, and all of its rules
    pub fn delete_client(&mut self, client_id: String) -> Result<(), RuleManagerError> {
        // first, yeet from clients map
        let Some(client_rules) = self.clients_map.remove(&client_id) else {
            warn!("Could not find client to delete: {}", client_id);
            return Err(RuleManagerError::NoSuchClient);
        };

        // now, yeet the topics from the lookup
        match client_rules {
            ClientRuleState::Alive(rules) => {
                for rule in rules {
                    let Some(client_list) = self.rules_lookup.get_mut(&rule.topic) else {
                        warn!("Could not find topic in rule lookup table!");
                        return Err(RuleManagerError::Failure);
                    };
                    client_list.retain(|client| *client != client_id);
                    if client_list.is_empty() {
                        self.rules_lookup.remove(&rule.topic);
                    }
                }
            }
            ClientRuleState::Inactive => return Ok(()),
        }

        Ok(())
    }
}

pub const RULE_SOCKET_KEY: &str = "rule_notify";
