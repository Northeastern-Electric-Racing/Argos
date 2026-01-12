use std::fmt::Debug;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tracing::warn;

use crate::rule_structs::RuleManagerError;

pub enum ScyllaError {
    /// Deseil error
    DbError(diesel::result::Error),
    /// Diesel db connection error,
    ConnError(diesel_async::pooled_connection::bb8::RunError),
    /// An instruction was not encodable
    InvalidEncoding(String),
    /// Could not communicate to car
    CommFailure(String),
    /// A query turned up empty that should not have
    EmptyResult,
    /// A setting change was requested with an invalid parameter
    InvalidSetting(String),
    /// An invalid request was made
    HttpError(StatusCode, String),
    /// An error when writing or retrieving a file was made
    FileError(String),
    /// An error when receiving or sending an mqtt message
    MqttError(String),
    /// An error from interacting with rules
    RuleError(RuleManagerError),
}

impl From<diesel::result::Error> for ScyllaError {
    fn from(error: diesel::result::Error) -> Self {
        ScyllaError::DbError(error)
    }
}

impl From<diesel_async::pooled_connection::bb8::RunError> for ScyllaError {
    fn from(error: diesel_async::pooled_connection::bb8::RunError) -> Self {
        ScyllaError::ConnError(error)
    }
}

// This centralizes all different errors from our app in one place
impl IntoResponse for ScyllaError {
    fn into_response(self) -> Response {
        let (status, reason) = match self {
            ScyllaError::ConnError(error) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Could not connect to db: {error}"),
            ),
            ScyllaError::DbError(error) => (
                StatusCode::BAD_REQUEST,
                format!("Misc query error: {error}"),
            ),
            ScyllaError::InvalidEncoding(reason) => (StatusCode::UNPROCESSABLE_ENTITY, reason),
            ScyllaError::CommFailure(reason) => (StatusCode::BAD_GATEWAY, reason),
            ScyllaError::EmptyResult => (
                StatusCode::NOT_FOUND,
                "Fetched an empty result that should not be!".to_string(),
            ),
            ScyllaError::InvalidSetting(reason) => (StatusCode::BAD_REQUEST, reason),
            ScyllaError::HttpError(code, reason) => (code, reason),
            ScyllaError::FileError(reason) => (StatusCode::INTERNAL_SERVER_ERROR, reason),
            ScyllaError::MqttError(reason) => (StatusCode::INTERNAL_SERVER_ERROR, reason),
            ScyllaError::RuleError(err_type) => match err_type {
                RuleManagerError::NoMatchingRule => {
                    (StatusCode::NOT_FOUND, "No rule found".to_owned())
                }
                RuleManagerError::NoSuchClient => {
                    (StatusCode::NOT_FOUND, "No client found".to_owned())
                }
                RuleManagerError::RuleFailure => {
                    (StatusCode::INTERNAL_SERVER_ERROR, "Rule failure".to_owned())
                }
                RuleManagerError::Failure => (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Rule management failure".to_owned(),
                ),
            },
        };

        warn!("Routing error: {}: {}", status, reason);

        (status, reason).into_response()
    }
}

impl Debug for ScyllaError {
    fn fmt(&self, _f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        Ok(())
    }
}
