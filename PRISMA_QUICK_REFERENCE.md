# Prisma Quick Reference Guide

Fast reference for common Prisma operations in your CTO Dashboard.

---

## Setup Commands

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Push schema to database (dev)
npm run db:push

# Create migration (production)
npm run prisma:migrate

# Open Prisma Studio GUI
npm run prisma:studio

# Seed database
npm run prisma:seed

# Introspect existing database
npm run db:pull
```

---

## Import Prisma Client

```typescript
import { prisma } from '@/lib/prisma'
import { BugSeverity, BugStatus, ProjectStatus, UserRole } from '@prisma/client'
```

---

## CRUD Operations

### Create

```typescript
// Create single record
const bug = await prisma.bug.create({
  data: {
    bugNumber: 'BUG-5001',
    title: 'Login page not responsive',
    severity: BugSeverity.high,
    status: BugStatus.pending,
    projectId: projectId,
    assignedToId: userId,
    slaHours: 24,
    priorityScore: 75
  }
})

// Create with relations
const project = await prisma.project.create({
  data: {
    name: 'New Project',
    status: ProjectStatus.active,
    bugs: {
      create: [
        { bugNumber: 'BUG-1', title: 'Bug 1', severity: 'high', status: 'pending', slaHours: 24 }
      ]
    }
  }
})

// Create many
await prisma.user.createMany({
  data: [
    { email: 'user1@example.com', name: 'User 1', role: UserRole.engineer },
    { email: 'user2@example.com', name: 'User 2', role: UserRole.engineer }
  ]
})
```

### Read

```typescript
// Find unique (by unique field)
const project = await prisma.project.findUnique({
  where: { id: projectId }
})

// Find first matching
const bug = await prisma.bug.findFirst({
  where: {
    severity: BugSeverity.critical,
    status: BugStatus.pending
  }
})

// Find many
const bugs = await prisma.bug.findMany({
  where: {
    severity: { in: [BugSeverity.critical, BugSeverity.high] },
    status: { notIn: [BugStatus.closed, BugStatus.shipped] }
  },
  orderBy: { priorityScore: 'desc' },
  take: 10, // Limit
  skip: 0   // Offset
})

// Find with relations
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    bugs: {
      where: { status: { not: BugStatus.closed } },
      include: { assignedTo: true }
    },
    metrics: {
      orderBy: { date: 'desc' },
      take: 1
    }
  }
})

// Select specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Don't include passwordHash
  }
})
```

### Update

```typescript
// Update single record
const bug = await prisma.bug.update({
  where: { id: bugId },
  data: {
    status: BugStatus.in_progress,
    actualHours: 4
  }
})

// Update many
await prisma.bug.updateMany({
  where: {
    status: BugStatus.pending,
    createdAt: { lt: new Date('2024-01-01') }
  },
  data: {
    status: BugStatus.deferred
  }
})

// Upsert (create or update)
const user = await prisma.user.upsert({
  where: { email: 'user@example.com' },
  create: {
    email: 'user@example.com',
    name: 'New User',
    role: UserRole.engineer
  },
  update: {
    name: 'Updated Name'
  }
})

// Update with relations
await prisma.project.update({
  where: { id: projectId },
  data: {
    bugs: {
      create: { bugNumber: 'BUG-X', title: 'New bug', severity: 'low', status: 'pending', slaHours: 720 }
    }
  }
})
```

### Delete

```typescript
// Delete single record
await prisma.bug.delete({
  where: { id: bugId }
})

// Delete many
await prisma.bug.deleteMany({
  where: {
    status: BugStatus.closed,
    resolvedAt: { lt: new Date('2023-01-01') }
  }
})

// Delete all
await prisma.bug.deleteMany()
```

---

## Filtering & Querying

### Comparison Operators

```typescript
// Equals
where: { severity: BugSeverity.critical }

// Not equals
where: { status: { not: BugStatus.closed } }

// In array
where: { severity: { in: [BugSeverity.critical, BugSeverity.high] } }

// Not in array
where: { status: { notIn: [BugStatus.closed, BugStatus.shipped] } }

// Greater than / Less than
where: {
  priorityScore: { gt: 75 },
  actualHours: { lte: 10 }
}

// Date ranges
where: {
  createdAt: {
    gte: new Date('2024-11-01'),
    lt: new Date('2024-12-01')
  }
}

// String matching
where: {
  title: { contains: 'login', mode: 'insensitive' },
  email: { startsWith: 'admin' },
  githubUrl: { endsWith: '.git' }
}

// Null checks
where: {
  assignedToId: { equals: null },
  resolvedAt: { not: null }
}
```

### Logical Operators

```typescript
// AND (default)
where: {
  severity: BugSeverity.critical,
  status: BugStatus.pending
}

// OR
where: {
  OR: [
    { severity: BugSeverity.critical },
    { isBlocker: true }
  ]
}

// NOT
where: {
  NOT: {
    status: { in: [BugStatus.closed, BugStatus.shipped] }
  }
}

// Complex combinations
where: {
  AND: [
    { severity: { in: [BugSeverity.critical, BugSeverity.high] } },
    {
      OR: [
        { isBlocker: true },
        { revenueImpact: { gt: 1000 } }
      ]
    }
  ]
}
```

### Relation Filters

```typescript
// Filter by related data
const projects = await prisma.project.findMany({
  where: {
    bugs: {
      some: {
        severity: BugSeverity.critical,
        status: { not: BugStatus.closed }
      }
    }
  }
})

// Every/None
where: {
  bugs: {
    every: { status: BugStatus.closed },  // All bugs closed
    none: { isBlocker: true }             // No blockers
  }
}
```

---

## Aggregations

### Count

```typescript
// Count all
const totalBugs = await prisma.bug.count()

// Count with filter
const criticalBugs = await prisma.bug.count({
  where: { severity: BugSeverity.critical }
})
```

### Aggregate Functions

```typescript
const result = await prisma.bug.aggregate({
  _count: { id: true },
  _sum: { actualHours: true, revenueImpact: true },
  _avg: { priorityScore: true },
  _min: { createdAt: true },
  _max: { priorityScore: true },
  where: {
    status: { notIn: [BugStatus.closed, BugStatus.shipped] }
  }
})

// result.count, result._sum.actualHours, etc.
```

### Group By

```typescript
const bugsBySeverity = await prisma.bug.groupBy({
  by: ['severity', 'status'],
  _count: { id: true },
  _sum: { actualHours: true },
  where: {
    createdAt: { gte: new Date('2024-11-01') }
  },
  orderBy: {
    _count: { id: 'desc' }
  }
})

// Returns: [{ severity: 'critical', status: 'pending', _count: { id: 5 }, _sum: { actualHours: 20 } }, ...]
```

---

## Transactions

### Sequential Operations

```typescript
const result = await prisma.$transaction([
  prisma.bug.update({
    where: { id: bugId },
    data: { status: BugStatus.closed, resolvedAt: new Date() }
  }),
  prisma.bugHistory.create({
    data: {
      bugId: bugId,
      fieldChanged: 'status',
      oldValue: 'in_progress',
      newValue: 'closed'
    }
  })
])
```

### Interactive Transactions

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Close bug
  const bug = await tx.bug.update({
    where: { id: bugId },
    data: { status: BugStatus.closed, resolvedAt: new Date() }
  })

  // Log history
  await tx.bugHistory.create({
    data: {
      bugId: bug.id,
      fieldChanged: 'status',
      newValue: BugStatus.closed
    }
  })

  // Update project metrics
  await tx.project.update({
    where: { id: bug.projectId! },
    data: {
      currentMilestone: { increment: 1 }
    }
  })

  return bug
})
```

---

## Raw SQL

### Query Raw

```typescript
// Type-safe (with template literals)
const result = await prisma.$queryRaw<Bug[]>`
  SELECT * FROM bugs
  WHERE severity = ${BugSeverity.critical}
  AND created_at > ${new Date('2024-11-01')}
`

// Unsafe (for dynamic queries)
const tableName = 'bugs'
const result = await prisma.$queryRawUnsafe(`SELECT * FROM ${tableName}`)
```

### Execute Raw

```typescript
await prisma.$executeRaw`
  UPDATE bugs
  SET priority_score = priority_score + 10
  WHERE is_blocker = true
`
```

---

## Common Patterns

### Dashboard KPIs

```typescript
async function getDashboardKPIs() {
  const [critical, high, medium, low, blocker, portfolioValue] = await Promise.all([
    prisma.bug.count({ where: { severity: BugSeverity.critical, status: { notIn: [BugStatus.shipped, BugStatus.closed] } } }),
    prisma.bug.count({ where: { severity: BugSeverity.high, status: { notIn: [BugStatus.shipped, BugStatus.closed] } } }),
    prisma.bug.count({ where: { severity: BugSeverity.medium, status: { notIn: [BugStatus.shipped, BugStatus.closed] } } }),
    prisma.bug.count({ where: { severity: BugSeverity.low, status: { notIn: [BugStatus.shipped, BugStatus.closed] } } }),
    prisma.bug.count({ where: { isBlocker: true, status: { notIn: [BugStatus.shipped, BugStatus.closed] } } }),
    prisma.project.aggregate({ _sum: { dcfValuation: true }, where: { status: { not: ProjectStatus.cancelled } } })
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

### Pagination

```typescript
async function getPaginatedBugs(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize

  const [bugs, total] = await Promise.all([
    prisma.bug.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: true, project: true }
    }),
    prisma.bug.count()
  ])

  return {
    data: bugs,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}
```

### Search

```typescript
async function searchBugs(query: string) {
  return await prisma.bug.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { bugNumber: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: { assignedTo: true, project: true }
  })
}
```

### Batch Import

```typescript
async function importBugsFromCSV(bugData: BugInput[]) {
  const results = {
    imported: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const bug of bugData) {
    try {
      await prisma.bug.create({ data: bug })
      results.imported++
    } catch (error) {
      results.failed++
      results.errors.push(`Failed to import ${bug.bugNumber}: ${error.message}`)
    }
  }

  // Log import
  await prisma.importLog.create({
    data: {
      source: 'csv',
      recordsImported: results.imported,
      recordsFailed: results.failed,
      errors: results.errors
    }
  })

  return results
}
```

---

## Error Handling

```typescript
import { Prisma } from '@prisma/client'

try {
  await prisma.bug.create({ data: bugData })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      console.error('Bug number already exists')
    }
    // Foreign key constraint violation
    if (error.code === 'P2003') {
      console.error('Invalid project or user ID')
    }
    // Record not found
    if (error.code === 'P2025') {
      console.error('Bug not found')
    }
  }
  throw error
}
```

### Common Error Codes

- `P2002` - Unique constraint violation
- `P2003` - Foreign key constraint violation
- `P2025` - Record not found
- `P2010` - Raw query failed
- `P2024` - Connection timeout

---

## Performance Tips

### 1. Use Select for Large Tables

```typescript
// ❌ Bad: Fetches all fields including large text
const bugs = await prisma.bug.findMany()

// ✅ Good: Only fetch needed fields
const bugs = await prisma.bug.findMany({
  select: {
    id: true,
    bugNumber: true,
    title: true,
    severity: true,
    status: true
  }
})
```

### 2. Batch Operations

```typescript
// ❌ Bad: N queries
for (const bugId of bugIds) {
  await prisma.bug.delete({ where: { id: bugId } })
}

// ✅ Good: Single query
await prisma.bug.deleteMany({
  where: { id: { in: bugIds } }
})
```

### 3. Include vs Separate Queries

```typescript
// ❌ Bad: N+1 problem
const bugs = await prisma.bug.findMany()
for (const bug of bugs) {
  bug.assignedTo = await prisma.user.findUnique({ where: { id: bug.assignedToId } })
}

// ✅ Good: Single query with join
const bugs = await prisma.bug.findMany({
  include: { assignedTo: true }
})
```

### 4. Use Indexes

```prisma
// Add to schema.prisma
@@index([severity, status])
@@index([projectId, createdAt])
```

---

## Type Safety

### Inferred Types

```typescript
import { Bug, Project, User } from '@prisma/client'

const bug: Bug = await prisma.bug.findUnique({ where: { id: bugId } })
```

### With Relations

```typescript
import { Prisma } from '@prisma/client'

type BugWithRelations = Prisma.BugGetPayload<{
  include: {
    assignedTo: true
    project: true
  }
}>

const bug: BugWithRelations = await prisma.bug.findUnique({
  where: { id: bugId },
  include: { assignedTo: true, project: true }
})
```

### Input Types

```typescript
import { Prisma } from '@prisma/client'

function createBug(data: Prisma.BugCreateInput) {
  return prisma.bug.create({ data })
}
```

---

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://user:pass@host:port/db?schema=public"

# Optional (for connection pooling)
DIRECT_URL="postgresql://user:pass@host:5432/db?schema=public"
DATABASE_URL="postgresql://user:pass@host:6543/db?schema=public&pgbouncer=true"
```

---

## Useful Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)

---

## Quick Debug

```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

// Log specific query
const bugs = await prisma.bug.findMany()
console.log('Bugs:', bugs)
```

---

This quick reference should cover 90% of your daily Prisma usage!
