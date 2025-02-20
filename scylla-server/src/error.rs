use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tracing::warn;

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
        };

        warn!("Routing error: {}: {}", status, reason);

        (status, reason).into_response()
    }
}
