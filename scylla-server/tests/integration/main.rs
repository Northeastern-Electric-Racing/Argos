//! Tests that need a live Postgres (`DATABASE_URL`). They share one database and wipe it per test,
//! so run them one at a time: `cargo test --test integration -- --test-threads=1`.

// The tests set up and wipe the database themselves, so they may run Diesel queries outside src/services/
// (clippy.toml disallowed-methods).
#![allow(clippy::disallowed_methods)]

mod data_service;
mod data_type_service;
mod run_service;
mod test_utils;
