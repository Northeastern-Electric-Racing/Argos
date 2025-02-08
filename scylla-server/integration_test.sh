#!/bin/sh

# Navigate to the compose directory
echo "Navigating to compose directory..."
cd ../compose || { echo "Compose directory not found"; exit 1; }

# Remove any existing odyssey-timescale container
echo "Stopping and removing any existing odyssey-timescale container..."
docker rm -f odyssey-db 2>/dev/null || echo "No existing container to remove."

# Start a new odyssey-timescale container
echo "Starting a new odyssey-timescale container..."
docker compose up -d odyssey-db || { echo "Failed to start odyssey-timescale"; exit 1; }

# Wait for the database to initialize
echo "Waiting for the database to initialize..."
sleep 5

# Navigate to the scylla-server directory
cd ../scylla-server || { echo "scylla-server directory not found"; exit 1; }

# Run database migrations
echo "Running database migrations..."
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres diesel migration run || { echo "Migration failed"; exit 1; }

# Run tests
echo "Running tests..."
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres cargo test -- --test-threads=1 || { echo "Tests failed"; exit 1; }

# Navigate back to the compose directory
cd ../compose || { echo "Compose directory not found"; exit 1; }

# Stop and clean up containers
echo "Stopping and cleaning up containers..."
docker compose down || { echo "Failed to clean up containers"; exit 1; }

echo "Script completed successfully!"
