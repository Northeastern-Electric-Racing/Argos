use std::sync::Arc;

use axum::{debug_handler, extract::Path, Extension, Json};
use axum_extra::{
    headers::{authorization::Basic, Authorization},
    TypedHeader,
};
use tokio::sync::RwLock;
use tracing::{trace, warn};

use crate::{
    error::ScyllaError,
    rule_structs::{Rule, RuleManager},
};

#[debug_handler]
pub async fn add_rule(
    TypedHeader(auth): TypedHeader<Authorization<Basic>>,
    Extension(rules_manager): Extension<Arc<RwLock<RuleManager>>>,
    Json(rule): Json<Rule>,
) -> Result<Json<String>, ScyllaError> {
    trace!("AUTH {}", auth.username().to_string());
    warn!("Incoming rules reg: {}", rule.topic);
    match rules_manager
        .write()
        .await
        .add_rule(auth.username().to_string(), rule)
    {
        Ok(_) => Ok(Json::from("Rule added!".to_owned())),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}

#[debug_handler]
pub async fn delete_rule(
    TypedHeader(auth): TypedHeader<Authorization<Basic>>,
    Extension(rules_manager): Extension<Arc<RwLock<RuleManager>>>,
    Path(rule_id): Path<String>,
) -> Result<(), ScyllaError> {
    trace!("AUTH {}", auth.username().to_string());
    match rules_manager
        .write()
        .await
        .delete_rule(auth.username().to_string(), rule_id)
    {
        Ok(_) => Ok(()),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}
