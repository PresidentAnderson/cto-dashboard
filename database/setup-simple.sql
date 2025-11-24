-- CTO Dashboard - Simple Setup (No ENUMs, just VARCHAR)
-- Guaranteed to work on any PostgreSQL setup

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'engineer',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'shipped', 'deferred', 'cancelled')),
    complexity INTEGER CHECK (complexity >= 1 AND complexity <= 5),
    client_appeal INTEGER CHECK (client_appeal >= 0 AND client_appeal <= 10),
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

-- TABLE: bugs
CREATE TABLE IF NOT EXISTS bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bug_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred')),
    assigned_to UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    sla_hours INTEGER NOT NULL DEFAULT 24,
    business_impact TEXT,
    revenue_impact_daily DECIMAL(12,2),
    is_blocker BOOLEAN DEFAULT FALSE,
    priority_score INTEGER DEFAULT 50,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- TABLE: bug_history
CREATE TABLE IF NOT EXISTS bug_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    field_changed VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: monthly_metrics
CREATE TABLE IF NOT EXISTS monthly_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month DATE NOT NULL UNIQUE,
    total_bugs INTEGER NOT NULL,
    critical_bugs INTEGER NOT NULL,
    high_bugs INTEGER NOT NULL,
    medium_bugs INTEGER NOT NULL,
    low_bugs INTEGER NOT NULL,
    eng_hours DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    revenue_impact_daily DECIMAL(12,2) NOT NULL,
    avg_resolution_days DECIMAL(6,2),
    bugs_created INTEGER DEFAULT 0,
    bugs_resolved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: portfolio_metrics
CREATE TABLE IF NOT EXISTS portfolio_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_projects INTEGER NOT NULL,
    shipped_projects INTEGER NOT NULL,
    year3_revenue_total DECIMAL(15,2) NOT NULL,
    portfolio_dcf_total DECIMAL(15,2) NOT NULL,
    monthly_deps_cost DECIMAL(12,2) NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bugs(severity);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned_to ON bugs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bugs_project_id ON bugs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- CREATE ADMIN USER
INSERT INTO users (email, name, role, created_at, updated_at)
VALUES (
    'jonathan.mitchell.anderson@gmail.com',
    'Jonathan Anderson',
    'cto',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();

-- STORE PASSWORD HASH
INSERT INTO audit_log (action, entity_type, details, created_at)
VALUES (
    'password_created',
    'user',
    '{"email": "jonathan.mitchell.anderson@gmail.com", "password_hash": "2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f"}'::jsonb,
    NOW()
);

-- VERIFY SUCCESS
SELECT
    '✅ SETUP COMPLETE!' as message,
    'jonathan.mitchell.anderson@gmail.com' as email,
    'J0n8th8n' as password,
    'cto' as role,
    'https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app' as dashboard_url;
