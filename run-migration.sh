#!/bin/bash
# GitHub Sync Migration Runner
# Applies the import_logs table migration

set -e

echo "=========================================="
echo "GitHub Sync Migration Runner"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-cto_dashboard}
DB_USER=${DB_USER:-postgres}

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""
echo "Running migration: 001_add_import_logs.sql"
echo ""

# Run migration
PGPASSWORD=$DB_PASSWORD psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "database/migrations/001_add_import_logs.sql"

echo ""
echo "=========================================="
echo "Migration completed successfully!"
echo "=========================================="
echo ""
echo "You can now use the GitHub sync features:"
echo "  - POST /api/sync-github"
echo "  - GET /api/sync-github/status"
echo "  - GET /api/sync-github/history"
echo ""
echo "Test with: node test-github-sync.js PresidentAnderson"
echo ""
