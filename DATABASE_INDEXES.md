# Database Index Strategy - CTO Dashboard v2.0

## Overview
This document details the comprehensive indexing strategy for the CTO Dashboard database, optimized for analytics queries, dashboard performance, and efficient data retrieval.

## Index Philosophy

### Goals
1. **Dashboard Performance**: Fast queries for real-time metrics
2. **Analytics Optimization**: Efficient time-series and aggregation queries
3. **Scalability**: Support for 180+ projects and 10,000+ bugs
4. **Balance**: Optimize reads without sacrificing write performance

### Approach
- **Selective Indexing**: Index only frequently queried columns
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Conditional indexes for specific use cases
- **Foreign Keys**: Automatic indexes on all relationships

## Index Catalog

### Projects Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX projects_pkey ON projects(id)

-- GitHub URL uniqueness
CREATE UNIQUE INDEX projects_github_url_key ON projects(github_url)
```

#### Performance Indexes
```sql
-- Dashboard filtering
CREATE INDEX idx_projects_status ON projects(status)

-- Technology filtering
CREATE INDEX idx_projects_language ON projects(language)

-- Prioritization matrix
CREATE INDEX idx_projects_complexity ON projects(complexity)
CREATE INDEX idx_projects_client_appeal ON projects(client_appeal)

-- Financial analysis (descending for top performers)
CREATE INDEX idx_projects_roi_score_desc ON projects(roi_score DESC)
```

**Query Optimization**:
- `status` index: Fast filtering for active/shipped projects
- `roi_score` descending index: Quick retrieval of top ROI projects
- `complexity` + `client_appeal`: Supports prioritization matrix queries

### Bugs Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX bugs_pkey ON bugs(id)

-- Bug number uniqueness
CREATE UNIQUE INDEX bugs_bug_number_key ON bugs(bug_number)
```

#### Performance Indexes
```sql
-- Critical filtering (most common queries)
CREATE INDEX idx_bugs_severity ON bugs(severity)
CREATE INDEX idx_bugs_status ON bugs(status)

-- Assignment and ownership
CREATE INDEX idx_bugs_assigned_to_id ON bugs(assigned_to)

-- Project relationship
CREATE INDEX idx_bugs_project_id ON bugs(project_id)

-- Chronological sorting
CREATE INDEX idx_bugs_created_at_desc ON bugs(created_at DESC)

-- Priority-based queries
CREATE INDEX idx_bugs_priority_score_desc ON bugs(priority_score DESC)

-- Partial index for critical blockers
CREATE INDEX idx_bugs_blockers ON bugs(is_blocker)
WHERE is_blocker = true
```

**Query Optimization**:
- `severity` + `status`: Fast filtering for dashboard bug lists
- `priority_score` descending: Quick retrieval of highest priority bugs
- Partial `is_blocker` index: Efficient blocker queries without indexing all rows
- `created_at` descending: Fast "recent bugs" queries

#### Composite Index Opportunities

Consider adding if queries are slow:
```sql
-- Combined severity + status filtering
CREATE INDEX idx_bugs_severity_status ON bugs(severity, status)

-- Project bugs with status
CREATE INDEX idx_bugs_project_status ON bugs(project_id, status)

-- Assigned bugs by priority
CREATE INDEX idx_bugs_assigned_priority ON bugs(assigned_to, priority_score DESC)
```

### Project Metrics Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX project_metrics_pkey ON project_metrics(id)

-- Unique constraint on project + date
CREATE UNIQUE INDEX project_metrics_project_id_date_key
ON project_metrics(project_id, date)
```

#### Performance Indexes
```sql
-- Time-series queries
CREATE INDEX idx_project_metrics_date_desc ON project_metrics(date DESC)

-- Project-specific metrics
CREATE INDEX idx_project_metrics_project_id ON project_metrics(project_id)

-- Health monitoring
CREATE INDEX idx_project_metrics_health_score_desc
ON project_metrics(health_score DESC)
```

**Query Optimization**:
- `date` descending: Fast retrieval of recent metrics
- `project_id`: Quick access to project history
- Unique `project_id + date`: Prevents duplicate daily metrics

### Monthly Metrics Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX monthly_metrics_pkey ON monthly_metrics(id)

-- Unique month constraint
CREATE UNIQUE INDEX monthly_metrics_month_key ON monthly_metrics(month)
```

#### Performance Indexes
```sql
-- Time-series trend analysis
CREATE INDEX idx_monthly_metrics_month_desc ON monthly_metrics(month DESC)
```

**Query Optimization**:
- `month` descending: Fast retrieval for trend charts
- Unique `month`: Ensures one snapshot per month

### Portfolio Metrics Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX portfolio_metrics_pkey ON portfolio_metrics(id)
```

#### Performance Indexes
```sql
-- Historical snapshots
CREATE INDEX idx_portfolio_metrics_snapshot_date_desc
ON portfolio_metrics(snapshot_date DESC)
```

**Query Optimization**:
- `snapshot_date` descending: Fast retrieval of latest portfolio snapshot

### Import Logs Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX import_logs_pkey ON import_logs(id)
```

#### Performance Indexes
```sql
-- Source filtering
CREATE INDEX idx_import_logs_source ON import_logs(source)

-- Recent imports
CREATE INDEX idx_import_logs_timestamp_desc ON import_logs(timestamp DESC)
```

**Query Optimization**:
- `source`: Fast filtering by import type (CSV, GitHub, manual)
- `timestamp` descending: Quick access to recent sync operations

### Bug History Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX bug_history_pkey ON bug_history(id)
```

#### Performance Indexes
```sql
-- Bug change tracking
CREATE INDEX idx_bug_history_bug_id ON bug_history(bug_id)

-- Recent changes
CREATE INDEX idx_bug_history_changed_at_desc ON bug_history(changed_at DESC)
```

**Query Optimization**:
- `bug_id`: Fast retrieval of bug change history
- `changed_at` descending: Recent activity queries

### Audit Log Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX audit_log_pkey ON audit_log(id)
```

#### Performance Indexes
```sql
-- User activity tracking
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id)

-- Recent activity
CREATE INDEX idx_audit_log_created_at_desc ON audit_log(created_at DESC)

-- Entity-specific audits
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id)
```

**Query Optimization**:
- `user_id`: Fast user activity queries
- `entity_type + entity_id`: Quick entity change history
- `created_at` descending: Recent activity feed

### Users Table

#### Primary Indexes
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX users_pkey ON users(id)

-- Email uniqueness
CREATE UNIQUE INDEX users_email_key ON users(email)
```

#### Performance Indexes
```sql
-- Authentication lookups
CREATE INDEX idx_users_email ON users(email)
```

**Query Optimization**:
- `email` index: Fast authentication queries (duplicate but useful for covering index)

## Index Performance Metrics

### Expected Query Times

On a database with 200 projects and 10,000 bugs:

| Query Type | Without Index | With Index | Improvement |
|------------|---------------|------------|-------------|
| Filter bugs by severity | ~200ms | ~5ms | 40x faster |
| Get top 10 ROI projects | ~150ms | ~3ms | 50x faster |
| Recent bugs (last 100) | ~180ms | ~4ms | 45x faster |
| Project bugs with status | ~120ms | ~6ms | 20x faster |
| Critical blockers only | ~100ms | ~2ms | 50x faster |

### Index Size Estimates

| Table | Rows | Index Count | Total Index Size |
|-------|------|-------------|------------------|
| Projects | 200 | 7 | ~2 MB |
| Bugs | 10,000 | 8 | ~15 MB |
| Project Metrics | 50,000 | 4 | ~8 MB |
| Monthly Metrics | 36 | 2 | ~0.1 MB |
| Users | 50 | 2 | ~0.2 MB |

**Total Index Overhead**: ~25 MB (acceptable for performance gains)

## Monitoring Index Performance

### Check Index Usage

```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

### Check Query Performance

```sql
-- Enable query timing
\timing on

-- Analyze query execution plan
EXPLAIN ANALYZE
SELECT * FROM bugs
WHERE severity = 'critical'
  AND status = 'in_progress'
ORDER BY priority_score DESC
LIMIT 10;
```

### Index Size Analysis

```sql
-- Check index sizes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Maintenance

### Rebuilding Indexes

```sql
-- Reindex a specific table (if performance degrades)
REINDEX TABLE bugs;

-- Reindex entire database (during maintenance window)
REINDEX DATABASE postgres;
```

### Vacuum and Analyze

```sql
-- Update table statistics for query planner
ANALYZE bugs;

-- Full vacuum (reclaim space)
VACUUM FULL bugs;

-- Analyze all tables
ANALYZE;
```

## Best Practices

### DO:
- Use indexes on foreign keys (automatic with Prisma)
- Index columns used in WHERE clauses frequently
- Index columns used in ORDER BY clauses
- Use partial indexes for specific conditions (like `is_blocker`)
- Monitor slow query logs
- Analyze query execution plans

### DON'T:
- Index columns with low cardinality (like boolean fields, except in partial indexes)
- Over-index (every index adds write overhead)
- Index very large text fields (use full-text search instead)
- Forget to VACUUM and ANALYZE regularly
- Create duplicate indexes

## Query Optimization Examples

### Example 1: Dashboard Bug List

**Query**:
```typescript
const bugs = await prisma.bug.findMany({
  where: {
    status: { notIn: ['closed', 'shipped'] },
    severity: { in: ['critical', 'high'] },
  },
  orderBy: { priorityScore: 'desc' },
  take: 20,
})
```

**Indexes Used**:
- `idx_bugs_severity`
- `idx_bugs_status`
- `idx_bugs_priority_score_desc`

**Performance**: ~5ms

### Example 2: Project Portfolio Overview

**Query**:
```typescript
const projects = await prisma.project.findMany({
  where: { status: 'active' },
  orderBy: { roiScore: 'desc' },
  take: 10,
})
```

**Indexes Used**:
- `idx_projects_status`
- `idx_projects_roi_score_desc`

**Performance**: ~3ms

### Example 3: User Workload

**Query**:
```typescript
const bugs = await prisma.bug.findMany({
  where: {
    assignedToId: userId,
    status: { notIn: ['closed', 'shipped'] },
  },
  orderBy: { priorityScore: 'desc' },
})
```

**Indexes Used**:
- `idx_bugs_assigned_to_id`
- `idx_bugs_status`
- `idx_bugs_priority_score_desc`

**Performance**: ~4ms

## Future Optimizations

### When to Add More Indexes

Consider adding composite indexes if you notice slow queries for:

1. **Project + Bug Status Queries**
   ```sql
   CREATE INDEX idx_bugs_project_status_priority
   ON bugs(project_id, status, priority_score DESC);
   ```

2. **Time-Range Metrics**
   ```sql
   CREATE INDEX idx_project_metrics_project_date
   ON project_metrics(project_id, date DESC);
   ```

3. **User Assignment + Severity**
   ```sql
   CREATE INDEX idx_bugs_assigned_severity
   ON bugs(assigned_to, severity)
   WHERE status NOT IN ('closed', 'shipped');
   ```

### Full-Text Search

For advanced search, consider adding:

```sql
-- Enable pg_trgm extension (already in schema)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for fuzzy text search
CREATE INDEX idx_bugs_title_trgm ON bugs USING gin(title gin_trgm_ops);
CREATE INDEX idx_projects_name_trgm ON projects USING gin(name gin_trgm_ops);
```

## Conclusion

The current indexing strategy provides:
- **Fast dashboard queries** (<10ms)
- **Efficient analytics** with time-series indexes
- **Scalable architecture** supporting 180+ projects
- **Balanced performance** between reads and writes

Monitor query performance regularly and add composite indexes as query patterns emerge.

---

**Last Updated**: November 24, 2024
**Database**: PostgreSQL 15 (Supabase)
**Total Indexes**: 35+ across 9 tables
