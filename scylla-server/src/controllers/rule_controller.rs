use std::sync::Arc;

use axum::{debug_handler, extract::Path, Extension, Json};
use axum_extra::{
    headers::{authorization::Basic, Authorization},
    TypedHeader,
};
use serde::Deserialize;
use serde_with::serde_as;
use serde_with::DurationSeconds;
use std::time::Duration;
use tracing::debug;

use crate::{
    error::ScyllaError,
    rule_structs::{ClientId, Rule, RuleId, RuleManager, RulesResponse},
};

#[debug_handler]
pub async fn add_rule(
    TypedHeader(auth): TypedHeader<Authorization<Basic>>,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(rule): Json<Rule>,
) -> Result<Json<String>, ScyllaError> {
    debug!(
        "Incoming rules reg: {}, from {}",
        rule.topic,
        auth.username().to_string()
    );
    match rules_manager
        .add_rule(ClientId(auth.username().to_string()), rule)
        .await
    {
        Ok(_) => Ok(Json::from("Rule added!".to_owned())),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}

#[debug_handler]
pub async fn delete_rule(
    TypedHeader(auth): TypedHeader<Authorization<Basic>>,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Path(rule_id): Path<String>,
) -> Result<(), ScyllaError> {
    debug!(
        "Incoming rules del: {}, from {}",
        rule_id,
        auth.username().to_string()
    );
    match rules_manager
        .delete_rule(ClientId(auth.username().to_string()), RuleId(rule_id))
        .await
    {
        Ok(_) => Ok(()),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}

#[debug_handler]
pub async fn get_all_rules(
    Extension(rules_manager): Extension<Arc<RuleManager>>,
) -> Json<Vec<Rule>> {
    debug!("Fetching all rules");
    Json(rules_manager.get_all_rules().await)
}

#[debug_handler]
pub async fn get_all_rules_with_client_info(
    Path(client_id): Path<String>,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
) -> Result<Json<RulesResponse>, ScyllaError> {
    debug!("Fetching all rules");
    Ok(Json(
        rules_manager
            .get_all_rules_with_subscription_status(ClientId(client_id))
            .await,
    ))
}

#[serde_as]
#[derive(Deserialize)]
pub struct EditRulePayload {
    pub expr: String,
    #[serde_as(as = "DurationSeconds<u64>")]
    pub debounce_time: Duration,
}

#[debug_handler]
pub async fn edit_rule(
    TypedHeader(auth): TypedHeader<Authorization<Basic>>,
    Path(rule_id): Path<String>,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(EditRulePayload {
        expr,
        debounce_time,
    }): Json<EditRulePayload>,
) -> Result<(), ScyllaError> {
    rules_manager
        .edit_rule(RuleId(rule_id), expr, debounce_time)
        .await
        .map_err(|e| ScyllaError::RuleError(e))
}
