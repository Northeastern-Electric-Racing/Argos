use std::sync::Arc;

use axum::{
    Extension, Json, debug_handler,
    extract::{FromRequestParts, Path},
    http::{StatusCode, request::Parts},
};
use serde::Deserialize;
use serde_with::DurationSeconds;
use serde_with::serde_as;
use std::time::Duration;
use tracing::{debug, info};

use crate::{
    error::ScyllaError,
    rule_structs::{ClientId, Rule, RuleId, RuleManager, RulesResponse},
};

const CLIENT_ID_HEADER: &str = "x-client-id";

/// client id comes from the x-client-id header, keeping it out of conflict-prone route paths
/// extractor pattern: <https://docs.rs/axum/latest/axum/extract/index.html#defining-custom-extractors>
impl<S> FromRequestParts<S> for ClientId
where
    S: Send + Sync,
{
    type Rejection = ScyllaError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .headers
            .get(CLIENT_ID_HEADER)
            .and_then(|value| value.to_str().ok())
            .filter(|value| !value.is_empty())
            .map(|value| ClientId(value.to_owned()))
            .ok_or_else(|| {
                ScyllaError::HttpError(
                    StatusCode::BAD_REQUEST,
                    format!("Missing or empty {CLIENT_ID_HEADER} header"),
                )
            })
    }
}

#[debug_handler]
pub async fn add_rule(
    client_id: ClientId,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(rule): Json<Rule>,
) -> Result<Json<String>, ScyllaError> {
    info!("Incoming rules reg: {}, from {}", rule.topic, client_id);
    match rules_manager.add_rule(client_id, rule).await {
        Ok(()) => Ok(Json::from("Rule added!".to_owned())),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}

#[debug_handler]
pub async fn delete_rule(
    client_id: ClientId,
    Path(rule_id): Path<String>,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
) -> Result<(), ScyllaError> {
    info!("Incoming rules del: {}, from {}", rule_id, client_id);
    match rules_manager.delete_rule(client_id, RuleId(rule_id)).await {
        Ok(()) => Ok(()),
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
pub async fn get_client_subscribed_rules(
    client_id: ClientId,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
) -> Json<Vec<Rule>> {
    debug!("Fetching subscribed rules for client {}", client_id);
    Json(rules_manager.get_client_rules(client_id).await)
}

#[debug_handler]
pub async fn get_all_rules_with_client_info(
    client_id: ClientId,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
) -> Result<Json<RulesResponse>, ScyllaError> {
    debug!("Fetching all rules");
    Ok(Json(
        rules_manager
            .get_all_rules_with_subscription_status(client_id)
            .await,
    ))
}

#[debug_handler]
pub async fn check_rule(
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(rule): Json<Rule>,
) -> Result<Json<bool>, ScyllaError> {
    Ok(Json(rules_manager.check_duplicate(&rule).await))
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
    Path(rule_id): Path<String>,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(EditRulePayload {
        expr,
        debounce_time,
    }): Json<EditRulePayload>,
) -> Result<(), ScyllaError> {
    info!("Incoming rules edit: {}", rule_id);
    rules_manager
        .edit_rule(RuleId(rule_id), expr, debounce_time)
        .await
        .map_err(ScyllaError::RuleError)
}

#[debug_handler]
pub async fn unsubscribe_rules(
    client_id: ClientId,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(rule_ids): Json<Vec<String>>,
) -> Result<Json<String>, ScyllaError> {
    info!(
        "Unsubscribing client {} from {} rules",
        client_id,
        rule_ids.len()
    );

    let rule_ids: Vec<RuleId> = rule_ids.into_iter().map(RuleId).collect();

    match rules_manager.unsubscribe_rules(client_id, rule_ids).await {
        Ok(()) => Ok(Json::from(
            "Successfully unsubscribed from rules".to_owned(),
        )),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}

#[debug_handler]
pub async fn subscribe_rules(
    client_id: ClientId,
    Extension(rules_manager): Extension<Arc<RuleManager>>,
    Json(rule_ids): Json<Vec<String>>,
) -> Result<Json<String>, ScyllaError> {
    info!(
        "Subscribing client {} to {} rules",
        client_id,
        rule_ids.len()
    );

    let rule_ids: Vec<RuleId> = rule_ids.into_iter().map(RuleId).collect();

    match rules_manager.subscribe_rules(client_id, rule_ids).await {
        Ok(()) => Ok(Json::from("Successfully subscribed to rules".to_owned())),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}
