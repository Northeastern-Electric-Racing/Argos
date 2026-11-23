//! The shutdown loop status, worked out server-side so it is recorded with each Run, can carry
//! Rules, and raises Faults (ADR 0009). The angular-client computes the same thing locally.

pub mod model;
pub mod status;
pub mod tracker;
