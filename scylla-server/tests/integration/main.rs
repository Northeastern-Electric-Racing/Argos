//! Tests that need a live Postgres (`DATABASE_URL`). They share one database and wipe it per test,
//! so run them one at a time: `cargo test --test integration -- --test-threads=1`.

mod data_service;
mod data_type_service;
mod lap_controller;
mod run_service;
mod test_utils;
mod track_service;
