//! Tests that need a live Postgres (`DATABASE_URL`). They share the car and argos databases and wipe them per test,
//! so run them one at a time: `cargo test --test integration -- --test-threads=1`.

mod argos_database;
mod data_service;
mod data_type_service;
mod run_service;
mod test_utils;
mod track_service;
