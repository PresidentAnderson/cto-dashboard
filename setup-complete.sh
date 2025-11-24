#!/bin/bash

# Complete Database Setup - Shell Script Version
# Uses curl and Supabase REST API to create everything

SUPABASE_URL="https://iithtbuedvwmtbagquxy.supabase.co"
SUPABASE_KEY="sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35"
JWT_SECRET="9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk="

EMAIL="jonathan.mitchell.anderson@gmail.com"
PASSWORD="J0n8th8n"
NAME="Jonathan Anderson"
ROLE="cto"

echo ""
echo "🚀 CTO Dashboard - Complete Programmatic Setup"
echo "══════════════════════════════════════════════════════════"
echo ""

# Step 1: Try to use psql if available
if command -v psql &> /dev/null; then
    echo "📋 Found psql - using direct database connection"
    echo ""

    # Create a temporary connection test
    if PGPASSWORD='Success*2026$$$' psql -h db.iithtbuedvwmtbagquxy.supabase.co -U postgres -d postgres -p 5432 -c "SELECT 1;" &> /dev/null; then
        echo "✅ Database connection successful"
        echo ""
        echo "🗄️  Creating database schema..."

        # Execute the schema
        PGPASSWORD='Success*2026$$$' psql -h db.iithtbuedvwmtbagquxy.supabase.co -U postgres -d postgres -p 5432 \
            -f database/schema.sql \
            -q \
            2>&1 | grep -v "NOTICE" | grep -v "^$"

        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo "✅ Database schema created successfully"
        else
            echo "⚠️  Some schema statements may have failed (this is OK if tables already exist)"
        fi

        echo ""
        echo "👤 Creating admin user..."

        # Create admin user
        PGPASSWORD='Success*2026$$$' psql -h db.iithtbuedvwmtbagquxy.supabase.co -U postgres -d postgres -p 5432 <<EOF
INSERT INTO users (email, name, role, created_at, updated_at)
VALUES ('${EMAIL}', '${NAME}', '${ROLE}', NOW(), NOW())
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW()
RETURNING id, email, name, role;
EOF

        # Hash password and store in audit_log
        PASSWORD_HASH=$(echo -n "${PASSWORD}${JWT_SECRET}" | openssl dgst -sha256 -hex | cut -d' ' -f2)

        PGPASSWORD='Success*2026$$$' psql -h db.iithtbuedvwmtbagquxy.supabase.co -U postgres -d postgres -p 5432 <<EOF
INSERT INTO audit_log (action, entity_type, details, created_at)
VALUES (
    'password_created',
    'user',
    '{"email": "${EMAIL}", "password_hash": "${PASSWORD_HASH}"}',
    NOW()
);
EOF

        echo ""
        echo "✅ Admin user created successfully"
        echo ""

        # Verify setup
        echo "📊 Database Status:"
        PGPASSWORD='Success*2026$$$' psql -h db.iithtbuedvwmtbagquxy.supabase.co -U postgres -d postgres -p 5432 <<EOF
SELECT
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM projects) as projects,
    (SELECT COUNT(*) FROM bugs) as bugs,
    (SELECT COUNT(*) FROM audit_log) as audit_entries;
EOF

        echo ""
        echo "══════════════════════════════════════════════════════════"
        echo ""
        echo "✨ Setup Complete! ✨"
        echo ""
        echo "🎯 Login Credentials:"
        echo "   Email:    ${EMAIL}"
        echo "   Password: ${PASSWORD}"
        echo "   Role:     ${ROLE}"
        echo ""
        echo "🌐 Dashboard URL:"
        echo "   https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app"
        echo ""
        echo "📝 Next Steps:"
        echo "   1. Login to the dashboard"
        echo "   2. Import projects: ./import-via-supabase.sh"
        echo "   3. Sync GitHub repositories"
        echo ""

        exit 0
    else
        echo "⚠️  psql found but connection failed"
        echo "   Falling back to manual instructions..."
    fi
else
    echo "⚠️  psql not found on system"
fi

echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
echo "❌ Automatic setup requires psql (PostgreSQL client)"
echo ""
echo "📋 Manual Setup Instructions:"
echo ""
echo "Option 1: Install PostgreSQL Client"
echo "────────────────────────────────────"
echo "macOS:   brew install postgresql@14"
echo "Ubuntu:  sudo apt-get install postgresql-client"
echo "Windows: Download from postgresql.org"
echo ""
echo "Then run this script again."
echo ""
echo "Option 2: Use Supabase SQL Editor (Recommended)"
echo "────────────────────────────────────────────────"
echo "1. Go to: https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql"
echo ""
echo "2. Click 'New Query'"
echo ""
echo "3. Copy and paste the contents of: database/schema.sql"
echo ""
echo "4. Click 'Run' (or press Cmd+Enter)"
echo ""
echo "5. Then run: ./create-admin-via-api.sh"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
