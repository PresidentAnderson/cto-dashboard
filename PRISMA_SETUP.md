# Prisma Database Layer Setup Guide

Complete guide for setting up and using Prisma with your CTO Dashboard v2.0.

---

## Overview

This project uses **Prisma ORM** for type-safe database access with PostgreSQL. Prisma provides:

- **Type Safety**: Automatically generated TypeScript types
- **Migration System**: Version-controlled database schema changes
- **Query Builder**: Intuitive API for database operations
- **Connection Pooling**: Optimized database connections
- **Introspection**: Generate schema from existing database

---

## Files Created

```
cto-dashboard/
├── prisma/
│   ├── schema.prisma          # Main database schema
│   ├── .env.example           # Environment variables template
│   └── seed.ts                # Sample data seeding script
├── lib/
│   └── prisma.ts              # Prisma client singleton
└── backend/
    └── package.json           # Updated with Prisma scripts
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `@prisma/client` - Prisma runtime client
- `prisma` - Prisma CLI (dev dependency)
- `tsx` - TypeScript execution for seed script

### 2. Configure Database Connection

Create `.env` file in the `prisma/` directory:

```bash
cp prisma/.env.example prisma/.env
```

Edit `prisma/.env` and add your Supabase connection string:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres?schema=public&sslmode=require"
```

**Get your DATABASE_URL from Supabase:**
1. Go to Supabase Dashboard
2. Click Settings → Database
3. Copy "Connection string" (URI format)
4. Replace `[PASSWORD]` with your database password

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This creates TypeScript types and the Prisma client based on your schema.

### 4. Push Schema to Database

**Option A: Use existing database (Recommended)**

If you already have tables from `database/schema.sql`:

```bash
npm run db:pull
```

This introspects your existing database and updates the Prisma schema.

**Option B: Create new database from Prisma schema**

```bash
npm run db:push
```

This pushes the Prisma schema to your database without creating migration files.

**Option C: Create migration (Production)**

```bash
npm run prisma:migrate
```

This creates a migration file and applies it to the database.

### 5. Seed the Database

```bash
npm run prisma:seed
```

This populates your database with:
- 6 sample users (CTO, engineers, QA)
- 5 projects with GitHub data
- 10 bugs (critical, high, medium, low)
- Project metrics (4 weeks of data)
- Monthly metrics (3 months)
- Portfolio metrics snapshot
- Import logs

---

## Schema Structure

### Core Tables

#### **users**
Authentication and user management
- `id` - UUID primary key
- `email` - Unique email address
- `name` - Full name
- `role` - Enum: cto, manager, engineer, senior_engineer, qa_engineer
- `passwordHash` - Encrypted password
- `avatarUrl` - Profile picture URL
- Timestamps: `createdAt`, `updatedAt`

#### **projects**
GitHub repositories and portfolio projects
- `id` - UUID primary key
- `name` - Project name
- `description` - Project description
- `githubUrl` - GitHub repository URL (unique)
- `demoUrl` - Live demo URL
- `language` - Primary programming language
- `tags` - Array of technology tags
- `stars`, `forks` - GitHub metrics
- `lastCommit` - Last commit timestamp
- `status` - Enum: active, shipped, deferred, cancelled
- **Complexity & Appeal** - Prioritization matrix data
- **Financial Metrics** - ARR, revenue projections, ROI
- **Market Sizing** - TAM, SAM, SOM, DCF valuation
- Timestamps: `createdAt`, `updatedAt`

#### **bugs**
Bug tracking with SLA and revenue impact
- `id` - UUID primary key
- `bugNumber` - Unique identifier (e.g., "BUG-1001")
- `title` - Bug summary
- `description` - Detailed description
- `severity` - Enum: critical, high, medium, low
- `status` - Enum: pending, in_progress, verified, shipped, closed, deferred
- `assignedToId` - Foreign key to users
- `projectId` - Foreign key to projects
- `slaHours` - Service level agreement deadline
- `businessImpact` - Text description of impact
- `revenueImpact` - Daily revenue loss (decimal)
- `isBlocker` - Boolean flag
- `priorityScore` - Calculated score (0-100)
- `estimatedHours`, `actualHours` - Time tracking
- Timestamps: `createdAt`, `updatedAt`, `resolvedAt`

#### **project_metrics**
Analytics data for each project
- `id` - UUID primary key
- `projectId` - Foreign key to projects
- `commitsCount` - Total commits
- `contributors` - Number of contributors
- `linesOfCode` - Total LOC
- `techStack` - Array of technologies
- `healthScore` - Project health (0-100)
- `date` - Metric snapshot date
- Unique constraint: `(projectId, date)`

#### **import_logs**
Track CSV/GitHub import operations
- `id` - UUID primary key
- `source` - Enum: csv, github, manual
- `recordsImported` - Success count
- `recordsFailed` - Failure count
- `errors` - Array of error messages
- `metadata` - JSON data about import
- `timestamp` - Import time

### Supporting Tables

- **bug_history** - Track changes to bugs
- **monthly_metrics** - Analytics trends by month
- **portfolio_metrics** - Portfolio snapshots
- **audit_log** - System-wide change tracking

### Relations

```
User (1) ──── (N) Bug (assigned_to)
User (1) ──── (N) Bug (created_by)
Project (1) ──── (N) Bug
Project (1) ──── (N) ProjectMetric
Bug (1) ──── (N) BugHistory
```

---

## Available Scripts

### Prisma CLI Commands

```bash
# Generate Prisma Client (run after schema changes)
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate

# Apply migrations in production
npm run prisma:migrate:deploy

# Reset database and run all migrations
npm run prisma:migrate:reset

# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Push schema without creating migration
npm run db:push

# Introspect existing database
npm run db:pull

# Run seed script
npm run prisma:seed
```

### Prisma Studio

Launch a web-based GUI to view and edit your database:

```bash
npm run prisma:studio
```

Opens at `http://localhost:5555`

---

## Usage Examples

### Import Prisma Client

```typescript
import { prisma } from '@/lib/prisma'
```

### Query Examples

**Get all active projects:**

```typescript
const projects = await prisma.project.findMany({
  where: { status: 'active' },
  include: {
    bugs: {
      where: { status: { not: 'closed' } }
    },
    metrics: {
      orderBy: { date: 'desc' },
      take: 1
    }
  }
})
```

**Create a new bug:**

```typescript
const bug = await prisma.bug.create({
  data: {
    bugNumber: 'BUG-5001',
    title: 'Login page not responsive',
    severity: 'medium',
    status: 'pending',
    slaHours: 72,
    projectId: 'project-uuid-here',
    assignedToId: 'user-uuid-here',
    priorityScore: 50
  }
})
```

**Update bug status:**

```typescript
const updated = await prisma.bug.update({
  where: { id: bugId },
  data: {
    status: 'in_progress',
    actualHours: 2
  }
})
```

**Get bugs with user and project info:**

```typescript
const bugs = await prisma.bug.findMany({
  include: {
    assignedTo: {
      select: { name: true, email: true, avatarUrl: true }
    },
    project: {
      select: { name: true, status: true }
    }
  },
  where: {
    severity: { in: ['critical', 'high'] },
    status: { notIn: ['closed', 'shipped'] }
  },
  orderBy: { priorityScore: 'desc' }
})
```

**Transaction example:**

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Create bug
  const bug = await tx.bug.create({
    data: { /* bug data */ }
  })

  // Log history
  await tx.bugHistory.create({
    data: {
      bugId: bug.id,
      fieldChanged: 'status',
      newValue: 'pending'
    }
  })

  return bug
})
```

**Aggregations:**

```typescript
const stats = await prisma.bug.groupBy({
  by: ['severity', 'status'],
  _count: true,
  where: {
    createdAt: {
      gte: new Date('2024-11-01')
    }
  }
})
```

---

## Migration Workflow

### Development

1. **Modify schema** in `prisma/schema.prisma`
2. **Create migration**: `npm run prisma:migrate`
3. **Name your migration** (e.g., "add_priority_score_to_bugs")
4. Migration is applied automatically
5. **Generate client**: `npm run prisma:generate`

### Production

1. **Test migration locally** with `npm run prisma:migrate`
2. **Commit migration files** in `prisma/migrations/`
3. **Deploy**: `npm run prisma:migrate:deploy`

**Never use `db:push` in production!** Always create migrations for tracking.

---

## Connecting to Existing Supabase Database

### Step 1: Get Connection String

From your Supabase dashboard:
1. Settings → Database
2. Copy "Connection string" (URI format)
3. Add `?schema=public&sslmode=require` to the end

Example:
```
postgresql://postgres:PASSWORD@db.abc.supabase.co:5432/postgres?schema=public&sslmode=require
```

### Step 2: Choose Integration Method

**Option A: Use Existing Schema (Recommended)**

If you already have tables from `database/schema.sql`:

```bash
# Introspect existing database
npm run db:pull

# This updates prisma/schema.prisma to match your database
# Review the generated schema and adjust as needed
```

**Option B: Replace with Prisma Schema**

If you want to use the Prisma schema instead:

```bash
# WARNING: This drops existing tables!
npm run prisma:migrate:reset

# Then push new schema
npm run db:push

# Seed with sample data
npm run prisma:seed
```

### Step 3: Generate Client

```bash
npm run prisma:generate
```

### Step 4: Test Connection

```bash
# Open Prisma Studio to verify
npm run prisma:studio
```

---

## Environment Variables

### Required

```env
DATABASE_URL="postgresql://..."
```

### Optional (for connection pooling)

```env
DIRECT_URL="postgresql://..."  # Direct connection (for migrations)
DATABASE_URL="postgresql://..."  # Pooled connection (for queries)
```

**When to use connection pooling:**
- Serverless environments (Vercel, AWS Lambda)
- High concurrency applications
- Connection pool exhaustion issues

**Supabase connection pooling:**
- Direct: Port 5432
- Pooled: Port 6543 (add `?pgbouncer=true`)

---

## Best Practices

### 1. Always Use Transactions for Multi-Step Operations

```typescript
await prisma.$transaction([
  prisma.bug.update({ where: { id }, data: { status: 'closed' } }),
  prisma.bugHistory.create({ data: { bugId: id, fieldChanged: 'status' } })
])
```

### 2. Use Select to Limit Fields

```typescript
// Bad: Fetches all fields
const users = await prisma.user.findMany()

// Good: Only fetch needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
})
```

### 3. Use Indexes for Performance

Already included in schema:
- `@@index([severity])` on bugs
- `@@index([status])` on projects
- `@@index([projectId, date])` on metrics

### 4. Handle Unique Constraint Errors

```typescript
try {
  await prisma.project.create({
    data: { githubUrl: 'https://github.com/...' }
  })
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    console.error('Project with this GitHub URL already exists')
  }
}
```

### 5. Use Enums for Type Safety

```typescript
import { BugSeverity, BugStatus } from '@prisma/client'

const bug = await prisma.bug.create({
  data: {
    severity: BugSeverity.critical,  // Type-safe!
    status: BugStatus.pending
  }
})
```

---

## Troubleshooting

### "Can't reach database server"

**Solution:**
1. Check DATABASE_URL is correct
2. Verify database is running (Supabase active)
3. Check firewall/network settings
4. Ensure SSL mode is correct (`sslmode=require` for Supabase)

### "Prisma Client not generated"

**Solution:**
```bash
npm run prisma:generate
```

### "Migration failed"

**Solution:**
```bash
# Reset and try again
npm run prisma:migrate:reset

# Or manually fix in SQL and mark migration as applied
npm run prisma:migrate resolve --applied "migration_name"
```

### "Connection pool timeout"

**Solution:**
1. Use connection pooling (Supabase port 6543)
2. Increase pool size in connection string: `?connection_limit=10`
3. Close connections after use: `await prisma.$disconnect()`

### "Type errors after schema changes"

**Solution:**
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Restart TypeScript server in your editor
```

---

## Production Checklist

- [ ] DATABASE_URL configured in environment variables
- [ ] Connection pooling enabled (for serverless)
- [ ] Migrations applied with `prisma:migrate:deploy`
- [ ] Prisma Client generated with `prisma:generate`
- [ ] Error handling implemented for database operations
- [ ] Indexes added for frequently queried fields
- [ ] Connection limits configured appropriately
- [ ] Backup strategy in place (Supabase auto-backup)
- [ ] Monitoring set up for slow queries

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Supabase + Prisma Guide](https://supabase.com/docs/guides/integrations/prisma)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## Summary

You now have a complete Prisma setup with:
- Type-safe database access
- Migration system
- Comprehensive schema with all CTO Dashboard tables
- Sample data seeding
- Production-ready configuration

**Next Steps:**
1. Run `npm install` to install dependencies
2. Configure `prisma/.env` with your DATABASE_URL
3. Run `npm run db:push` to sync schema
4. Run `npm run prisma:seed` to populate data
5. Run `npm run prisma:studio` to explore your database

Happy coding!
