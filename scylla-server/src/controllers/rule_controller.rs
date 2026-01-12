use std::sync::Arc;

use axum::{debug_handler, extract::Path, Extension, Json};
use axum_extra::{
    headers::{authorization::Basic, Authorization},
    TypedHeader,
};
use tracing::debug;

use crate::{
    error::ScyllaError,
    rule_structs::{ClientId, Rule, RuleId, RuleManager},
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
