#!/bin/bash

# Initialize Database Schema
# Creates all tables, indexes, functions, and views

echo ""
echo "🗄️  Initializing CTO Dashboard Database"
echo "════════════════════════════════════════════════"
echo ""

# Database connection string
DATABASE_URL="postgresql://postgres:Success*2026\$\$\$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed"
    echo "   Install PostgreSQL client tools first"
    exit 1
fi

echo "📋 Executing schema.sql..."
echo ""

# Execute the schema file
PGPASSWORD='Success*2026$$$' psql "$DATABASE_URL" -f database/schema.sql 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════"
    echo "✅ Database initialized successfully!"
    echo ""
    echo "Tables created:"
    echo "  • users"
    echo "  • bugs"
    echo "  • projects"
    echo "  • bug_history"
    echo "  • monthly_metrics"
    echo "  • portfolio_metrics"
    echo "  • audit_log"
    echo ""
    echo "Ready to create admin account!"
    echo ""
else
    echo ""
    echo "❌ Database initialization failed"
    echo "   Check the errors above"
    exit 1
fi
