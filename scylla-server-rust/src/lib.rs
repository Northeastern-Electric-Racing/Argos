pub mod controller;
pub mod services;

#[allow(clippy::all)]
#[allow(warnings)]
pub mod prisma;

pub type Database = axum::Extension<std::sync::Arc<prisma::PrismaClient>>;
