# Charts & Analytics - Quick Start Guide

## Installation

Charts are already included in the project. No additional installation needed.

```bash
# Verify Recharts is installed
npm list recharts
# Should show: recharts@2.10.3
```

## Basic Usage

### 1. Import Charts

```jsx
// Single chart import
import { CommitsLineChart } from '@/components/charts';

// Multiple charts
import {
  CommitsLineChart,
  BugSeverityPieChart,
  ProgressRing
} from '@/components/charts';

// Import utilities
import {
  exportChartAsPNG,
  formatCurrency,
  CHART_COLORS
} from '@/components/charts';
```

### 2. Use in Component

```jsx
import React, { useState, useEffect } from 'react';
import { CommitsLineChart } from '@/components/charts';

function AnalyticsPage() {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/commits')
      .then(r => r.json())
      .then(data => {
        setCommits(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <CommitsLineChart
        commits={commits}
        height={400}
        loading={loading}
      />
    </div>
  );
}
```

## Chart Categories

### Engineering Velocity

```jsx
import {
  CommitsLineChart,
  PRsBarChart,
  ActivityHeatmap
} from '@/components/charts';

// Commits over time
<CommitsLineChart commits={commits} height={400} />

// PR metrics by week
<PRsBarChart pullRequests={prs} height={400} />

// Activity heatmap
<ActivityHeatmap commits={commits} />
```

### Quality Metrics

```jsx
import {
  BugSeverityPieChart,
  BugTrendLine,
  BugAgeHistogram
} from '@/components/charts';

// Bug distribution
<BugSeverityPieChart bugs={bugs} height={400} />

// Bug trend
<BugTrendLine bugs={bugs} height={400} />

// Bug age
<BugAgeHistogram bugs={bugs} height={400} />
```

### Cost & Risk

```jsx
import {
  CostAreaChart,
  RevenueAtRiskBar,
  BurndownChart
} from '@/components/charts';

// Cost trends
<CostAreaChart costData={costs} height={400} />

// Revenue at risk
<RevenueAtRiskBar projects={projects} height={400} />

// Sprint burndown
<BurndownChart
  tasks={tasks}
  sprintStart="2024-01-01"
  sprintEnd="2024-01-14"
  height={400}
/>
```

### Portfolio

```jsx
import {
  ProjectBubbleChart,
  HealthRadarChart,
  CategoryDistribution
} from '@/components/charts';

// Risk vs value
<ProjectBubbleChart projects={projects} height={500} />

// Project health
<HealthRadarChart project={project} height={400} />

// Category distribution
<CategoryDistribution projects={projects} height={400} />
```

### Dashboard Widgets

```jsx
import {
  MiniSparkline,
  ProgressRing,
  ComparisonBar
} from '@/components/charts';

// Trend indicator
<MiniSparkline
  data={data}
  valueKey="count"
  color="#3b82f6"
  height={40}
/>

// Progress circle
<ProgressRing
  completed={75}
  total={100}
  size={120}
  color="auto"
  label="Tasks"
/>

// Comparison
<ComparisonBar
  current={150}
  previous={120}
  label="Active Users"
  format="number"
/>
```

## Data Format

### Commits
```javascript
const commits = [
  {
    date: "2024-01-01",           // ISO date string
    created_at: "2024-01-01T10:00:00Z",
    message: "Fix bug",
    author: "developer@example.com"
  }
];
```

### Pull Requests
```javascript
const pullRequests = [
  {
    created_at: "2024-01-01T10:00:00Z",
    merged_at: "2024-01-02T15:00:00Z",  // null if not merged
    closed_at: "2024-01-02T15:00:00Z",  // null if still open
    title: "Add feature"
  }
];
```

### Bugs
```javascript
const bugs = [
  {
    severity: "critical",          // critical, high, medium, low
    created_at: "2024-01-01T10:00:00Z",
    resolved_at: "2024-01-05T12:00:00Z",  // null if open
    title: "Login fails"
  }
];
```

### Projects
```javascript
const projects = [
  {
    name: "Project Alpha",
    risk_score: 75,               // 0-100
    value_score: 85,              // 0-100
    revenue_impact: 500000,       // dollars
    category: "frontend",
    status: "active",
    // Health metrics
    code_quality_score: 85,
    test_coverage: 75,
    documentation_score: 60,
    security_score: 80,
    performance_score: 90,
    maintainability_score: 70
  }
];
```

### Cost Data
```javascript
const costData = [
  {
    month: "2024-01",
    date: "2024-01-01",
    infrastructure: 50000,
    personnel: 200000,
    tools: 25000
  }
];
```

### Sprint Tasks
```javascript
const tasks = [
  {
    points: 5,
    completed_at: "2024-01-05T12:00:00Z",  // null if not done
    title: "Implement feature"
  }
];
```

## Common Patterns

### With Loading State

```jsx
function ChartComponent({ data }) {
  const [loading, setLoading] = useState(true);

  return (
    <CommitsLineChart
      commits={data}
      loading={loading}
      height={400}
    />
  );
}
```

### With Export

```jsx
import { useRef } from 'react';
import { CommitsLineChart, exportChartAsPNG } from '@/components/charts';

function ChartWithExport({ commits }) {
  const chartRef = useRef(null);

  return (
    <div ref={chartRef}>
      <button onClick={() => exportChartAsPNG(chartRef, 'commits.png')}>
        Export PNG
      </button>
      <CommitsLineChart commits={commits} />
    </div>
  );
}
```

### Grid Layout

```jsx
function DashboardGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CommitsLineChart commits={commits} />
      <PRsBarChart pullRequests={prs} />
      <BugSeverityPieChart bugs={bugs} />
      <CostAreaChart costData={costs} />
    </div>
  );
}
```

### Responsive Cards

```jsx
function ResponsiveCharts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Commits</h3>
        <MiniSparkline data={commits} />
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Progress</h3>
        <ProgressRing completed={75} total={100} />
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Comparison</h3>
        <ComparisonBar current={150} previous={120} />
      </div>
    </div>
  );
}
```

## Customization

### Custom Colors

```jsx
import { CHART_COLORS } from '@/components/charts';

// Use predefined colors
<MiniSparkline data={data} color={CHART_COLORS.primary[0]} />

// Or custom color
<MiniSparkline data={data} color="#FF5733" />
```

### Custom Height

```jsx
// Small chart
<CommitsLineChart commits={commits} height={300} />

// Large chart
<CommitsLineChart commits={commits} height={600} />
```

### Hide Features

```jsx
// Hide trend indicator
<MiniSparkline data={data} showTrend={false} />

// Hide legend
<HealthRadarChart project={project} showLegend={false} />

// Hide category list
<CategoryDistribution projects={projects} showList={false} />
```

## Styling

All charts use Tailwind CSS classes. Customize with className:

```jsx
<div className="bg-gray-50 p-6 rounded-xl">
  <CommitsLineChart commits={commits} />
</div>
```

## Error Handling

```jsx
function SafeChart({ commits }) {
  if (!commits || commits.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return <CommitsLineChart commits={commits} />;
}
```

## Performance Tips

### 1. Lazy Loading

```jsx
import { lazy, Suspense } from 'react';
import { ChartLoadingSkeleton } from '@/components/charts';

const CommitsLineChart = lazy(() =>
  import('@/components/charts').then(m => ({ default: m.CommitsLineChart }))
);

function LazyChart({ commits }) {
  return (
    <Suspense fallback={<ChartLoadingSkeleton height={400} />}>
      <CommitsLineChart commits={commits} />
    </Suspense>
  );
}
```

### 2. Data Sampling

```jsx
// Limit to last 100 data points
const recentCommits = commits.slice(-100);

<CommitsLineChart commits={recentCommits} />
```

### 3. Memoization

```jsx
import { useMemo } from 'react';

function MemoizedChart({ commits }) {
  const chartData = useMemo(
    () => commits.slice(-100),
    [commits]
  );

  return <CommitsLineChart commits={chartData} />;
}
```

## Common Issues

### Issue: Chart not rendering
**Solution**: Ensure data is in correct format with required fields

```jsx
// Correct
const commits = [{ date: "2024-01-01", created_at: "..." }];

// Incorrect
const commits = [{ timestamp: "2024-01-01" }];  // Missing 'date' or 'created_at'
```

### Issue: Loading state stuck
**Solution**: Set loading to false after data fetch

```jsx
useEffect(() => {
  setLoading(true);
  fetch('/api/commits')
    .then(r => r.json())
    .then(data => setCommits(data))
    .finally(() => setLoading(false));  // Always set to false
}, []);
```

### Issue: Export not working
**Solution**: Ensure ref is attached to container

```jsx
// Correct
const chartRef = useRef(null);
<div ref={chartRef}>
  <CommitsLineChart ... />
</div>

// Incorrect
<CommitsLineChart ref={chartRef} ... />  // Ref on wrong element
```

## Next Steps

1. Review [CHARTS_DOCUMENTATION.md](./CHARTS_DOCUMENTATION.md) for complete API
2. Check [CHARTS_ANALYTICS_SUMMARY.md](./CHARTS_ANALYTICS_SUMMARY.md) for implementation details
3. Explore examples in existing components
4. Customize colors and themes
5. Add your own data sources

## Support

For issues or questions:
1. Check data format requirements
2. Verify prop types
3. Review console for errors
4. Test with sample data

## Examples Repository

See complete examples in:
- `/frontend/src/components/DashboardOverview.jsx`
- `/frontend/src/components/AnalyticsCharts.jsx`
- `/frontend/src/pages/AnalyticsPage.jsx` (if exists)
