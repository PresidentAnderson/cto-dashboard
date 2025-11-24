-- CTO Dashboard Complete Setup
-- This file includes schema + admin user creation
-- Execute this single file to set up everything

-- ============================================================================
-- PART 1: DATABASE SCHEMA
-- ============================================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ENUMS
DO $$ BEGIN
    CREATE TYPE bug_severity AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bug_status AS ENUM ('pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'shipped', 'deferred', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- TABLE: projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'active',
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

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_complexity ON projects(complexity);
CREATE INDEX IF NOT EXISTS idx_projects_client_appeal ON projects(client_appeal);
CREATE INDEX IF NOT EXISTS idx_projects_roi_score ON projects(roi_score DESC);

-- TABLE: bugs
CREATE TABLE IF NOT EXISTS bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bug_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity bug_severity NOT NULL,
    status bug_status NOT NULL DEFAULT 'pending',
    assigned_to UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    days_open INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))) STORED,
    sla_hours INTEGER NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bugs(severity);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_assigned_to ON bugs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bugs_project_id ON bugs(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bugs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bugs_priority_score ON bugs(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_bugs_is_blocker ON bugs(is_blocker) WHERE is_blocker = TRUE;

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

CREATE INDEX IF NOT EXISTS idx_bug_history_bug_id ON bug_history(bug_id);
CREATE INDEX IF NOT EXISTS idx_bug_history_changed_at ON bug_history(changed_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_monthly_metrics_month ON monthly_metrics(month DESC);

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

CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_snapshot_date ON portfolio_metrics(snapshot_date DESC);

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

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bugs_updated_at ON bugs;
CREATE TRIGGER update_bugs_updated_at BEFORE UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-set SLA hours based on severity
CREATE OR REPLACE FUNCTION set_bug_sla()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sla_hours := CASE NEW.severity
        WHEN 'critical' THEN 4
        WHEN 'high' THEN 24
        WHEN 'medium' THEN 72
        WHEN 'low' THEN 720
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bug_sla_trigger ON bugs;
CREATE TRIGGER set_bug_sla_trigger BEFORE INSERT OR UPDATE OF severity ON bugs
    FOR EACH ROW EXECUTE FUNCTION set_bug_sla();

-- Track bug changes
CREATE OR REPLACE FUNCTION track_bug_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            INSERT INTO bug_history (bug_id, field_changed, old_value, new_value)
            VALUES (NEW.id, 'status', OLD.status::TEXT, NEW.status::TEXT);
        END IF;
        IF NEW.severity IS DISTINCT FROM OLD.severity THEN
            INSERT INTO bug_history (bug_id, field_changed, old_value, new_value)
            VALUES (NEW.id, 'severity', OLD.severity::TEXT, NEW.severity::TEXT);
        END IF;
        IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
            INSERT INTO bug_history (bug_id, field_changed, old_value, new_value)
            VALUES (NEW.id, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_bug_changes_trigger ON bugs;
CREATE TRIGGER track_bug_changes_trigger AFTER INSERT OR UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION track_bug_changes();

-- ============================================================================
-- PART 2: CREATE ADMIN USER
-- ============================================================================

-- Insert admin user
INSERT INTO users (email, name, role, created_at, updated_at)
VALUES (
    'jonathan.mitchell.anderson@gmail.com',
    'Jonathan Anderson',
    'cto',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW()
RETURNING id, email, name, role;

-- Store password hash in audit_log
-- Password: J0n8th8n
-- JWT_SECRET: 9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=
-- Hash: 2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f
INSERT INTO audit_log (action, entity_type, details, created_at)
VALUES (
    'password_created',
    'user',
    '{"email": "jonathan.mitchell.anderson@gmail.com", "password_hash": "2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f"}'::jsonb,
    NOW()
);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Email:    jonathan.mitchell.anderson@gmail.com';
    RAISE NOTICE '  Password: J0n8th8n';
    RAISE NOTICE '  Role:     cto';
    RAISE NOTICE '';
    RAISE NOTICE 'Dashboard: https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app';
    RAISE NOTICE '';
END $$;
