#!/bin/sh

echo "Starting db"
cd ..
docker compose up -d odyssey-timescale

echo "Deploying prisma"
cd ./scylla-server
cargo prisma migrate deploy

echo "Running tests"
SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres cargo test -- --test-threads=1

cd ..
docker compose down