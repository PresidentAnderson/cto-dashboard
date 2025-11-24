-- Migration: Add import_logs table for CSV import tracking
-- Run this migration to support CSV import logging

-- ============================================================================
-- TABLE: import_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'project', 'bug', etc.
    entity_id UUID, -- Reference to the imported entity
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    error_message TEXT, -- Error details if failed
    metadata JSONB, -- Additional data (source, row number, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_logs_entity_type ON import_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_entity_id ON import_logs(entity_id);

-- View for import statistics
CREATE OR REPLACE VIEW import_stats AS
SELECT
    entity_type,
    status,
    COUNT(*) as count,
    DATE(created_at) as import_date
FROM import_logs
GROUP BY entity_type, status, DATE(created_at)
ORDER BY import_date DESC, entity_type, status;

COMMENT ON TABLE import_logs IS 'Tracks all CSV import operations for auditing and debugging';
COMMENT ON COLUMN import_logs.metadata IS 'JSON containing source file info, row numbers, and other import context';
