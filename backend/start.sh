#!/bin/bash
set -e

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Run migrations
echo "Running database migrations..."
cd /app
alembic upgrade head

# Start the application  
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 5010 --reload
