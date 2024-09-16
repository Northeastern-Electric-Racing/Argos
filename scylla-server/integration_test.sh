#!/bin/sh

echo "Starting db"
cd ..
docker compose run -Pd odyssey-timescale

echo "Deploying prisma"
cd ./scylla-server-rust
cargo prisma migrate deploy

echo "Running tests"
SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres cargo test -- --test-threads=1

echo "Please stop your db in docker"
