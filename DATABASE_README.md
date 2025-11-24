# Database Layer - CTO Dashboard v2.0

## Overview

Complete PostgreSQL + Prisma database layer for the CTO Dashboard, optimized for tracking 180+ projects, bug management, engineering metrics, and GitHub synchronization.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                  │
├─────────────────────────────────────────────────────────┤
│  lib/db-utils.ts (Helper Functions)                    │
│  ├─ Project Queries                                     │
│  ├─ Bug Queries with Filtering                         │
│  ├─ Metrics & Analytics                                 │
│  ├─ Search Functions                                    │
│  └─ Team Performance                                    │
├─────────────────────────────────────────────────────────┤
│  lib/prisma.ts (Prisma Client + Connection Pool)       │
│  ├─ Singleton Pattern                                   │
│  ├─ Connection Pooling                                  │
│  ├─ Transaction Support                                 │
│  └─ Query Performance Monitoring                        │
├─────────────────────────────────────────────────────────┤
│  @prisma/client (Generated Type-Safe Client)           │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 15 (Supabase)                              │
│  ├─ 9 Core Tables                                       │
│  ├─ 35+ Performance Indexes                            │
│  ├─ Full-Text Search (pg_trgm)                         │
│  └─ UUID Extensions                                     │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Ensure `.env.local` contains:

```env
DATABASE_URL=postgresql://postgres:Success*2026$$$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Apply Database Schema

```bash
# Development (creates migration files)
npm run db:migrate

# OR Quick push (no migrations)
npm run db:push
```

### 5. Seed Database

```bash
npm run db:seed
```

### 6. Verify Setup

```bash
# Run comprehensive test suite
npm run db:test

# OR open Prisma Studio
npm run db:studio
```

## File Structure

```
cto-dashboard/
├── prisma/
│   ├── schema.prisma           # Complete database schema
│   ├── seed.ts                 # Seed data script
│   └── migrations/             # Migration history (auto-generated)
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   └── db-utils.ts            # Type-safe query helpers
├── scripts/
│   └── test-db-connection.ts  # Database testing script
├── DATABASE_README.md          # This file
├── DATABASE_SETUP.md          # Setup guide
├── DATABASE_INDEXES.md        # Index strategy
├── DATABASE_API.md            # API reference
└── package.json               # Database scripts
```

## Database Schema

### Core Tables

#### 1. Projects (180+ entries)
- Project metadata and GitHub integration
- Financial metrics (ARR, revenue, valuations)
- Complexity and prioritization scores
- Infrastructure costs

#### 2. Bugs (10,000+ entries)
- Comprehensive bug tracking
- SLA monitoring and breach detection
- Revenue impact calculations
- Priority scoring algorithm
- Assignment and ownership

#### 3. Users
- Team member management
- Role-based access control
- Workload tracking

#### 4. Project Metrics
- Daily/weekly analytics per project
- Commit counts and LOC
- Health scores
- Tech stack tracking

#### 5. Monthly Metrics
- Aggregated monthly analytics
- Bug trends and resolution rates
- Engineering hours
- Cost tracking

#### 6. Portfolio Metrics
- Portfolio-wide snapshots
- Total valuations
- Infrastructure costs

#### 7. Bug History
- Complete audit trail
- Field change tracking
- User attribution

#### 8. Import Logs
- CSV/GitHub import tracking
- Success/failure rates
- Error logging

#### 9. Audit Log
- System-wide change tracking
- User activity logs
- IP and user agent tracking

## Key Features

### Type-Safe Queries

```typescript
import { getProjectWithBugs } from '@/lib/db-utils'

// Fully typed, no raw SQL
const project = await getProjectWithBugs(projectId)
// project: ProjectWithBugs | null
```

### Connection Pooling

Optimized for serverless/edge environments:
- 10 concurrent connections (configurable)
- 20-second connection timeout
- Automatic reconnection on failure
- Graceful shutdown handling

### Performance Optimization

- **35+ strategic indexes** for fast queries
- **Partial indexes** for specific conditions
- **Composite indexes** for complex queries
- **Query monitoring** in development (logs slow queries)

### Transaction Support

```typescript
import { executeTransaction } from '@/lib/prisma'

await executeTransaction(async (tx) => {
  const bug = await tx.bug.create({ data: /* ... */ })
  await tx.bugHistory.create({ data: { bugId: bug.id } })
  return bug
}, 3) // Retry up to 3 times
```

### Search Capabilities

Full-text search with fuzzy matching:
- Project search (name, description, tags)
- Bug search (title, description, bug number)
- Case-insensitive
- PostgreSQL `pg_trgm` extension

## Available Scripts

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create migration (with history)
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Reset database (destructive!)
npm run db:migrate:reset

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Pull schema from database
npm run db:pull

# Check migration status
npm run db:status

# Test database connection
npm run db:test

# Format schema file
npm run db:format
```

## Common Operations

### Creating a New Bug

```typescript
import { prisma } from '@/lib/prisma'

const bug = await prisma.bug.create({
  data: {
    bugNumber: 'BUG-1234',
    title: 'Payment processing error',
    severity: 'critical',
    status: 'pending',
    projectId: 'project-uuid',
    slaHours: 4,
    priorityScore: 95,
  },
})
```

### Querying with Relations

```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    bugs: {
      where: { status: 'in_progress' },
      include: { assignedTo: true },
    },
    metrics: { take: 7 }, // Last 7 days
  },
})
```

### Using Utility Functions

```typescript
import {
  getCriticalBugs,
  getBugStatistics,
  getPortfolioOverview,
} from '@/lib/db-utils'

const [criticalBugs, stats, portfolio] = await Promise.all([
  getCriticalBugs(),
  getBugStatistics(),
  getPortfolioOverview(),
])
```

### Pagination

```typescript
import { getBugsWithFilters } from '@/lib/db-utils'

const { bugs, pagination } = await getBugsWithFilters(
  { severity: 'high' },
  { page: 1, limit: 20 }
)

console.log(`Page ${pagination.page} of ${pagination.totalPages}`)
```

## Performance Guidelines

### Query Optimization

1. **Use selective includes** - Only fetch what you need
2. **Implement pagination** - Use `skip` and `take`
3. **Leverage indexes** - Query indexed fields
4. **Batch operations** - Use `createMany`, `updateMany`
5. **Use transactions** - For related operations

### Example: Good vs Bad

```typescript
// ❌ BAD - Fetches everything
const projects = await prisma.project.findMany({
  include: { bugs: true, metrics: true },
})

// ✅ GOOD - Selective and paginated
const projects = await prisma.project.findMany({
  where: { status: 'active' },
  include: {
    bugs: {
      where: { status: { notIn: ['closed'] } },
      take: 10,
    },
  },
  take: 20,
  skip: page * 20,
})
```

## Monitoring

### Slow Query Logging

Automatically logs queries > 1 second in development:

```typescript
// Logged automatically in development
// Example output:
// Slow query detected: bug.findMany took 1243ms
```

### Database Health Check

```typescript
import { checkDatabaseHealth } from '@/lib/db-utils'

const health = await checkDatabaseHealth()
console.log(`Database latency: ${health.latency}ms`)
```

### Connection Testing

```bash
npm run db:test
```

Runs comprehensive test suite:
- Connection test
- Health check
- Schema verification
- Query performance
- Utility function tests

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to database

**Solutions**:
1. Verify `DATABASE_URL` in `.env.local`
2. Check Supabase project status
3. Verify network connectivity
4. Review firewall rules

### Migration Issues

**Problem**: Migration conflicts

**Solutions**:
```bash
# Check migration status
npm run db:status

# Resolve applied migration
npx prisma migrate resolve --applied [migration-name]

# Reset database (careful!)
npm run db:migrate:reset
```

### Type Generation Issues

**Problem**: TypeScript errors with Prisma Client

**Solutions**:
```bash
# Regenerate client
npm run db:generate

# Restart TypeScript server (VS Code)
Cmd+Shift+P -> TypeScript: Restart TS Server
```

### Performance Issues

**Problem**: Slow queries

**Solutions**:
1. Check indexes: Review `DATABASE_INDEXES.md`
2. Analyze query: Use `EXPLAIN ANALYZE`
3. Monitor logs: Check for slow query warnings
4. Optimize includes: Fetch only needed relations

## Production Deployment

### Pre-deployment Checklist

- [ ] Run migrations: `npm run db:migrate:deploy`
- [ ] Generate client: `npm run db:generate`
- [ ] Test connection: `npm run db:test`
- [ ] Verify indexes: Check `DATABASE_INDEXES.md`
- [ ] Configure connection pooling in `.env`
- [ ] Set up backup strategy
- [ ] Monitor query performance

### Environment Variables

```env
# Production configuration
DATABASE_URL=postgresql://...
DATABASE_CONNECTION_LIMIT=10
DATABASE_CONNECTION_TIMEOUT=20
DATABASE_POOL_TIMEOUT=10
NODE_ENV=production
```

### Backup Strategy

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup_20241124.sql
```

## Documentation

- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Detailed setup instructions
- **[DATABASE_INDEXES.md](./DATABASE_INDEXES.md)** - Index strategy and performance
- **[DATABASE_API.md](./DATABASE_API.md)** - Complete API reference

## Support

For issues or questions:

1. Check existing documentation files
2. Review [Prisma Documentation](https://www.prisma.io/docs)
3. Check [Supabase Database Docs](https://supabase.com/docs/guides/database)
4. Examine migration logs in `prisma/migrations/`

## Schema Design Decisions

### Why UUID?

- Distributed systems friendly
- Prevents enumeration attacks
- Better for public APIs
- Supabase native support

### Why Separate Metrics Tables?

- **Project Metrics**: Daily granularity, per-project
- **Monthly Metrics**: Aggregated, portfolio-wide
- **Portfolio Metrics**: Snapshots for historical tracking
- Optimized for different query patterns

### Why Bug History?

- Complete audit trail
- Compliance requirements
- Debugging and analytics
- User accountability

### Why Enum Types?

- Type safety at database level
- Prevents invalid data
- Better performance than strings
- Clear API contracts

## Roadmap

### Planned Enhancements

- [ ] Real-time subscriptions (Supabase Realtime)
- [ ] Advanced full-text search (tsvector)
- [ ] Time-series optimization (TimescaleDB)
- [ ] Materialized views for dashboards
- [ ] GraphQL support (Prisma Nexus)
- [ ] Multi-tenant architecture

### Performance Targets

- **Dashboard load**: < 100ms
- **Bug list query**: < 50ms
- **Search queries**: < 200ms
- **Analytics queries**: < 500ms
- **Sync operations**: < 5s for 100 records

## License

MIT

---

**Last Updated**: November 24, 2024
**Version**: 2.0.0
**Database**: PostgreSQL 15 (Supabase)
**Prisma Version**: 5.7.1
