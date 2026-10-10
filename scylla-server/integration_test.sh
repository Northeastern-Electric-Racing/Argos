#!/bin/sh

PROJECT=odyssey_integration_test

# Navigate to the compose directory
echo "Navigating to compose directory..."
cd ../compose || { echo "Compose directory not found"; exit 1; }

# Tear down any leftover integration-test stack from a previous run
echo "Stopping any existing integration-test stack..."
docker compose -p "$PROJECT" down 2>/dev/null || true

# Start a new odyssey-db container under our project
echo "Starting odyssey-db..."
docker compose -p "$PROJECT" up -d odyssey-db || { echo "Failed to start odyssey-db"; exit 1; }

# Navigate to the scylla-server directory
cd ../scylla-server || { echo "scylla-server directory not found"; exit 1; }

# Unit tests need no database and run in parallel
echo "Running unit tests..."
cargo test || { echo "Unit tests failed"; exit 1; }

# Integration tests wait for the database, migrate it, and share it, so run them one at a time
echo "Running integration tests..."
DATABASE_URL=postgresql://postgres:password@127.0.0.1:${ODYSSEY_DB_PORT:-5432}/postgres cargo test --test integration -- --test-threads=1 || { echo "Integration tests failed"; exit 1; }

# Navigate back to the compose directory
cd ../compose || { echo "Compose directory not found"; exit 1; }

# Stop and clean up containers
echo "Stopping and cleaning up containers..."
docker compose -p "$PROJECT" down || { echo "Failed to clean up containers"; exit 1; }

echo "Script completed successfully!"
