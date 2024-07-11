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

### Test this app

Since this app uses the database for testing, you must follow these steps, or run `./integration_test.sh`:
```
docker volume rm argos_db-data
docker compose run -Pd odyssey-timescale
cargo prisma migrate deploy
SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/timescaledb cargo test -- --test-threads=1
```

### Deploy this app

Use the docker compose above to build & deploy.  Note the CI prebuilds arm64 and amd64 images upon request in the actions tab of this repository's github page.
```
docker compose build
docker compose up # use -d to fork to background
```
A database migration is triggered upon every bootup.
