-- CTO Dashboard Database Schema
-- PostgreSQL 14+
-- Complete schema for bug tracking, project portfolio, and analytics

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE bug_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE bug_status AS ENUM ('pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred');
CREATE TYPE project_status AS ENUM ('active', 'shipped', 'deferred', 'cancelled');

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'engineer',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- TABLE: bugs
-- ============================================================================
CREATE TABLE bugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bug_number VARCHAR(20) UNIQUE NOT NULL, -- BUG-847 format
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity bug_severity NOT NULL,
    status bug_status NOT NULL DEFAULT 'pending',
    assigned_to UUID REFERENCES users(id),
    project_id UUID, -- Will reference projects table
    days_open INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))) STORED,
    sla_hours INTEGER NOT NULL, -- Based on severity
    business_impact TEXT, -- "$2k/day revenue loss"
    revenue_impact_daily DECIMAL(12,2), -- Numeric value for calculations
    is_blocker BOOLEAN DEFAULT FALSE,
    priority_score INTEGER DEFAULT 50, -- 0-100 calculated score
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_bugs_severity ON bugs(severity);
CREATE INDEX idx_bugs_status ON bugs(status);
CREATE INDEX idx_bugs_assigned_to ON bugs(assigned_to);
CREATE INDEX idx_bugs_project_id ON bugs(project_id);
CREATE INDEX idx_bugs_created_at ON bugs(created_at DESC);
CREATE INDEX idx_bugs_priority_score ON bugs(priority_score DESC);
CREATE INDEX idx_bugs_is_blocker ON bugs(is_blocker) WHERE is_blocker = TRUE;

-- Full-text search on title and description
CREATE INDEX idx_bugs_search ON bugs USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- TABLE: projects
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'active',

    -- Complexity & Appeal (for prioritization matrix)
    complexity INTEGER CHECK (complexity >= 1 AND complexity <= 5), -- 1=easy, 5=very hard
    client_appeal INTEGER CHECK (client_appeal >= 0 AND client_appeal <= 10), -- 0=no appeal, 10=high appeal

    -- Milestones
    current_milestone INTEGER DEFAULT 0,
    total_milestones INTEGER DEFAULT 0,

    -- Financial metrics
    arr DECIMAL(12,2), -- Annual Recurring Revenue
    year1_revenue DECIMAL(12,2),
    year3_revenue DECIMAL(12,2),
    roi_score DECIMAL(8,2), -- Return on Investment score

    -- Market sizing (for valuation view)
    tam DECIMAL(15,2), -- Total Addressable Market
    sam DECIMAL(15,2), -- Serviceable Addressable Market
    som_year3 DECIMAL(15,2), -- Serviceable Obtainable Market (3 years)
    traction_mrr DECIMAL(12,2), -- Monthly Recurring Revenue traction
    margin_percent DECIMAL(5,2), -- Profit margin %
    dcf_valuation DECIMAL(15,2), -- Discounted Cash Flow valuation

    -- Dependencies
    monthly_infra_cost DECIMAL(10,2), -- Infrastructure costs

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_complexity ON projects(complexity);
CREATE INDEX idx_projects_client_appeal ON projects(client_appeal);
CREATE INDEX idx_projects_roi_score ON projects(roi_score DESC);

-- Add foreign key now that projects table exists
ALTER TABLE bugs ADD CONSTRAINT fk_bugs_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- ============================================================================
-- TABLE: bug_history (for analytics & trends)
-- ============================================================================
CREATE TABLE bug_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bug_id UUID REFERENCES bugs(id) ON DELETE CASCADE,
    field_changed VARCHAR(50) NOT NULL, -- 'status', 'severity', 'assigned_to', etc.
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bug_history_bug_id ON bug_history(bug_id);
CREATE INDEX idx_bug_history_changed_at ON bug_history(changed_at DESC);

-- ============================================================================
-- TABLE: monthly_metrics (for analytics trends)
-- ============================================================================
CREATE TABLE monthly_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month DATE NOT NULL UNIQUE, -- First day of month
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

CREATE INDEX idx_monthly_metrics_month ON monthly_metrics(month DESC);

-- ============================================================================
-- TABLE: portfolio_metrics (snapshot for dashboard)
-- ============================================================================
CREATE TABLE portfolio_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_projects INTEGER NOT NULL,
    shipped_projects INTEGER NOT NULL,
    year3_revenue_total DECIMAL(15,2) NOT NULL,
    portfolio_dcf_total DECIMAL(15,2) NOT NULL,
    monthly_deps_cost DECIMAL(12,2) NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_metrics_snapshot_date ON portfolio_metrics(snapshot_date DESC);

-- ============================================================================
-- TABLE: audit_log (for tracking all system changes)
-- ============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'bug_created', 'bug_updated', 'project_created', etc.
    entity_type VARCHAR(50), -- 'bug', 'project', 'user'
    entity_id UUID,
    details JSONB, -- Full details of the change
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bugs_updated_at BEFORE UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
        WHEN 'low' THEN 720  -- 30 days
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bug_sla_trigger BEFORE INSERT OR UPDATE OF severity ON bugs
    FOR EACH ROW EXECUTE FUNCTION set_bug_sla();

-- Track bug status changes in bug_history
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

CREATE TRIGGER track_bug_changes_trigger AFTER INSERT OR UPDATE ON bugs
    FOR EACH ROW EXECUTE FUNCTION track_bug_changes();

-- ============================================================================
-- VIEWS (for easier querying)
-- ============================================================================

-- Bug summary with user info
CREATE VIEW bugs_with_users AS
SELECT
    b.id,
    b.bug_number,
    b.title,
    b.description,
    b.severity,
    b.status,
    b.days_open,
    b.sla_hours,
    b.business_impact,
    b.revenue_impact_daily,
    b.is_blocker,
    b.priority_score,
    b.estimated_hours,
    b.actual_hours,
    b.created_at,
    b.updated_at,
    b.resolved_at,
    u.name as assigned_to_name,
    u.email as assigned_to_email,
    u.avatar_url as assigned_to_avatar,
    p.name as project_name,
    -- SLA breach calculation
    CASE
        WHEN b.status NOT IN ('shipped', 'closed')
            AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.created_at)) / 3600 > b.sla_hours
        THEN TRUE
        ELSE FALSE
    END as sla_breached,
    -- Hours overdue
    CASE
        WHEN b.status NOT IN ('shipped', 'closed')
        THEN GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - b.created_at)) / 3600 - b.sla_hours)
        ELSE 0
    END as hours_overdue
FROM bugs b
LEFT JOIN users u ON b.assigned_to = u.id
LEFT JOIN projects p ON b.project_id = p.id;

-- Dashboard KPI summary
CREATE VIEW dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM bugs WHERE severity = 'critical' AND status NOT IN ('shipped', 'closed')) as critical_bugs,
    (SELECT COUNT(*) FROM bugs WHERE severity = 'high' AND status NOT IN ('shipped', 'closed')) as high_bugs,
    (SELECT COUNT(*) FROM bugs WHERE severity = 'medium' AND status NOT IN ('shipped', 'closed')) as medium_bugs,
    (SELECT COUNT(*) FROM bugs WHERE severity = 'low' AND status NOT IN ('shipped', 'closed')) as low_bugs,
    (SELECT COUNT(*) FROM bugs WHERE is_blocker = TRUE AND status NOT IN ('shipped', 'closed')) as blocker_bugs,
    (SELECT COUNT(*) FROM bugs_with_users WHERE sla_breached = TRUE) as sla_breached_count,
    (SELECT SUM(dcf_valuation) FROM projects WHERE status != 'cancelled') as portfolio_value,
    (SELECT SUM(year3_revenue) FROM projects WHERE status != 'cancelled') as year3_revenue_total,
    (SELECT SUM(monthly_infra_cost) FROM projects WHERE status = 'active') as monthly_infra_cost;

-- Project portfolio view with calculations
CREATE VIEW project_portfolio_view AS
SELECT
    p.*,
    (SELECT COUNT(*) FROM bugs WHERE project_id = p.id AND is_blocker = TRUE AND status NOT IN ('shipped', 'closed')) as blocker_count,
    (SELECT COUNT(*) FROM bugs WHERE project_id = p.id AND severity = 'critical' AND status NOT IN ('shipped', 'closed')) as critical_bug_count,
    (SELECT COUNT(*) FROM bugs WHERE project_id = p.id AND severity = 'high' AND status NOT IN ('shipped', 'closed')) as high_bug_count,
    -- Calculate days to milestone (assuming 2 weeks per milestone)
    (total_milestones - current_milestone) * 14 as estimated_days_to_completion,
    -- Risk assessment
    CASE
        WHEN (SELECT COUNT(*) FROM bugs WHERE project_id = p.id AND is_blocker = TRUE AND status NOT IN ('shipped', 'closed')) > 0
        THEN 'HIGH'
        WHEN (SELECT COUNT(*) FROM bugs WHERE project_id = p.id AND severity IN ('critical', 'high') AND status NOT IN ('shipped', 'closed')) > 3
        THEN 'MEDIUM'
        ELSE 'LOW'
    END as risk_level
FROM projects p;

-- ============================================================================
-- FUNCTIONS (for business logic)
-- ============================================================================

-- Calculate priority score for a bug
CREATE OR REPLACE FUNCTION calculate_bug_priority_score(
    p_severity bug_severity,
    p_revenue_impact_daily DECIMAL,
    p_is_blocker BOOLEAN,
    p_days_open INTEGER
) RETURNS INTEGER AS $$
DECLARE
    severity_score INTEGER;
    impact_score INTEGER;
    blocker_bonus INTEGER := 0;
    aging_penalty INTEGER;
    final_score INTEGER;
BEGIN
    -- Severity scoring
    severity_score := CASE p_severity
        WHEN 'critical' THEN 40
        WHEN 'high' THEN 30
        WHEN 'medium' THEN 15
        WHEN 'low' THEN 5
    END;

    -- Impact scoring (normalize to 0-30 range)
    impact_score := LEAST(30, (p_revenue_impact_daily / 1000)::INTEGER);

    -- Blocker bonus
    IF p_is_blocker THEN
        blocker_bonus := 20;
    END IF;

    -- Aging penalty (caps at 10)
    aging_penalty := LEAST(10, p_days_open);

    -- Final score (0-100)
    final_score := LEAST(100, severity_score + impact_score + blocker_bonus + aging_penalty);

    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Get bug cost analysis for a time period
CREATE OR REPLACE FUNCTION get_bug_cost_analysis(
    start_date TIMESTAMP,
    end_date TIMESTAMP
) RETURNS TABLE (
    total_bugs BIGINT,
    total_eng_hours DECIMAL,
    total_cost DECIMAL,
    total_revenue_impact DECIMAL,
    avg_resolution_days DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(actual_hours), 0),
        COALESCE(SUM(actual_hours * 150), 0), -- $150/hour rate
        COALESCE(SUM(revenue_impact_daily * days_open), 0),
        COALESCE(AVG(EXTRACT(DAY FROM (resolved_at - created_at))), 0)
    FROM bugs
    WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================
-- This will be populated by the seed.js script

COMMENT ON DATABASE postgres IS 'CTO Dashboard - Bug Tracking & Portfolio Management System';

-- ============================================================================
-- ADMIN USER CREATION
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
SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();

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
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ Setup Complete!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Email:    jonathan.mitchell.anderson@gmail.com';
    RAISE NOTICE '  Password: J0n8th8n';
    RAISE NOTICE '  Role:     cto';
    RAISE NOTICE '';
    RAISE NOTICE 'Dashboard: https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
