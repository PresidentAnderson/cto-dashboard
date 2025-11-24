# Database Setup Guide - CTO Dashboard v2.0

## Overview
This guide walks you through setting up the PostgreSQL database using Prisma with Supabase.

## Prerequisites
- Node.js 18+ installed
- Access to Supabase project
- Database credentials configured in `.env.local`

## Database Configuration

### Environment Variables
Ensure your `.env.local` file contains:

```env
DATABASE_URL=postgresql://postgres:Success*2026$$$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres

# Optional connection pool settings (for production)
DATABASE_CONNECTION_LIMIT=10
DATABASE_CONNECTION_TIMEOUT=20
DATABASE_POOL_TIMEOUT=10
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install Prisma and all required dependencies.

### 2. Generate Prisma Client

```bash
npx prisma generate
```

This generates the type-safe Prisma Client from your schema.

### 3. Create Database Tables

**Option A: Create migration and apply (Recommended for production)**

```bash
# Create a new migration
npx prisma migrate dev --name init

# This will:
# - Create migration files in prisma/migrations/
# - Apply migration to database
# - Generate Prisma Client
```

**Option B: Push schema directly (Good for development)**

```bash
# Push schema without creating migration files
npx prisma db push

# Use this for rapid prototyping
# Not recommended for production
```

### 4. Seed the Database

```bash
# Run the seed script to populate with sample data
npx prisma db seed
```

This will create:
- 6 users (including CTO, engineers, QA)
- 5 projects with financial metrics
- 10+ bugs with various severities
- Project metrics and analytics data
- Monthly and portfolio metrics
- Import logs

### 5. Verify Database Setup

```bash
# Open Prisma Studio to browse data
npx prisma studio
```

Visit http://localhost:5555 to explore your database visually.

## Database Schema

### Core Tables

#### Projects
- Tracks all projects with GitHub integration
- Financial metrics (ARR, revenue projections, valuations)
- Complexity and client appeal scores
- Infrastructure costs

#### Bugs
- Comprehensive bug tracking
- SLA monitoring
- Revenue impact calculations
- Priority scoring
- Assignee tracking

#### Users
- Team member management
- Role-based access
- Workload tracking

#### Project Metrics
- Daily/weekly metrics per project
- Commit counts, LOC, health scores
- Tech stack tracking

#### Monthly Metrics
- Aggregated monthly analytics
- Bug trends
- Engineering hours
- Cost tracking

#### Portfolio Metrics
- Portfolio-wide snapshots
- Total valuations
- Infrastructure costs

### Key Indexes

Performance-optimized indexes on:
- Bug severity and status (for dashboard queries)
- Project status and ROI score (for prioritization)
- Date fields (for time-series analytics)
- Foreign keys (for join performance)
- Partial indexes on critical bugs and blockers

## Common Commands

### Database Management

```bash
# Check database status
npx prisma db pull      # Pull schema from database

# Reset database (careful!)
npx prisma migrate reset   # Drops all data and reapplies migrations

# View migration status
npx prisma migrate status

# Create migration
npx prisma migrate dev --name description_of_change
```

### Development Workflow

```bash
# 1. Make schema changes in schema.prisma
# 2. Create and apply migration
npx prisma migrate dev --name add_new_feature

# 3. Regenerate client (usually automatic)
npx prisma generate

# 4. Update seed data if needed
# Edit prisma/seed.ts

# 5. Reset and reseed for testing
npx prisma migrate reset
```

### Production Deployment

```bash
# 1. Run migrations on production database
npx prisma migrate deploy

# 2. Generate optimized client
npx prisma generate

# Note: Never use "migrate dev" in production!
```

## Connection Pooling

The database is configured with connection pooling for optimal performance:

- **Development**: 5 connections per worker
- **Production**: 10 connections (configurable)
- **Timeout**: 20 seconds
- **Pool timeout**: 10 seconds

### Supabase Connection Pooling

For serverless environments, consider using Supabase's connection pooler:

```env
# Use transaction mode pooler for Prisma
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Database Maintenance

### Backup Strategy

```bash
# Backup database (using Supabase CLI or pg_dump)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Performance Monitoring

Monitor slow queries in development:
- Automatic logging for queries > 1 second
- Check logs for optimization opportunities

### Index Optimization

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### Connection Issues

**Error: `Can't reach database server`**
- Verify DATABASE_URL is correct
- Check Supabase project is running
- Verify network connectivity
- Check firewall rules

**Error: `Too many connections`**
- Reduce DATABASE_CONNECTION_LIMIT
- Use Supabase connection pooler
- Check for connection leaks

### Migration Issues

**Error: `Migration already applied`**
```bash
# Mark migration as applied without running
npx prisma migrate resolve --applied [migration_name]
```

**Error: `Migration failed`**
```bash
# Roll back to previous state
npx prisma migrate resolve --rolled-back [migration_name]
```

### Type Generation Issues

**Error: `Cannot find module '@prisma/client'`**
```bash
# Regenerate Prisma Client
npx prisma generate
```

## Database Best Practices

### Query Optimization

1. **Use selective includes** - Only fetch relations you need
2. **Implement pagination** - Use `skip` and `take` for large datasets
3. **Leverage indexes** - Already configured for common queries
4. **Batch operations** - Use `createMany`, `updateMany` for bulk ops
5. **Use transactions** - For related operations that must succeed together

### Example: Optimized Query

```typescript
// Good - Selective includes, pagination
const projects = await prisma.project.findMany({
  where: { status: 'active' },
  include: {
    bugs: {
      where: { status: { notIn: ['closed', 'shipped'] } },
      take: 10,
    },
  },
  take: 20,
  skip: page * 20,
})

// Bad - Fetches everything
const projects = await prisma.project.findMany({
  include: { bugs: true, metrics: true },
})
```

### Using Utility Functions

Import from `lib/db-utils.ts`:

```typescript
import {
  getProjectWithBugs,
  getCriticalBugs,
  getDailyMetrics,
  getSyncStatus,
} from '@/lib/db-utils'

// Type-safe, optimized queries
const project = await getProjectWithBugs(projectId)
const criticalBugs = await getCriticalBugs()
```

## Next Steps

1. **Test Connection**: Run `npx prisma db pull` to verify connectivity
2. **Apply Migrations**: Run `npx prisma migrate dev --name init`
3. **Seed Data**: Run `npx prisma db seed`
4. **Verify Setup**: Open Prisma Studio with `npx prisma studio`
5. **Start Development**: Begin building features with type-safe queries

## Support

For issues or questions:
- Check [Prisma Documentation](https://www.prisma.io/docs)
- Review [Supabase Database Docs](https://supabase.com/docs/guides/database)
- Check migration logs in `prisma/migrations/`

---

**Last Updated**: November 24, 2024
**Database Version**: PostgreSQL 15 (Supabase)
**Prisma Version**: 5.x
