pub mod controller;
pub mod error;
pub mod services;

#[allow(clippy::all)]
#[allow(warnings)]
pub mod prisma;

pub mod serverdata;

pub type Database = std::sync::Arc<prisma::PrismaClient>;
