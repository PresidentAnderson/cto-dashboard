# Database API Reference - CTO Dashboard v2.0

## Overview
Quick reference guide for all database utility functions provided by `lib/db-utils.ts`.

## Import

```typescript
import {
  // Type definitions
  DateRange,
  ProjectWithBugs,
  BugWithRelations,
  DailyMetrics,
  SyncStatus,

  // Project queries
  getProjectWithBugs,
  getActiveProjectsWithStats,
  getPortfolioOverview,

  // Bug queries
  getBugsWithFilters,
  getCriticalBugs,
  getBugStatistics,

  // Metrics queries
  getDailyMetrics,
  getMonthlyMetrics,
  getEngineeringMetrics,

  // Sync queries
  getSyncStatus,
  getImportHistory,

  // Search functions
  searchProjects,
  searchBugs,

  // User queries
  getUserWorkload,
  getTeamPerformance,

  // Utility functions
  checkDatabaseHealth,
  getDatabaseStatistics,
} from '@/lib/db-utils'
```

## Type Definitions

### DateRange
```typescript
type DateRange = {
  startDate: Date
  endDate: Date
}
```

### ProjectWithBugs
```typescript
type ProjectWithBugs = Project & {
  bugs: (Bug & {
    assignedTo: User | null
  })[]
  metrics: ProjectMetric[]
}
```

### SyncStatus
```typescript
type SyncStatus = {
  lastSync: Date | null
  status: string
  recordsImported: number
  recordsFailed: number
  errors: string[]
}
```

## Project Queries

### getProjectWithBugs()

Get a single project with all its bugs and metrics.

```typescript
async function getProjectWithBugs(
  projectId: string
): Promise<ProjectWithBugs | null>
```

**Parameters:**
- `projectId` - UUID of the project

**Returns:**
- Project object with bugs (sorted by creation date) and metrics (last 30 days)
- `null` if project not found

**Example:**
```typescript
const project = await getProjectWithBugs('uuid-here')
if (project) {
  console.log(`${project.name} has ${project.bugs.length} bugs`)
}
```

---

### getActiveProjectsWithStats()

Get all active projects with bug counts and health metrics.

```typescript
async function getActiveProjectsWithStats()
```

**Returns:**
- Array of projects with:
  - All project fields
  - `bugStats`: Breakdown by severity
  - `latestMetrics`: Most recent health metrics

**Example:**
```typescript
const projects = await getActiveProjectsWithStats()

projects.forEach(project => {
  console.log(`${project.name}: ${project.bugStats.critical} critical bugs`)
})
```

---

### getPortfolioOverview()

Get portfolio-wide statistics and financial metrics.

```typescript
async function getPortfolioOverview()
```

**Returns:**
```typescript
{
  totalProjects: number
  activeProjects: number
  shippedProjects: number
  totalYear3Revenue: number
  totalDcfValuation: number
  totalMonthlyInfra: number
  latestSnapshot: PortfolioMetric | null
  projects: Project[]
}
```

**Example:**
```typescript
const portfolio = await getPortfolioOverview()
console.log(`Total portfolio value: $${portfolio.totalDcfValuation}`)
```

## Bug Queries

### getBugsWithFilters()

Get bugs with filtering and pagination.

```typescript
async function getBugsWithFilters(
  filters?: {
    severity?: BugSeverity
    status?: BugStatus
    projectId?: string
    assignedToId?: string
  },
  pagination?: {
    page?: number
    limit?: number
  }
)
```

**Parameters:**
- `filters` (optional):
  - `severity`: 'critical' | 'high' | 'medium' | 'low'
  - `status`: 'pending' | 'in_progress' | 'verified' | 'shipped' | 'closed' | 'deferred'
  - `projectId`: Filter by project UUID
  - `assignedToId`: Filter by assignee UUID

- `pagination` (optional):
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 50)

**Returns:**
```typescript
{
  bugs: Bug[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

**Example:**
```typescript
// Get critical bugs for a project
const { bugs, pagination } = await getBugsWithFilters(
  {
    severity: 'critical',
    projectId: 'project-uuid',
  },
  { page: 1, limit: 20 }
)

console.log(`Page ${pagination.page} of ${pagination.totalPages}`)
```

---

### getCriticalBugs()

Get all critical bugs with SLA information.

```typescript
async function getCriticalBugs()
```

**Returns:**
- Array of critical bugs with:
  - All bug fields
  - `hoursSinceCreated`: Time since bug creation
  - `hoursUntilSla`: Time remaining until SLA breach
  - `isSlaBreached`: Boolean indicating SLA status

**Example:**
```typescript
const criticalBugs = await getCriticalBugs()

const breached = criticalBugs.filter(bug => bug.isSlaBreached)
console.log(`${breached.length} bugs have breached SLA`)
```

---

### getBugStatistics()

Get aggregated bug statistics.

```typescript
async function getBugStatistics()
```

**Returns:**
```typescript
{
  total: number
  bySeverity: {
    critical: number
    high: number
    medium: number
    low: number
  }
  byStatus: {
    pending: number
    inProgress: number
  }
  blockers: number
}
```

**Example:**
```typescript
const stats = await getBugStatistics()
console.log(`${stats.bySeverity.critical} critical bugs`)
console.log(`${stats.blockers} active blockers`)
```

## Metrics Queries

### getDailyMetrics()

Get daily metrics for a project within a date range.

```typescript
async function getDailyMetrics(
  projectId: string,
  dateRange: DateRange
): Promise<DailyMetrics[]>
```

**Parameters:**
- `projectId`: Project UUID
- `dateRange`: Start and end dates

**Returns:**
- Array of daily metrics with commits, bugs, hours, etc.

**Example:**
```typescript
const metrics = await getDailyMetrics('project-uuid', {
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30'),
})
```

---

### getMonthlyMetrics()

Get monthly metrics for trend analysis.

```typescript
async function getMonthlyMetrics(months?: number)
```

**Parameters:**
- `months`: Number of months to retrieve (default: 12)

**Returns:**
- Array of monthly metrics in ascending order

**Example:**
```typescript
// Get last 6 months
const metrics = await getMonthlyMetrics(6)

metrics.forEach(month => {
  console.log(`${month.month}: ${month.totalBugs} bugs`)
})
```

---

### getEngineeringMetrics()

Get engineering efficiency metrics.

```typescript
async function getEngineeringMetrics()
```

**Returns:**
```typescript
{
  totalBugs: number
  resolvedBugs: number
  resolutionRate: number
  totalEstimatedHours: number
  totalActualHours: number
  avgResolutionTime: number
  estimationAccuracy: number | null
}
```

**Example:**
```typescript
const metrics = await getEngineeringMetrics()
console.log(`Resolution rate: ${metrics.resolutionRate}%`)
console.log(`Estimation accuracy: ${metrics.estimationAccuracy}%`)
```

## Sync & Import Queries

### getSyncStatus()

Get the status of the last sync operation.

```typescript
async function getSyncStatus(): Promise<SyncStatus>
```

**Returns:**
- Sync status with timestamp, counts, and errors

**Example:**
```typescript
const status = await getSyncStatus()

if (status.status === 'completed_with_errors') {
  console.log('Errors:', status.errors)
}
```

---

### getImportHistory()

Get import history with filtering.

```typescript
async function getImportHistory(
  limit?: number,
  source?: 'csv' | 'github' | 'manual'
)
```

**Parameters:**
- `limit`: Number of records (default: 10)
- `source`: Filter by import source (optional)

**Returns:**
- Array of import logs

**Example:**
```typescript
// Get last 5 GitHub imports
const imports = await getImportHistory(5, 'github')
```

## Search Functions

### searchProjects()

Search projects by name, description, or tags.

```typescript
async function searchProjects(query: string)
```

**Parameters:**
- `query`: Search term (case-insensitive)

**Returns:**
- Array of matching projects with bug counts

**Example:**
```typescript
const projects = await searchProjects('analytics')
```

---

### searchBugs()

Search bugs by title, description, or bug number.

```typescript
async function searchBugs(query: string)
```

**Parameters:**
- `query`: Search term (case-insensitive)

**Returns:**
- Array of matching bugs (max 50)

**Example:**
```typescript
const bugs = await searchBugs('payment')
```

## User & Team Queries

### getUserWorkload()

Get workload statistics for a user.

```typescript
async function getUserWorkload(userId: string)
```

**Parameters:**
- `userId`: User UUID

**Returns:**
```typescript
{
  user: User
  assignedBugs: Bug[]
  totalBugs: number
  totalEstimatedHours: number
  criticalBugs: number
  highBugs: number
}
```

**Example:**
```typescript
const workload = await getUserWorkload('user-uuid')
console.log(`${workload.user.name} has ${workload.totalBugs} bugs`)
console.log(`Estimated time: ${workload.totalEstimatedHours} hours`)
```

---

### getTeamPerformance()

Get performance statistics for all team members.

```typescript
async function getTeamPerformance()
```

**Returns:**
- Array of users with bug counts and hours

**Example:**
```typescript
const team = await getTeamPerformance()

team.forEach(member => {
  console.log(`${member.name}: ${member.activeBugs} active bugs`)
})
```

## Utility Functions

### checkDatabaseHealth()

Check database connection health.

```typescript
async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  latency: number
  error?: string
}>
```

**Example:**
```typescript
const health = await checkDatabaseHealth()

if (!health.isHealthy) {
  console.error('Database error:', health.error)
}
```

---

### getDatabaseStatistics()

Get counts for all tables.

```typescript
async function getDatabaseStatistics()
```

**Returns:**
```typescript
{
  projects: number
  bugs: number
  users: number
  metrics: number
  importLogs: number
}
```

**Example:**
```typescript
const stats = await getDatabaseStatistics()
console.log(`Database contains ${stats.bugs} bugs`)
```

## Prisma Client Functions

Import from `lib/prisma.ts`:

```typescript
import { prisma, testConnection, executeTransaction } from '@/lib/prisma'
```

### testConnection()

Test database connection.

```typescript
async function testConnection(): Promise<{
  success: boolean
  latency: number
  error?: string
}>
```

---

### executeTransaction()

Execute operations within a transaction with retry logic.

```typescript
async function executeTransaction<T>(
  callback: (tx) => Promise<T>,
  maxRetries?: number
): Promise<T>
```

**Example:**
```typescript
const result = await executeTransaction(async (tx) => {
  const bug = await tx.bug.create({
    data: { /* ... */ }
  })

  await tx.bugHistory.create({
    data: { bugId: bug.id, /* ... */ }
  })

  return bug
}, 3) // Retry up to 3 times
```

## Error Handling

All functions throw errors on failure. Always wrap in try-catch:

```typescript
try {
  const project = await getProjectWithBugs(projectId)
} catch (error) {
  console.error('Database error:', error)
  // Handle error appropriately
}
```

## Performance Tips

1. **Use selective includes** to fetch only needed data
2. **Implement pagination** for large datasets
3. **Leverage utility functions** for optimized queries
4. **Use transactions** for related operations
5. **Monitor slow queries** in development logs

## Example: Building a Dashboard

```typescript
// Get comprehensive dashboard data
async function getDashboardData() {
  const [
    portfolio,
    criticalBugs,
    bugStats,
    engineeringMetrics,
    syncStatus,
  ] = await Promise.all([
    getPortfolioOverview(),
    getCriticalBugs(),
    getBugStatistics(),
    getEngineeringMetrics(),
    getSyncStatus(),
  ])

  return {
    portfolio,
    criticalBugs,
    bugStats,
    engineeringMetrics,
    syncStatus,
  }
}
```

## Testing

Run the test suite:

```bash
npm run db:test
```

This validates all utility functions and database connectivity.

---

**Last Updated**: November 24, 2024
**Version**: 2.0.0
