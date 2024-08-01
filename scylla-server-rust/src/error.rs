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
    PrismaError(QueryError),
    /// A generic not found for a prisma query
    NotFound,
    /// Not available in mock mode, which the system is in
    NotProd,
    /// An instruction was not encodable
    ImpossibleEncoding,
    /// Could not communicate to car
    CommFailure,
}

impl From<QueryError> for ScyllaError {
    fn from(error: QueryError) -> Self {
        warn!("Query error: {:?}", error);
        match error {
            e if e.is_prisma_error::<RecordNotFound>() => ScyllaError::NotFound,
            e => ScyllaError::PrismaError(e),
        }
    }
}

// This centralizes all different errors from our app in one place
impl IntoResponse for ScyllaError {
    fn into_response(self) -> Response {
        let status = match self {
            ScyllaError::PrismaError(error) if error.is_prisma_error::<UniqueKeyViolation>() => {
                StatusCode::CONFLICT
            }
            ScyllaError::PrismaError(_) => StatusCode::BAD_REQUEST,
            ScyllaError::NotFound => StatusCode::NOT_FOUND,
            ScyllaError::NotProd => StatusCode::SERVICE_UNAVAILABLE,
            ScyllaError::ImpossibleEncoding => StatusCode::UNPROCESSABLE_ENTITY,
            ScyllaError::CommFailure => StatusCode::BAD_GATEWAY,
        };

        status.into_response()
    }
}
