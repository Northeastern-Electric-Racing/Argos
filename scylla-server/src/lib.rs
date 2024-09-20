pub mod controllers;
pub mod error;
pub mod processors;
pub mod services;
pub mod transformers;

#[allow(clippy::all)]
#[allow(warnings)]
pub mod prisma;

pub mod command_data;
pub mod serverdata;

/// The type descriptor of the database passed to the middlelayer through axum state
pub type Database = std::sync::Arc<prisma::PrismaClient>;

#[derive(clap::ValueEnum, Debug, PartialEq, Copy, Clone, Default)]
#[clap(rename_all = "kebab_case")]
pub enum RateLimitMode {
    /// static rate limiting based on a set value
    Static,
    /// no rate limiting
    #[default]
    None,
}
