# CTO Dashboard Database Schema Diagram

Visual representation of the database structure and relationships.

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CTO DASHBOARD DATABASE                         │
│                         PostgreSQL + Prisma ORM                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       USERS          │
├──────────────────────┤
│ id (UUID) PK         │
│ email (unique)       │◄─────────┐
│ name                 │          │
│ role (enum)          │          │ assignedTo
│ passwordHash         │          │
│ avatarUrl            │          │
│ createdAt            │          │
│ updatedAt            │          │
└──────────────────────┘          │
       │                          │
       │ createdBy                │
       │                          │
       ▼                          │
┌──────────────────────┐          │
│       BUGS           │◄─────────┘
├──────────────────────┤
│ id (UUID) PK         │
│ bugNumber (unique)   │          ┌──────────────────────┐
│ title                │          │     PROJECTS         │
│ description          │          ├──────────────────────┤
│ severity (enum)      │          │ id (UUID) PK         │
│ status (enum)        │◄─────────│ name                 │
│ assignedToId FK      │ projectId│ description          │
│ projectId FK         │          │ githubUrl (unique)   │
│ slaHours             │          │ demoUrl              │
│ businessImpact       │          │ language             │
│ revenueImpact        │          │ tags[]               │
│ isBlocker            │          │ stars                │
│ priorityScore        │          │ forks                │
│ estimatedHours       │          │ lastCommit           │
│ actualHours          │          │ status (enum)        │
│ createdAt            │          │                      │
│ updatedAt            │          │ -- Financial --      │
│ resolvedAt           │          │ arr                  │
│ createdById FK       │          │ year1Revenue         │
└──────────────────────┘          │ year3Revenue         │
       │                          │ roiScore             │
       │                          │ dcfValuation         │
       │                          │                      │
       ▼                          │ -- Market --         │
┌──────────────────────┐          │ tam                  │
│   BUG_HISTORY        │          │ sam                  │
├──────────────────────┤          │ somYear3             │
│ id (UUID) PK         │          │ tractionMrr          │
│ bugId FK             │          │ marginPercent        │
│ fieldChanged         │          │                      │
│ oldValue             │          │ -- Complexity --     │
│ newValue             │          │ complexity (1-5)     │
│ changedById FK       │          │ clientAppeal (0-10)  │
│ changedAt            │          │                      │
└──────────────────────┘          │ -- Milestones --     │
                                  │ currentMilestone     │
                                  │ totalMilestones      │
                                  │                      │
                                  │ monthlyInfraCost     │
                                  │ createdAt            │
                                  │ updatedAt            │
                                  └──────────────────────┘
                                         │
                                         │
                                         ▼
                                  ┌──────────────────────┐
                                  │  PROJECT_METRICS     │
                                  ├──────────────────────┤
                                  │ id (UUID) PK         │
                                  │ projectId FK         │
                                  │ commitsCount         │
                                  │ contributors         │
                                  │ linesOfCode          │
                                  │ techStack[]          │
                                  │ healthScore          │
                                  │ date                 │
                                  │ createdAt            │
                                  └──────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   IMPORT_LOGS        │     │  MONTHLY_METRICS     │     │ PORTFOLIO_METRICS    │
├──────────────────────┤     ├──────────────────────┤     ├──────────────────────┤
│ id (UUID) PK         │     │ id (UUID) PK         │     │ id (UUID) PK         │
│ source (enum)        │     │ month (unique)       │     │ totalProjects        │
│ recordsImported      │     │ totalBugs            │     │ shippedProjects      │
│ recordsFailed        │     │ criticalBugs         │     │ year3RevenueTotal    │
│ errors[]             │     │ highBugs             │     │ portfolioDcfTotal    │
│ metadata (JSON)      │     │ mediumBugs           │     │ monthlyDepsCost      │
│ timestamp            │     │ lowBugs              │     │ snapshotDate         │
└──────────────────────┘     │ engHours             │     │ createdAt            │
                             │ totalCost            │     └──────────────────────┘
                             │ revenueImpactDaily   │
                             │ avgResolutionDays    │
                             │ bugsCreated          │
                             │ bugsResolved         │
                             │ createdAt            │
                             └──────────────────────┘

┌──────────────────────┐
│     AUDIT_LOG        │
├──────────────────────┤
│ id (UUID) PK         │
│ userId FK            │
│ action               │
│ entityType           │
│ entityId             │
│ details (JSON)       │
│ ipAddress            │
│ userAgent            │
│ createdAt            │
└──────────────────────┘
```

---

## Relationship Types

### One-to-Many (1:N)

```
User (1) ─────< (N) Bug (assignedTo)
User (1) ─────< (N) Bug (createdBy)
User (1) ─────< (N) BugHistory
User (1) ─────< (N) AuditLog

Project (1) ─────< (N) Bug
Project (1) ─────< (N) ProjectMetric
Bug (1) ─────< (N) BugHistory
```

### Optional Relations

```
Bug.assignedToId   → User (optional)
Bug.projectId      → Project (optional, SET NULL on delete)
Bug.createdById    → User (optional)
```

---

## Enums

### BugSeverity
```
┌───────────┐
│ critical  │ → 4 hour SLA
│ high      │ → 24 hour SLA
│ medium    │ → 72 hour SLA
│ low       │ → 720 hour SLA (30 days)
└───────────┘
```

### BugStatus
```
┌─────────────┐
│ pending     │ → Just created
│ in_progress │ → Being worked on
│ verified    │ → Fix verified
│ shipped     │ → Deployed to production
│ closed      │ → Resolved and closed
│ deferred    │ → Postponed
└─────────────┘
```

### ProjectStatus
```
┌───────────┐
│ active    │ → Currently in development
│ shipped   │ → Deployed to production
│ deferred  │ → On hold
│ cancelled │ → Discontinued
└───────────┘
```

### UserRole
```
┌──────────────────┐
│ cto              │ → C-level access
│ manager          │ → Team manager
│ engineer         │ → Regular engineer
│ senior_engineer  │ → Senior engineer
│ qa_engineer      │ → QA engineer
└──────────────────┘
```

### ImportSource
```
┌─────────┐
│ csv     │ → CSV file import
│ github  │ → GitHub API sync
│ manual  │ → Manual entry
└─────────┘
```

---

## Data Flow Diagrams

### Bug Lifecycle

```
   CREATE                UPDATE               UPDATE                UPDATE
   ────────────────>     ────────────────>    ────────────────>     ────────────────>
   pending               in_progress          verified              shipped/closed

   │                     │                    │                     │
   ├─ Set SLA hours      ├─ Track hours       ├─ QA approval        ├─ Set resolvedAt
   ├─ Calculate priority ├─ Log history       ├─ Log history        ├─ Log history
   ├─ Assign user        └─ Update status     └─ Update status      └─ Update status
   └─ Link project
```

### GitHub Import Flow

```
   GitHub API
      │
      ├─ Fetch repos
      │
      ▼
   ┌────────────────┐
   │ Validate data  │
   └────────────────┘
      │
      ├─ Success ────────> Create Project records
      │                           │
      │                           ▼
      │                    Create ProjectMetric records
      │                           │
      │                           ▼
      └─ Failure ─────────> Log errors in ImportLog
                                  │
                                  ▼
                           Create ImportLog record
```

### Dashboard KPI Calculation

```
   ┌─────────────┐
   │   Request   │
   └─────────────┘
         │
         ▼
   ┌─────────────────────────────┐
   │  Parallel Queries           │
   ├─────────────────────────────┤
   │ 1. Count critical bugs      │
   │ 2. Count high bugs          │
   │ 3. Count medium bugs        │
   │ 4. Count low bugs           │
   │ 5. Count blocker bugs       │
   │ 6. Sum portfolio valuation  │
   │ 7. Sum monthly costs        │
   │ 8. Calculate SLA breaches   │
   └─────────────────────────────┘
         │
         ▼
   ┌─────────────┐
   │ Aggregate   │
   └─────────────┘
         │
         ▼
   ┌─────────────┐
   │   Response  │
   └─────────────┘
```

---

## Index Strategy

### Primary Indexes (Automatic)

```
users.id              → Primary key (UUID)
bugs.id               → Primary key (UUID)
projects.id           → Primary key (UUID)
bug_history.id        → Primary key (UUID)
project_metrics.id    → Primary key (UUID)
monthly_metrics.id    → Primary key (UUID)
portfolio_metrics.id  → Primary key (UUID)
import_logs.id        → Primary key (UUID)
audit_log.id          → Primary key (UUID)
```

### Unique Indexes

```
users.email           → Unique constraint
bugs.bugNumber        → Unique constraint (BUG-1001 format)
projects.githubUrl    → Unique constraint
monthly_metrics.month → Unique constraint
```

### Foreign Key Indexes

```
bugs.assignedToId     → References users.id
bugs.projectId        → References projects.id
bugs.createdById      → References users.id
bug_history.bugId     → References bugs.id
bug_history.changedById → References users.id
project_metrics.projectId → References projects.id
audit_log.userId      → References users.id
```

### Performance Indexes

```
-- Bugs (most queried)
bugs(severity)
bugs(status)
bugs(assignedToId)
bugs(projectId)
bugs(createdAt DESC)
bugs(priorityScore DESC)
bugs(isBlocker) WHERE isBlocker = true

-- Projects
projects(status)
projects(language)
projects(complexity)
projects(clientAppeal)
projects(roiScore DESC)

-- Time-series data
bug_history(changedAt DESC)
project_metrics(date DESC)
monthly_metrics(month DESC)
portfolio_metrics(snapshotDate DESC)
audit_log(createdAt DESC)

-- Multi-column
project_metrics(projectId, date) UNIQUE
audit_log(entityType, entityId)
```

---

## Table Sizes (Estimated)

| Table | Columns | Avg Row Size | 1K Records | 10K Records | 100K Records |
|-------|---------|--------------|------------|-------------|--------------|
| users | 7 | 250 bytes | 250 KB | 2.5 MB | 25 MB |
| projects | 25 | 800 bytes | 800 KB | 8 MB | 80 MB |
| bugs | 17 | 600 bytes | 600 KB | 6 MB | 60 MB |
| bug_history | 7 | 200 bytes | 200 KB | 2 MB | 20 MB |
| project_metrics | 9 | 300 bytes | 300 KB | 3 MB | 30 MB |
| monthly_metrics | 13 | 150 bytes | 150 KB | 1.5 MB | 15 MB |
| portfolio_metrics | 7 | 150 bytes | 150 KB | 1.5 MB | 15 MB |
| import_logs | 7 | 400 bytes | 400 KB | 4 MB | 40 MB |
| audit_log | 9 | 500 bytes | 500 KB | 5 MB | 50 MB |

**Total DB Size Estimate:**
- Small dashboard (1K bugs): ~5 MB
- Medium dashboard (10K bugs): ~50 MB
- Large dashboard (100K bugs): ~500 MB

**Supabase Free Tier:** 500 MB ✅

---

## Query Performance Matrix

| Query Type | Expected Time | Index Used | Notes |
|------------|---------------|------------|-------|
| Get bug by ID | <5ms | Primary key | Single row lookup |
| List bugs (filtered) | <20ms | severity, status | With indexes |
| List bugs (unfiltered) | <50ms | None | Full table scan |
| Count bugs by severity | <10ms | severity | Index scan |
| Dashboard KPIs (8 queries) | <50ms | Multiple | Parallel execution |
| Search bugs (text) | <100ms | Full-text | Contains search |
| Get project with bugs | <30ms | Foreign key | Join + filter |
| Aggregate revenue impact | <40ms | projectId | Group by |
| Create bug | <10ms | None | Single insert |
| Update bug status | <8ms | Primary key | Single update |
| Transaction (3 ops) | <30ms | Various | Atomic |
| Import 100 bugs | <500ms | Batch insert | createMany |

---

## Constraints & Rules

### Foreign Key Cascade Rules

```sql
-- Cascade deletes
project_metrics.projectId → ON DELETE CASCADE
bug_history.bugId → ON DELETE CASCADE

-- Set null on delete
bugs.projectId → ON DELETE SET NULL
bugs.assignedToId → ON DELETE SET NULL
bugs.createdById → ON DELETE SET NULL
```

### Check Constraints

```sql
-- Projects
complexity >= 1 AND complexity <= 5
clientAppeal >= 0 AND clientAppeal <= 10

-- Bugs
priorityScore >= 0 AND priorityScore <= 100

-- ProjectMetrics
healthScore >= 0 AND healthScore <= 100
```

### Default Values

```sql
-- Timestamps
createdAt → CURRENT_TIMESTAMP
updatedAt → CURRENT_TIMESTAMP (auto-updated)

-- Status fields
bug.status → 'pending'
bug.priorityScore → 50
bug.isBlocker → false
project.status → 'active'
user.role → 'engineer'

-- Counters
project.currentMilestone → 0
project.totalMilestones → 0
projectMetric.commitsCount → 0
projectMetric.contributors → 0
projectMetric.linesOfCode → 0
```

---

## Data Integrity Rules

### Required Fields (NOT NULL)

```
users: id, email, name, role
bugs: id, bugNumber, title, severity, status, slaHours
projects: id, name, status
bug_history: id, bugId, fieldChanged, changedAt
project_metrics: id, projectId, date
monthly_metrics: id, month, all metric fields
import_logs: id, source, timestamp
```

### Optional Fields (NULL)

```
users: passwordHash, avatarUrl
bugs: description, assignedToId, projectId, businessImpact,
      revenueImpact, estimatedHours, actualHours, resolvedAt, createdById
projects: description, githubUrl, demoUrl, language,
          all financial/market fields
bug_history: oldValue, newValue, changedById
```

---

## Access Patterns

### Common Queries (Optimized)

1. **Dashboard Home** - 8 KPI queries in parallel
2. **Bug List** - Paginated, filtered by severity/status
3. **Project Portfolio** - Sorted by ROI, with bug counts
4. **Bug Detail** - Single bug with relations
5. **Analytics** - Time-series aggregations
6. **Search** - Full-text search across bugs/projects
7. **User Workload** - Bugs assigned to user

### Recommended Caching

```typescript
// Cache dashboard KPIs (1 minute)
// Cache project list (5 minutes)
// Cache user info (10 minutes)
// Never cache: Bug status, real-time metrics
```

---

## Backup & Recovery

### Supabase Automatic Backups

- **Free Tier**: Daily backups (7 days retention)
- **Pro Tier**: Daily backups (14 days retention)
- **Point-in-time**: Available on Pro+ plans

### Manual Backup

```bash
# Export entire database
pg_dump $DATABASE_URL > backup.sql

# Export specific table
pg_dump $DATABASE_URL -t bugs > bugs_backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Monitoring Queries

### Database Size

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Slow Queries

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Summary

**Total Tables**: 9
**Total Enums**: 5
**Total Relations**: 8
**Total Indexes**: 23
**Expected Performance**: <100ms for 99% of queries
**Scalability**: Up to 100K+ records per table
**Type Safety**: 100% (TypeScript + Prisma)

This schema is production-ready and optimized for:
- Fast bug tracking
- Real-time dashboard KPIs
- Portfolio analytics
- GitHub synchronization
- Audit logging
- Time-series metrics

---

For implementation details, see:
- `PRISMA_SETUP.md` - Setup instructions
- `PRISMA_MIGRATION_GUIDE.md` - Migration from SQL
- `PRISMA_QUICK_REFERENCE.md` - Code examples
