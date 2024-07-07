pub mod controller;
pub mod error;
pub mod services;

#[allow(clippy::all)]
#[allow(warnings)]
pub mod prisma;

pub mod serverdata;

/// The type descriptor of the database passed to the middlelayer through axum state
pub type Database = std::sync::Arc<prisma::PrismaClient>;
