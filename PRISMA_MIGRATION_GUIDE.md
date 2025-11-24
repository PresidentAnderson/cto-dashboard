# Migrating from SQL Schema to Prisma

Complete guide for transitioning your existing `database/schema.sql` to Prisma ORM.

---

## Overview

Your CTO Dashboard currently uses:
- **Current**: Raw PostgreSQL schema (`database/schema.sql`)
- **Target**: Prisma ORM with type-safe database access

This guide covers both approaches: using Prisma alongside existing schema or fully migrating.

---

## Option 1: Use Prisma with Existing Database (Recommended)

This approach keeps your existing SQL schema and generates Prisma client from it.

### Step 1: Introspect Existing Database

```bash
cd backend

# Install dependencies
npm install

# Pull schema from existing database
npm run db:pull
```

This generates `prisma/schema.prisma` from your existing tables.

### Step 2: Review Generated Schema

Open `prisma/schema.prisma` and verify:
- All tables are present
- Relations are correctly mapped
- Field types match expectations

### Step 3: Add Missing Features

The generated schema may miss some features. Add them manually:

```prisma
// Add indexes
@@index([githubUrl])
@@index([status])
@@index([severity])

// Add enums if not generated
enum BugSeverity {
  critical
  high
  medium
  low
}
```

### Step 4: Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 5: Update Backend Code

Replace raw SQL queries with Prisma:

**Before (Raw SQL):**
```javascript
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const result = await pool.query(
  'SELECT * FROM bugs WHERE severity = $1 AND status = $2',
  ['critical', 'pending']
)
```

**After (Prisma):**
```typescript
import { prisma } from '../lib/prisma'

const bugs = await prisma.bug.findMany({
  where: {
    severity: 'critical',
    status: 'pending'
  }
})
```

---

## Option 2: Full Migration to Prisma (Clean Slate)

This approach replaces your SQL schema with Prisma's version.

### Step 1: Backup Existing Data

```bash
# Export data from Supabase
pg_dump $DATABASE_URL > backup.sql

# Or use Supabase dashboard to export CSV
```

### Step 2: Drop Existing Schema

**WARNING: This deletes all data!**

```sql
-- Run in Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Step 3: Apply Prisma Schema

```bash
cd backend

# Push Prisma schema to empty database
npm run db:push
```

### Step 4: Seed with Sample Data

```bash
npm run prisma:seed
```

### Step 5: Import Production Data

If you exported data in Step 1:

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql

# Or use custom import script
node scripts/import-from-backup.js
```

---

## Schema Comparison

### Tables Mapping

| SQL Schema | Prisma Model | Status |
|------------|--------------|--------|
| `users` | `User` | ✅ Mapped |
| `bugs` | `Bug` | ✅ Mapped |
| `projects` | `Project` | ✅ Mapped |
| `bug_history` | `BugHistory` | ✅ Mapped |
| `monthly_metrics` | `MonthlyMetric` | ✅ Mapped |
| `portfolio_metrics` | `PortfolioMetric` | ✅ Mapped |
| `audit_log` | `AuditLog` | ✅ Mapped |
| N/A | `ProjectMetric` | ✅ New (for GitHub metrics) |
| N/A | `ImportLog` | ✅ New (for CSV/GitHub imports) |

### Key Differences

#### 1. Enum Handling

**SQL:**
```sql
CREATE TYPE bug_severity AS ENUM ('critical', 'high', 'medium', 'low');
```

**Prisma:**
```prisma
enum BugSeverity {
  critical
  high
  medium
  low
}
```

#### 2. UUID Generation

**SQL:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Prisma:**
```prisma
id String @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
```

#### 3. Computed Columns

**SQL:**
```sql
days_open INTEGER GENERATED ALWAYS AS (
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))
) STORED
```

**Prisma:**
```typescript
// Computed in application code
const daysOpen = Math.floor(
  (Date.now() - bug.createdAt.getTime()) / (1000 * 60 * 60 * 24)
)
```

#### 4. Triggers

SQL triggers (`set_bug_sla_trigger`, `track_bug_changes_trigger`) must be:
- Kept as SQL functions
- Or implemented in application code

#### 5. Views

SQL views (`bugs_with_users`, `dashboard_kpis`) become:

**Prisma Queries:**
```typescript
// bugs_with_users view
const bugsWithUsers = await prisma.bug.findMany({
  include: {
    assignedTo: true,
    project: true
  }
})

// dashboard_kpis view
const kpis = await prisma.bug.groupBy({
  by: ['severity'],
  where: { status: { notIn: ['shipped', 'closed'] } },
  _count: true
})
```

---

## Updating API Endpoints

### Example: Get All Bugs

**Before (using pg):**
```javascript
// backend/server.js
app.get('/api/bugs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, u.name as assigned_to_name, p.name as project_name
      FROM bugs b
      LEFT JOIN users u ON b.assigned_to = u.id
      LEFT JOIN projects p ON b.project_id = p.id
      ORDER BY b.priority_score DESC
    `)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
```

**After (using Prisma):**
```typescript
// backend/server.ts (or keep .js)
import { prisma } from '../lib/prisma'

app.get('/api/bugs', async (req, res) => {
  try {
    const bugs = await prisma.bug.findMany({
      include: {
        assignedTo: {
          select: { name: true, email: true, avatarUrl: true }
        },
        project: {
          select: { name: true, status: true }
        }
      },
      orderBy: { priorityScore: 'desc' }
    })

    res.json({ success: true, data: bugs })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})
```

### Example: Create Bug

**Before:**
```javascript
app.post('/api/bugs', async (req, res) => {
  const { title, severity, projectId, assignedToId } = req.body

  const result = await pool.query(`
    INSERT INTO bugs (bug_number, title, severity, project_id, assigned_to)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [generateBugNumber(), title, severity, projectId, assignedToId])

  res.json({ success: true, data: result.rows[0] })
})
```

**After:**
```typescript
app.post('/api/bugs', async (req, res) => {
  const { title, severity, projectId, assignedToId } = req.body

  const bug = await prisma.bug.create({
    data: {
      bugNumber: generateBugNumber(),
      title,
      severity,
      projectId,
      assignedToId,
      slaHours: getSlaHours(severity) // Auto-calculated
    },
    include: {
      assignedTo: true,
      project: true
    }
  })

  res.json({ success: true, data: bug })
})
```

---

## Handling Complex Queries

### Dashboard KPIs

**SQL View:**
```sql
CREATE VIEW dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM bugs WHERE severity = 'critical' AND status NOT IN ('shipped', 'closed')) as critical_bugs,
  (SELECT COUNT(*) FROM bugs WHERE severity = 'high' AND status NOT IN ('shipped', 'closed')) as high_bugs,
  ...
```

**Prisma Implementation:**
```typescript
async function getDashboardKPIs() {
  const [critical, high, medium, low, blocker, portfolioValue] = await Promise.all([
    prisma.bug.count({
      where: { severity: 'critical', status: { notIn: ['shipped', 'closed'] } }
    }),
    prisma.bug.count({
      where: { severity: 'high', status: { notIn: ['shipped', 'closed'] } }
    }),
    prisma.bug.count({
      where: { severity: 'medium', status: { notIn: ['shipped', 'closed'] } }
    }),
    prisma.bug.count({
      where: { severity: 'low', status: { notIn: ['shipped', 'closed'] } }
    }),
    prisma.bug.count({
      where: { isBlocker: true, status: { notIn: ['shipped', 'closed'] } }
    }),
    prisma.project.aggregate({
      _sum: { dcfValuation: true },
      where: { status: { not: 'cancelled' } }
    })
  ])

  return {
    critical_bugs: critical,
    high_bugs: high,
    medium_bugs: medium,
    low_bugs: low,
    blocker_bugs: blocker,
    portfolio_value: portfolioValue._sum.dcfValuation
  }
}
```

### Bug Cost Analysis

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION get_bug_cost_analysis(
  start_date TIMESTAMP,
  end_date TIMESTAMP
) RETURNS TABLE (...) AS $$
```

**Prisma Implementation:**
```typescript
async function getBugCostAnalysis(startDate: Date, endDate: Date) {
  const bugs = await prisma.bug.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const totalBugs = bugs.length
  const totalEngHours = bugs.reduce((sum, b) => sum + (b.actualHours?.toNumber() || 0), 0)
  const totalCost = totalEngHours * 150 // $150/hour
  const totalRevenueImpact = bugs.reduce((sum, b) => {
    const daysOpen = Math.floor((Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    return sum + ((b.revenueImpact?.toNumber() || 0) * daysOpen)
  }, 0)

  return {
    totalBugs,
    totalEngHours,
    totalCost,
    totalRevenueImpact
  }
}
```

---

## Keeping SQL Features

Some SQL features are best kept as raw SQL. Prisma supports this:

### Run Raw SQL

```typescript
// Keep using SQL views
const result = await prisma.$queryRaw`
  SELECT * FROM bugs_with_users
  WHERE sla_breached = true
`

// Use SQL functions
const costAnalysis = await prisma.$queryRaw`
  SELECT * FROM get_bug_cost_analysis(
    ${startDate}::timestamp,
    ${endDate}::timestamp
  )
`
```

### Execute Raw Commands

```typescript
// Run migrations or custom SQL
await prisma.$executeRaw`
  CREATE INDEX CONCURRENTLY idx_custom ON bugs (field)
`
```

---

## Testing Strategy

### 1. Parallel Testing

Run both implementations side-by-side:

```typescript
// Test endpoint with both methods
const sqlResult = await getSqlBugs()
const prismaResult = await getPrismaBugs()

assert.deepEqual(sqlResult, prismaResult)
```

### 2. Feature Flags

Use environment variables:

```typescript
const USE_PRISMA = process.env.USE_PRISMA === 'true'

if (USE_PRISMA) {
  return await getPrismaBugs()
} else {
  return await getSqlBugs()
}
```

### 3. Gradual Rollout

Migrate endpoints one at a time:
1. ✅ `/api/bugs` - Migrated to Prisma
2. ✅ `/api/projects` - Migrated to Prisma
3. ⏳ `/api/dashboard/kpis` - Still using SQL
4. ⏳ `/api/analytics` - Still using SQL

---

## Performance Considerations

### Connection Pooling

**Before:**
```javascript
const pool = new Pool({ max: 20 })
```

**After:**
```prisma
// In schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// In connection string
DATABASE_URL="postgresql://...?connection_limit=20"
```

### Query Optimization

**N+1 Problem:**
```typescript
// ❌ Bad: N+1 queries
const bugs = await prisma.bug.findMany()
for (const bug of bugs) {
  bug.assignedTo = await prisma.user.findUnique({ where: { id: bug.assignedToId } })
}

// ✅ Good: Single query with join
const bugs = await prisma.bug.findMany({
  include: { assignedTo: true }
})
```

### Indexes

Prisma preserves indexes from introspection. Add more if needed:

```prisma
model Bug {
  // ...fields

  @@index([severity, status])
  @@index([projectId, createdAt])
}
```

---

## Rollback Plan

If migration causes issues:

### 1. Revert to SQL Schema

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

### 2. Switch Backend Code

```javascript
// Temporarily disable Prisma
const USE_PRISMA = false

if (USE_PRISMA) {
  return await getPrismaBugs()
} else {
  return await getSqlBugs()  // Fallback to pg
}
```

### 3. Keep Both Methods

```javascript
// Keep pg pool for critical endpoints
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Use Prisma for new features
import { prisma } from '../lib/prisma'
```

---

## Migration Checklist

### Pre-Migration

- [ ] Backup production database
- [ ] Test Prisma introspection on staging
- [ ] Review generated schema for accuracy
- [ ] Document custom SQL functions/triggers to preserve
- [ ] Set up rollback plan

### Migration

- [ ] Install Prisma dependencies
- [ ] Configure DATABASE_URL in `.env`
- [ ] Run `npm run db:pull` to introspect
- [ ] Add missing indexes and relations
- [ ] Generate Prisma Client
- [ ] Update API endpoints one by one
- [ ] Test each endpoint thoroughly
- [ ] Monitor performance metrics

### Post-Migration

- [ ] Remove unused `pg` dependency (if fully migrated)
- [ ] Update documentation
- [ ] Train team on Prisma usage
- [ ] Set up Prisma Studio for database GUI
- [ ] Configure migrations for future changes

---

## Common Migration Patterns

### Pattern 1: Gradual Replacement

```typescript
// Old endpoint (keep for now)
app.get('/api/bugs/legacy', getSqlBugs)

// New endpoint (test)
app.get('/api/bugs', getPrismaBugs)

// Eventually: Remove legacy endpoint
```

### Pattern 2: Adapter Pattern

```typescript
interface BugRepository {
  findAll(): Promise<Bug[]>
  create(data: BugInput): Promise<Bug>
}

class SqlBugRepository implements BugRepository {
  // Uses pg
}

class PrismaBugRepository implements BugRepository {
  // Uses Prisma
}

// Switch implementation via config
const bugRepo = USE_PRISMA
  ? new PrismaBugRepository()
  : new SqlBugRepository()
```

### Pattern 3: Hybrid Approach

```typescript
// Use Prisma for simple CRUD
const bugs = await prisma.bug.findMany()

// Use raw SQL for complex analytics
const analytics = await prisma.$queryRaw`
  SELECT ... FROM complex_view WHERE ...
`
```

---

## Next Steps

1. **Start with read-only endpoints** (GET requests)
2. **Test thoroughly** in development
3. **Deploy to staging** with monitoring
4. **Migrate write endpoints** (POST/PUT/DELETE)
5. **Monitor production** for issues
6. **Optimize queries** based on metrics

---

## Support

If you encounter issues:
1. Check [Prisma Discord](https://pris.ly/discord)
2. Review [Migration Guide](https://www.prisma.io/docs/guides/migrate-to-prisma)
3. Consult [Supabase + Prisma docs](https://supabase.com/docs/guides/integrations/prisma)

---

## Summary

**Recommended Approach:**
- **Development**: Use Prisma for new features
- **Existing Code**: Keep SQL for complex queries
- **Gradual Migration**: Move endpoints one by one
- **Monitoring**: Track performance and errors closely

You now have a clear path to migrate from raw SQL to Prisma ORM!
