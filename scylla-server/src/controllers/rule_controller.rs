use std::sync::Arc;

use axum::{debug_handler, Extension, Json};
use axum_extra::{
    headers::{authorization::Basic, Authorization},
    TypedHeader,
};
use tokio::sync::RwLock;

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
    match rules_manager
        .write()
        .await
        .add_rule(auth.username().to_string(), rule)
    {
        Ok(_) => Ok(Json::from("Rule added!".to_owned())),
        Err(err) => Err(ScyllaError::RuleError(err)),
    }
}
