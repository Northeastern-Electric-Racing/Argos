# Backend Development Guidelines

## Stack
- Rust (edition and minimum version per `Cargo.toml`)
- Axum (HTTP), Diesel (PostgreSQL ORM), Tokio (async runtime)
- SocketIOxide (WebSocket), rumqttc (MQTT client)
- Protobuf for wire format (definitions in `src/proto/`)

## Architecture
- **Controller → Service → DB** layer pattern
- Controllers are thin: validate input, call service, return response
- Services contain business logic
- DB operations use Diesel ORM with batch upserts where applicable
- Core modules: `mqtt_processor`, `socket_handler`, `db_handler`, `rule_structs`

## Conventions
- Use `tracing` for logging/observability, not `println!`
- Use `clap` for CLI argument parsing
- Error handling: propagate with `?` operator, use typed errors over string errors
- Prefer `tokio::spawn` for concurrent tasks, not threads
- Use Diesel migrations for schema changes (`diesel-migrations` crate)

## Testing
- Run tests: `cargo test`
- Run build check: `cargo build`
- Tests live alongside source in the same file (`#[cfg(test)]` modules)
