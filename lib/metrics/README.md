# Metrics Engine for CTO Dashboard v2.0

**Analytics engine that transforms raw data into CEO-grade KPIs and insights.**

## Overview

The Metrics Engine is a comprehensive analytics system designed to calculate, aggregate, and present critical engineering metrics. It provides real-time KPIs, trend analysis, risk scoring, and cost calculations to support executive decision-making.

## Features

- **Core Metrics Calculation**: Bug costs, engineering effort, revenue at risk, velocity, and risk scoring
- **Daily Metrics Builder**: Materialized view pattern for efficient historical queries
- **Dashboard KPIs**: High-level metrics with intelligent caching
- **Trend Analysis**: Time-series analysis for bugs, commits, costs, and velocity
- **Risk Scoring**: Weighted model for project risk assessment (0-100 scale)
- **Performance Optimized**: In-memory caching, optimized Prisma queries, parallel execution

## Architecture

```
lib/metrics/
├── index.ts              # Main export file
├── config.ts             # Configuration and settings
├── types.ts              # TypeScript type definitions
├── cache.ts              # In-memory caching layer
├── calculator.ts         # Core calculation functions
├── daily-metrics.ts      # Daily metrics aggregation
├── dashboard-kpis.ts     # Dashboard KPI queries
├── risk-scorer.ts        # Project risk scoring
└── trends.ts             # Trend analysis
```

## Quick Start

```typescript
import {
  getDashboardKPIs,
  calculateBugCost,
  getBugTrends,
  getTopRiskyProjects,
} from '@/lib/metrics';

// Get all dashboard KPIs in one call
const kpis = await getDashboardKPIs();

// Calculate bug costs
const bugs = await prisma.bug.findMany({ /* ... */ });
const costs = calculateBugCost(bugs);

// Get bug trends for last 30 days
const trends = await getBugTrends({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
});

// Get top 10 risky projects
const riskyProjects = await getTopRiskyProjects(10);
```

## Core Modules

### 1. Calculator (`calculator.ts`)

Fundamental calculation functions for all metrics.

#### `calculateBugCost(bugs)`

Calculate monetary cost for bugs based on actual hours spent.

**Formula**: `monetary_cost = Σ(actual_hours × hourly_rate × severity_multiplier)`

**Example**:
```typescript
const bugs = await prisma.bug.findMany({
  where: { actualHours: { not: null } },
});

const costs = calculateBugCost(bugs);
// Returns: BugCost[]
// {
//   bugId: "uuid",
//   bugNumber: "BUG-123",
//   severity: "critical",
//   actualHours: 8,
//   hourlyRate: 150,
//   monetaryCost: 3600, // 8 × 150 × 3.0 (critical multiplier)
//   severityMultiplier: 3.0
// }
```

#### `calculateEngineeringEffort(activities)`

Calculate total engineering effort from tracked hours and inferred from commits.

**Formula**: `total_hours = tracked_hours + (commits × avg_hours_per_commit)`

**Example**:
```typescript
const activities = [
  { type: 'bug', hours: 10, timestamp: new Date() },
  { type: 'commit', commits: 5, timestamp: new Date() },
];

const effort = calculateEngineeringEffort(activities);
// Returns: EngineeringEffort
// {
//   totalHours: 20,      // 10 tracked + (5 × 2 inferred)
//   trackedHours: 10,
//   inferredHours: 10,
//   commitCount: 5,
//   averageHoursPerCommit: 2
// }
```

#### `calculateRevenueAtRisk(criticalBugs)`

Calculate revenue at risk from critical and blocker bugs.

**Formula**: `revenue_at_risk = Σ(daily_impact × projection_days × blocker_multiplier)`

**Example**:
```typescript
const criticalBugs = await prisma.bug.findMany({
  where: { severity: 'critical', revenueImpact: { not: null } },
  include: { project: true },
});

const risk = calculateRevenueAtRisk(criticalBugs);
// Returns: RevenueAtRisk
// {
//   totalDailyLoss: 5000,
//   projectedMonthlyLoss: 150000,
//   projectedAnnualLoss: 1825000,
//   criticalBugCount: 3,
//   blockerCount: 1,
//   affectedProjects: ["Project A", "Project B"]
// }
```

#### `calculateVelocity(projectId, lookbackDays?)`

Calculate velocity metrics for a project.

**Example**:
```typescript
const velocity = await calculateVelocity('project-uuid', 30);
// Returns: VelocityMetrics
// {
//   averageCycleTime: 48,        // hours
//   deploymentFrequency: 3.2,    // per week
//   commitVelocity: 5.5,         // per day
//   bugResolutionRate: 8.5,      // per week
//   period: { start: Date, end: Date }
// }
```

#### `calculateProjectRiskScore(project)`

Calculate project risk score (0-100) using weighted model.

**Factors**:
- Critical bugs (40%)
- Stalled PRs (25%)
- Low activity (20%)
- Overdue milestones (15%)

**Example**:
```typescript
const projectData = {
  id: 'uuid',
  name: 'Project X',
  status: 'active',
  criticalBugCount: 3,
  stalledPRCount: 2,
  lastCommitDate: new Date('2025-10-01'),
  currentMilestone: 2,
  totalMilestones: 5,
  lastActivityDate: new Date('2025-11-01'),
};

const riskScore = calculateProjectRiskScore(projectData);
// Returns: ProjectRiskScore
// {
//   projectId: 'uuid',
//   projectName: 'Project X',
//   overallScore: 65,
//   components: {
//     criticalBugsScore: 60,
//     stalledPRsScore: 20,
//     lowActivityScore: 40,
//     overdueMilestonesScore: 50
//   },
//   riskLevel: 'high'
// }
```

### 2. Daily Metrics (`daily-metrics.ts`)

Build and persist daily metrics snapshots (materialized view pattern).

#### `buildDailyMetrics(date?)`

Build daily metrics for a specific date.

**Aggregates**:
- Bugs opened/closed
- Commits count
- PRs opened/merged
- Hours spent
- Revenue at risk
- Active projects

**Example**:
```typescript
// Build metrics for today
const metrics = await buildDailyMetrics();

// Build metrics for specific date
const historicalMetrics = await buildDailyMetrics(new Date('2025-11-01'));

// Returns: DailyMetrics
// {
//   date: Date,
//   bugsOpened: 5,
//   bugsClosed: 3,
//   commitsCount: 42,
//   prsOpened: 2,
//   prsMerged: 1,
//   hoursSpent: 25.5,
//   revenueAtRisk: 5000,
//   activeProjects: 12,
//   criticalBugs: 3
// }
```

#### `backfillDailyMetrics(days)`

Backfill daily metrics for historical data.

**Example**:
```typescript
// Backfill last 30 days
await backfillDailyMetrics(30);
```

### 3. Dashboard KPIs (`dashboard-kpis.ts`)

High-level KPIs for CEO-grade dashboard with 5-minute caching.

#### `getDashboardKPIs()`

Get all dashboard KPIs in one optimized call.

**Example**:
```typescript
const kpis = await getDashboardKPIs();
// Returns: DashboardKPIs
// {
//   totalProjects: 25,
//   activeProjects: 18,
//   activeBugs: 47,
//   criticalBugs: 5,
//   totalEngineeringHours: 1250.5,
//   revenueAtRisk: 12500,
//   averageVelocity: 72.5,
//   topRiskyProjects: ProjectRiskScore[],
//   lastUpdated: Date
// }
```

#### Individual KPI Functions

```typescript
// Get specific KPIs
const totalProjects = await getTotalProjects();
const activeBugs = await getActiveBugs();
const criticalBugs = await getCriticalBugs();
const totalHours = await getTotalEngineeringHours();
const revenueRisk = await getRevenueAtRisk();
const avgVelocity = await getAverageVelocity();
```

#### `getProjectKPIs(projectId)`

Get KPIs for a specific project.

**Example**:
```typescript
const projectKPIs = await getProjectKPIs('project-uuid');
// Returns project-specific metrics
```

### 4. Risk Scoring (`risk-scorer.ts`)

Project risk assessment with configurable weighted model.

#### `getTopRiskyProjects(limit?)`

Get top N risky projects.

**Example**:
```typescript
const topRisky = await getTopRiskyProjects(10);
// Returns: ProjectRiskScore[]
```

#### `getRiskAlerts()`

Get projects requiring immediate attention.

**Example**:
```typescript
const alerts = await getRiskAlerts();
// Returns: Array<{ project, alerts, severity }>
// [
//   {
//     project: ProjectRiskScore,
//     alerts: [
//       "80% critical bugs severity",
//       "Project appears stalled (no recent activity)"
//     ],
//     severity: 'critical'
//   }
// ]
```

#### `getPortfolioRiskMetrics()`

Get aggregate risk metrics across all projects.

**Example**:
```typescript
const portfolioRisk = await getPortfolioRiskMetrics();
// Returns:
// {
//   averageRiskScore: 45,
//   medianRiskScore: 40,
//   highRiskCount: 3,
//   criticalRiskCount: 1,
//   totalProjects: 18,
//   riskTrend: 'stable'
// }
```

### 5. Trend Analysis (`trends.ts`)

Time-series analysis for charts and insights.

#### `getBugTrends(dateRange)`

Get bug creation vs resolution trends.

**Example**:
```typescript
const bugTrends = await getBugTrends({
  start: new Date('2025-10-01'),
  end: new Date('2025-11-24'),
});

// Returns: BugTrends
// {
//   creationTrend: TrendDataPoint[],
//   resolutionTrend: TrendDataPoint[],
//   netChange: TrendDataPoint[],
//   averageResolutionTime: 3.5, // days
//   period: { start, end }
// }
```

#### `getCommitTrends(dateRange)`

Get commit activity over time.

**Example**:
```typescript
const commitTrends = await getCommitTrends({
  start: new Date('2025-10-01'),
  end: new Date('2025-11-24'),
});

// Returns: CommitTrends
// {
//   commitActivity: TrendDataPoint[],
//   contributorActivity: TrendDataPoint[],
//   averageCommitsPerDay: 15.5,
//   mostActiveDay: 'Wednesday',
//   period: { start, end }
// }
```

#### `getCostTrends(dateRange)`

Get spending patterns over time.

**Example**:
```typescript
const costTrends = await getCostTrends({
  start: new Date('2025-01-01'),
  end: new Date('2025-11-24'),
});

// Returns: CostTrends
// {
//   spendingByMonth: TrendDataPoint[],
//   cumulativeSpending: TrendDataPoint[],
//   bugCostBreakdown: {
//     critical: 50000,
//     high: 30000,
//     medium: 15000,
//     low: 5000
//   },
//   totalCost: 100000,
//   period: { start, end }
// }
```

#### `getVelocityTrends(dateRange)`

Get velocity metrics over time.

**Example**:
```typescript
const velocityTrends = await getVelocityTrends({
  start: new Date('2025-10-01'),
  end: new Date('2025-11-24'),
});

// Returns: VelocityTrends
// {
//   cycleTimeTrend: TrendDataPoint[],
//   deploymentFrequencyTrend: TrendDataPoint[],
//   throughputTrend: TrendDataPoint[],
//   averageVelocity: 5.5,
//   period: { start, end }
// }
```

## Configuration

Configure the metrics engine via `config.ts` or environment variables.

### Environment Variables

```bash
# Standard engineering hourly rate
METRICS_HOURLY_RATE=150
```

### Programmatic Configuration

```typescript
import { getConfig, defaultConfig } from '@/lib/metrics';

const config = getConfig();
console.log(config.hourlyRate); // 150

// Modify risk weights (must sum to 100)
defaultConfig.riskWeights = {
  criticalBugs: 50,
  stalledPRs: 20,
  lowActivity: 20,
  overdueMilestones: 10,
};
```

### Configuration Options

```typescript
interface MetricsConfig {
  // Standard hourly rate
  hourlyRate: number; // Default: 150

  // Risk scoring weights (must sum to 100)
  riskWeights: {
    criticalBugs: number;      // Default: 40
    stalledPRs: number;        // Default: 25
    lowActivity: number;       // Default: 20
    overdueMilestones: number; // Default: 15
  };

  // Cache TTL in milliseconds
  cacheTTL: number; // Default: 5 minutes

  // Velocity calculation parameters
  velocity: {
    lookbackDays: number;            // Default: 30
    minimumCommitsThreshold: number; // Default: 5
  };

  // Bug cost multipliers by severity
  bugCost: {
    criticalMultiplier: number; // Default: 3.0
    highMultiplier: number;     // Default: 2.0
    mediumMultiplier: number;   // Default: 1.0
    lowMultiplier: number;      // Default: 0.5
  };

  // Revenue at risk calculation
  revenueRisk: {
    projectionDays: number;     // Default: 30
    blockerMultiplier: number;  // Default: 2.0
  };
}
```

## Caching

The metrics engine includes an in-memory cache for hot-path queries.

### Using the Cache

```typescript
import { withCache, generateCacheKey, metricsCache } from '@/lib/metrics';

// Wrap expensive operations with caching
const result = await withCache(
  'my-expensive-query',
  async () => {
    // Expensive operation here
    return await prisma.bug.findMany({ /* ... */ });
  },
  60000 // Optional: 1 minute TTL (default: 5 minutes)
);

// Generate cache keys
const key = generateCacheKey('kpi', 'total-projects');

// Manually interact with cache
metricsCache.set('key', data, 60000);
const cached = metricsCache.get('key');
metricsCache.delete('key');
metricsCache.clear();

// Get cache statistics
const stats = metricsCache.getStats();
// { totalEntries: 25, validEntries: 22, expiredEntries: 3 }
```

### Cache Invalidation

```typescript
import { invalidateByPrefix } from '@/lib/metrics';

// Invalidate all KPI caches
invalidateByPrefix('kpi');

// Invalidate all risk caches
invalidateByPrefix('risk');

// Invalidate all trend caches
invalidateByPrefix('trends');
```

## Performance Optimizations

1. **Parallel Execution**: KPI functions execute queries in parallel
2. **In-Memory Caching**: 5-minute cache for frequently accessed data
3. **Optimized Queries**: Prisma queries use proper indexes and projections
4. **Materialized Views**: Daily metrics pattern for historical queries
5. **Batch Operations**: Metrics calculated in batches where possible

### Performance Tips

```typescript
// ✅ Good: Fetch all KPIs in one call
const kpis = await getDashboardKPIs();

// ❌ Bad: Fetch KPIs individually
const totalProjects = await getTotalProjects();
const activeBugs = await getActiveBugs();
// ... etc

// ✅ Good: Use date range queries efficiently
const trends = await getAllTrends(dateRange);

// ✅ Good: Use caching for repeated queries
const result = await withCache('key', expensiveQuery);
```

## Integration Examples

### Server Actions

```typescript
// app/actions/metrics.ts
'use server';

import { getDashboardKPIs, getTopRiskyProjects } from '@/lib/metrics';

export async function fetchDashboardData() {
  const [kpis, riskyProjects] = await Promise.all([
    getDashboardKPIs(),
    getTopRiskyProjects(5),
  ]);

  return { kpis, riskyProjects };
}
```

### API Routes

```typescript
// app/api/metrics/kpis/route.ts
import { NextResponse } from 'next/server';
import { getDashboardKPIs } from '@/lib/metrics';

export async function GET() {
  try {
    const kpis = await getDashboardKPIs();
    return NextResponse.json(kpis);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}
```

### Cron Jobs

```typescript
// cron/daily-metrics.ts
import { backfillDailyMetrics } from '@/lib/metrics';

export async function handler() {
  console.log('Starting daily metrics backfill...');
  await backfillDailyMetrics(1); // Backfill yesterday
  console.log('Daily metrics backfill complete');
}
```

## Testing

```typescript
// Example unit test
import { calculateBugCost } from '@/lib/metrics';
import { Bug } from '@prisma/client';

describe('calculateBugCost', () => {
  it('should calculate cost with severity multiplier', () => {
    const bugs: Bug[] = [
      {
        id: 'uuid',
        bugNumber: 'BUG-123',
        severity: 'critical',
        actualHours: new Decimal(8),
        // ... other fields
      },
    ];

    const costs = calculateBugCost(bugs);

    expect(costs).toHaveLength(1);
    expect(costs[0].monetaryCost).toBe(3600); // 8 × 150 × 3.0
    expect(costs[0].severityMultiplier).toBe(3.0);
  });
});
```

## Contributing

When adding new metrics:

1. Add types to `types.ts`
2. Implement calculation logic in appropriate module
3. Add caching where beneficial
4. Update exports in `index.ts`
5. Document in this README

## License

Part of CTO Dashboard v2.0
