# Scylla Server (Rust)


### Generate prisma

```
cargo prisma generate
```

### Run the app

```
# in argos proper
docker compose run -P odyssey-timescale
```

```
# in this directory
SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/timescaledb cargo run
```