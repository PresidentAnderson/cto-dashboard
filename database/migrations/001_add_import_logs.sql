-- ============================================================================
-- MIGRATION: Add import_logs table for tracking GitHub sync operations
-- ============================================================================

-- Create import_logs table
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type VARCHAR(50) NOT NULL, -- 'github_sync', 'manual_import', etc.
    source VARCHAR(255) NOT NULL, -- 'github:PresidentAnderson', etc.
    status VARCHAR(20) NOT NULL, -- 'success', 'partial', 'failed'
    total_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    errors JSONB, -- Array of error objects
    duration_ms INTEGER, -- Duration in milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_import_logs_import_type ON import_logs(import_type);
CREATE INDEX idx_import_logs_source ON import_logs(source);
CREATE INDEX idx_import_logs_status ON import_logs(status);
CREATE INDEX idx_import_logs_created_at ON import_logs(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_import_logs_updated_at BEFORE UPDATE ON import_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE import_logs IS 'Tracks all import operations including GitHub sync history';

-- ============================================================================
-- View: Recent import summary
-- ============================================================================
CREATE OR REPLACE VIEW recent_imports_summary AS
SELECT
    import_type,
    source,
    status,
    COUNT(*) as import_count,
    SUM(total_items) as total_items_processed,
    SUM(successful_items) as total_successful,
    SUM(failed_items) as total_failed,
    AVG(duration_ms) as avg_duration_ms,
    MAX(created_at) as last_import_at
FROM import_logs
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY import_type, source, status
ORDER BY last_import_at DESC;

COMMENT ON VIEW recent_imports_summary IS 'Summary of imports in the last 30 days';
