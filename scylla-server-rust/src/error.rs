use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use prisma_client_rust::{
    prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
    QueryError,
};
use tracing::warn;

pub enum ScyllaError {
    /// Any prisma query which errors out
    PrismaError(QueryError),
    /// An instruction was not encodable
    InvalidEncoding(String),
    /// Could not communicate to car
    CommFailure(String),
    /// A query turned up empty that should not have
    EmptyResult,
}

impl From<QueryError> for ScyllaError {
    fn from(error: QueryError) -> Self {
        ScyllaError::PrismaError(error)
    }
}

// This centralizes all different errors from our app in one place
impl IntoResponse for ScyllaError {
    fn into_response(self) -> Response {
        let (status, reason) = match self {
            ScyllaError::PrismaError(error) if error.is_prisma_error::<UniqueKeyViolation>() => (
                StatusCode::CONFLICT,
                format!("Unique Key Violation: {}", error),
            ),
            ScyllaError::PrismaError(error) if error.is_prisma_error::<RecordNotFound>() => (
                StatusCode::NOT_FOUND,
                format!("Record Not Found: {}", error),
            ),
            ScyllaError::PrismaError(error) => (
                StatusCode::BAD_REQUEST,
                format!("Misc query error: {}", error),
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
