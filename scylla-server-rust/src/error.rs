use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use prisma_client_rust::{
    prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
    QueryError,
};

pub enum ScyllaError {
    PrismaError(QueryError),
    NotFound,
}

impl From<QueryError> for ScyllaError {
    fn from(error: QueryError) -> Self {
        println!("Query error: {:?}", error);
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
        };

        status.into_response()
    }
}
