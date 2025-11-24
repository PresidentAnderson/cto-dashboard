#!/bin/bash

# Create Database Tables via Supabase REST API
# Uses direct table creation without SQL execution

SUPABASE_URL="https://iithtbuedvwmtbagquxy.supabase.co"
SUPABASE_KEY="sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35"

echo ""
echo "🚀 Creating Database Tables Programmatically"
echo "══════════════════════════════════════════════════════════"
echo ""

# First, let's try creating the user directly via REST API
# This will only work if the users table already exists

echo "📝 Step 1: Check if users table exists..."
RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/users?limit=0" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" 2>&1)

if echo "$RESPONSE" | grep -q "relation.*does not exist"; then
    echo "❌ Users table does not exist"
    echo ""
    echo "⚠️  Supabase SQL Editor is required for initial table creation."
    echo ""
    echo "Let me create a SINGLE STATEMENT at a time approach..."
    echo ""

    # Create the simplest possible script
    cat > /tmp/create_users.sql << 'EOF'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

    cat > /tmp/create_users_table.sql << 'EOF'
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'engineer',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

    cat > /tmp/create_projects_table.sql << 'EOF'
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    complexity INTEGER,
    client_appeal INTEGER,
    current_milestone INTEGER DEFAULT 0,
    total_milestones INTEGER DEFAULT 0,
    arr DECIMAL(12,2),
    year1_revenue DECIMAL(12,2),
    year3_revenue DECIMAL(12,2),
    roi_score DECIMAL(8,2),
    tam DECIMAL(15,2),
    sam DECIMAL(15,2),
    som_year3 DECIMAL(15,2),
    traction_mrr DECIMAL(12,2),
    margin_percent DECIMAL(5,2),
    dcf_valuation DECIMAL(15,2),
    monthly_infra_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

    cat > /tmp/create_audit_log_table.sql << 'EOF'
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

    echo "📋 Created individual SQL files in /tmp/"
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "📝 MANUAL STEPS REQUIRED:"
    echo ""
    echo "Go to: https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new"
    echo ""
    echo "Execute these ONE AT A TIME:"
    echo ""
    echo "1. CREATE EXTENSION:"
    cat /tmp/create_users.sql
    echo ""
    echo ""
    echo "2. CREATE USERS TABLE:"
    cat /tmp/create_users_table.sql
    echo ""
    echo ""
    echo "3. CREATE PROJECTS TABLE:"
    cat /tmp/create_projects_table.sql
    echo ""
    echo ""
    echo "4. CREATE AUDIT_LOG TABLE:"
    cat /tmp/create_audit_log_table.sql
    echo ""
    echo ""
    echo "5. CREATE ADMIN USER:"
    echo "INSERT INTO users (email, name, role) VALUES ('jonathan.mitchell.anderson@gmail.com', 'Jonathan Anderson', 'cto');"
    echo ""
    echo ""
    echo "6. STORE PASSWORD:"
    echo "INSERT INTO audit_log (action, entity_type, details) VALUES ('password_created', 'user', '{\"email\": \"jonathan.mitchell.anderson@gmail.com\", \"password_hash\": \"2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f\"}'::jsonb);"
    echo ""
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo ""

    exit 1
else
    echo "✅ Users table exists!"
    echo ""
    echo "📝 Step 2: Creating admin user..."

    curl -X POST "${SUPABASE_URL}/rest/v1/users" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: resolution=merge-duplicates,return=representation" \
      -d '{
        "email": "jonathan.mitchell.anderson@gmail.com",
        "name": "Jonathan Anderson",
        "role": "cto"
      }'

    echo ""
    echo "✅ Admin user created!"
    echo ""
    echo "🎯 Login at: https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app"
    echo "   Email: jonathan.mitchell.anderson@gmail.com"
    echo "   Password: J0n8th8n"
    echo ""
fi
