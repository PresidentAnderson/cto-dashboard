# Charts & Analytics Layer Documentation

## Overview

The Charts & Analytics Layer provides executive-grade data visualizations for CTO Dashboard v2.0. Built with Recharts, all components are fully responsive, interactive, and optimized for performance.

## Architecture

```
frontend/src/
├── components/charts/          # Chart components
│   ├── CommitsLineChart.jsx    # Engineering velocity
│   ├── PRsBarChart.jsx
│   ├── ActivityHeatmap.jsx
│   ├── BugSeverityPieChart.jsx # Quality metrics
│   ├── BugTrendLine.jsx
│   ├── BugAgeHistogram.jsx
│   ├── CostAreaChart.jsx       # Cost & risk
│   ├── RevenueAtRiskBar.jsx
│   ├── BurndownChart.jsx
│   ├── ProjectBubbleChart.jsx  # Portfolio
│   ├── HealthRadarChart.jsx
│   ├── CategoryDistribution.jsx
│   ├── MiniSparkline.jsx       # Dashboard widgets
│   ├── ProgressRing.jsx
│   ├── ComparisonBar.jsx
│   ├── ChartUtils.jsx          # Shared utilities
│   └── index.js
└── lib/
    └── chart-data-transformers.js  # Data transformation
```

## Chart Categories

### 1. Engineering Velocity Charts

Track team productivity and code activity.

#### CommitsLineChart
```jsx
import { CommitsLineChart } from '@/components/charts';

<CommitsLineChart
  commits={commits}         // Array of commit objects
  height={400}             // Chart height in pixels
  showTrendline={true}     // Show trend analysis
  loading={false}          // Loading state
/>
```

**Features:**
- 30-day commit trend
- Average, total, and peak statistics
- Smooth animations (300ms)
- Interactive tooltips
- PNG export

#### PRsBarChart
```jsx
import { PRsBarChart } from '@/components/charts';

<PRsBarChart
  pullRequests={prs}       // Array of PR objects
  height={400}
  loading={false}
/>
```

**Features:**
- Weekly PR metrics (opened, merged, closed)
- Merge rate calculation
- Multi-colored bars by status
- 12-week history

#### ActivityHeatmap
```jsx
import { ActivityHeatmap } from '@/components/charts';

<ActivityHeatmap
  commits={commits}
  loading={false}
/>
```

**Features:**
- Calendar-style heatmap
- Day of week × hour visualization
- Color intensity based on activity
- Busiest day/hour identification

### 2. Quality Metrics Charts

Monitor bug health and resolution patterns.

#### BugSeverityPieChart
```jsx
import { BugSeverityPieChart } from '@/components/charts';

<BugSeverityPieChart
  bugs={bugs}              // Array of bug objects
  height={400}
  loading={false}
/>
```

**Features:**
- Interactive pie with hover effects
- Severity breakdown (critical, high, medium, low)
- Color-coded by severity
- Active shape highlighting

#### BugTrendLine
```jsx
import { BugTrendLine } from '@/components/charts';

<BugTrendLine
  bugs={bugs}
  height={400}
  loading={false}
/>
```

**Features:**
- Creation vs resolution tracking
- Net change calculation
- Resolution rate percentage
- 30-day trend analysis

#### BugAgeHistogram
```jsx
import { BugAgeHistogram } from '@/components/charts';

<BugAgeHistogram
  bugs={bugs}
  height={400}
  loading={false}
/>
```

**Features:**
- Age distribution (0-7, 8-14, 15-30, 31-60, 61-90, 90+ days)
- Stale bug identification
- Color gradient (green to red)
- Priority alerts

### 3. Cost & Risk Charts

Track financial impact and project risks.

#### CostAreaChart
```jsx
import { CostAreaChart } from '@/components/charts';

<CostAreaChart
  costData={costData}      // Array of monthly cost objects
  height={400}
  loading={false}
/>
```

**Features:**
- Stacked area chart
- Three cost categories (infrastructure, personnel, tools)
- Month-over-month comparison
- Currency formatting

#### RevenueAtRiskBar
```jsx
import { RevenueAtRiskBar } from '@/components/charts';

<RevenueAtRiskBar
  projects={projects}
  height={400}
  loading={false}
/>
```

**Features:**
- Top 10 projects by revenue impact
- Risk-based color coding
- High-priority project alerts
- Horizontal bar layout

#### BurndownChart
```jsx
import { BurndownChart } from '@/components/charts';

<BurndownChart
  tasks={tasks}
  sprintStart="2024-01-01"
  sprintEnd="2024-01-14"
  height={400}
  loading={false}
/>
```

**Features:**
- Ideal vs actual burndown
- Velocity tracking
- On-track status indicator
- Sprint completion percentage

### 4. Portfolio Charts

Visualize project portfolio and health.

#### ProjectBubbleChart
```jsx
import { ProjectBubbleChart } from '@/components/charts';

<ProjectBubbleChart
  projects={projects}
  height={500}
  loading={false}
/>
```

**Features:**
- Risk vs value scatter plot
- Bubble size = project scope
- Quadrant analysis (quick wins, strategic, fill-ins, money pits)
- Category color coding

#### HealthRadarChart
```jsx
import { HealthRadarChart } from '@/components/charts';

<HealthRadarChart
  project={project}
  height={400}
  loading={false}
  compareProjects={[]}     // Optional: compare multiple projects
/>
```

**Features:**
- 6-dimensional health metrics
- Overall health score
- Detailed metric breakdown
- Comparison mode
- Recommendations

#### CategoryDistribution
```jsx
import { CategoryDistribution } from '@/components/charts';

<CategoryDistribution
  projects={projects}
  height={400}
  loading={false}
  showList={true}
/>
```

**Features:**
- Pie chart with percentage labels
- Category breakdown list
- Progress bars
- Portfolio insights

### 5. Dashboard Overview Components

Compact widgets for dashboard summary views.

#### MiniSparkline
```jsx
import { MiniSparkline } from '@/components/charts';

<MiniSparkline
  data={data}
  valueKey="value"
  color="#3b82f6"
  height={40}
  showTrend={true}
/>
```

**Features:**
- Inline trend indicator
- Automatic trend calculation
- Compact design (40px height)
- Percentage change display

#### ProgressRing
```jsx
import { ProgressRing } from '@/components/charts';

<ProgressRing
  completed={75}
  total={100}
  size={120}
  strokeWidth={12}
  color="auto"             // Auto color or custom
  showPercentage={true}
  showLabel={true}
  label="Completion"
/>
```

**Features:**
- Circular progress indicator
- Auto color based on percentage
- Smooth animations
- Center percentage display

#### ComparisonBar
```jsx
import { ComparisonBar } from '@/components/charts';

<ComparisonBar
  current={150}
  previous={120}
  label="Active Users"
  format="number"          // 'number', 'currency', 'percentage'
  showBar={true}
  barColor="#3b82f6"
/>
```

**Features:**
- Side-by-side comparison
- Trend indicator (up/down/stable)
- Multiple format support
- Change percentage

## Data Transformation

All chart components use data transformers from `lib/chart-data-transformers.js`:

```javascript
import {
  transformCommitsForLineChart,
  transformPRsForBarChart,
  transformCommitsForHeatmap,
  transformBugsForPieChart,
  transformBugsForTrendLine,
  transformBugsForAgeHistogram,
  transformCostForAreaChart,
  transformRevenueAtRisk,
  transformBurndownData,
  transformProjectsForBubbleChart,
  transformHealthForRadarChart,
  transformCategoryDistribution,
  transformForSparkline,
  calculateProgress,
  transformForComparison,
  fillMissingData,
  aggregateByPeriod
} from '@/lib/chart-data-transformers';
```

### Key Features:
- **Graceful handling of missing data** - Returns empty states instead of errors
- **Date normalization** - Consistent date formatting across all charts
- **Aggregation support** - Day, week, month, year grouping
- **Gap filling** - Fills missing date ranges with zero values
- **Type safety** - Input validation and null checks

## Shared Utilities

### ChartContainer
Wrapper component with consistent styling and export functionality.

```jsx
import { ChartContainer } from '@/components/charts';

<ChartContainer
  title="Chart Title"
  description="Chart description"
  onExport={() => exportChartAsPNG(chartRef, 'filename.png')}
  actions={<CustomButton />}  // Optional custom actions
>
  {/* Chart content */}
</ChartContainer>
```

### Export Functions
```javascript
import { exportChartAsPNG, exportChartAsSVG } from '@/components/charts';

// Export as PNG
exportChartAsPNG(chartRef, 'chart.png');

// Export as SVG
exportChartAsSVG(chartRef, 'chart.svg');
```

### Color Palettes
```javascript
import { CHART_COLORS } from '@/components/charts';

CHART_COLORS.primary         // 8 primary colors
CHART_COLORS.severity        // Bug severity colors
CHART_COLORS.status          // Project status colors
CHART_COLORS.gradient        // Gradient color pairs
CHART_COLORS.colorBlindSafe  // Accessible palette
```

### Formatting Functions
```javascript
import { formatCurrency, formatNumber, formatPercentage } from '@/components/charts';

formatCurrency(1500000)   // "$1,500,000"
formatNumber(1500000)     // "1.5M"
formatPercentage(75.5)    // "75.5%"
```

## Design System

### Colors
All charts use a consistent color palette:

- **Primary**: Blue (#3b82f6)
- **Secondary**: Purple (#8b5cf6)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#eab308)
- **Danger**: Red (#ef4444)
- **Info**: Cyan (#06b6d4)

### Typography
- **Titles**: 18px, bold, gray-900
- **Descriptions**: 14px, regular, gray-500
- **Axis Labels**: 12px, regular, gray-600
- **Tooltips**: 14px, semibold, white on gray-900

### Spacing
- **Chart padding**: 24px (p-6)
- **Element spacing**: 16px (gap-4)
- **Grid gaps**: 24px (gap-6)

### Animations
- **Duration**: 300ms for all transitions
- **Easing**: Ease-out for smooth feel
- **Hover effects**: Shadow and scale transforms

## Responsive Design

All charts are fully responsive:

```jsx
<ResponsiveContainer width="100%" height={400}>
  {/* Chart content */}
</ResponsiveContainer>
```

### Breakpoints
- **Mobile**: Single column layout
- **Tablet** (768px+): 2-column grid
- **Desktop** (1024px+): 3-column grid

## Performance Optimizations

1. **Lazy Loading**: Import charts only when needed
2. **Memoization**: Use React.memo for chart components
3. **Data Sampling**: Limit data points for large datasets
4. **Animation Control**: Disable animations on slow devices
5. **Virtual Scrolling**: For long chart lists

### Example: Lazy Loading
```jsx
import { lazy, Suspense } from 'react';

const CommitsLineChart = lazy(() => import('@/components/charts/CommitsLineChart'));

<Suspense fallback={<ChartLoadingSkeleton />}>
  <CommitsLineChart data={data} />
</Suspense>
```

## Accessibility

All charts include:
- **Keyboard navigation**: Focus management
- **ARIA labels**: Screen reader support
- **Color contrast**: WCAG AA compliant
- **Alternative text**: Meaningful descriptions
- **Colorblind-friendly**: Optional safe palette

## Testing

### Unit Tests
```javascript
import { render, screen } from '@testing-library/react';
import { CommitsLineChart } from '@/components/charts';

test('renders commits chart', () => {
  const commits = [/* test data */];
  render(<CommitsLineChart commits={commits} />);
  expect(screen.getByText('Commits Per Day')).toBeInTheDocument();
});
```

### Data Validation
```javascript
import { transformCommitsForLineChart } from '@/lib/chart-data-transformers';

// Handles empty data
const result = transformCommitsForLineChart([]);
expect(result).toHaveLength(30); // Returns 30 days of zeros

// Handles missing fields
const result = transformCommitsForLineChart([{ date: null }]);
expect(result).toBeDefined();
```

## Best Practices

1. **Always provide loading states** - Use loading prop
2. **Handle empty states** - Show meaningful messages
3. **Use proper data formats** - Follow transformer expectations
4. **Export functionality** - Enable chart downloads
5. **Color consistency** - Use CHART_COLORS palette
6. **Mobile first** - Test on small screens
7. **Performance monitoring** - Track render times
8. **Error boundaries** - Catch rendering errors

## Integration Example

```jsx
import React, { useState, useEffect } from 'react';
import {
  CommitsLineChart,
  BugSeverityPieChart,
  ProgressRing,
  MiniSparkline
} from '@/components/charts';

const DashboardPage = () => {
  const [commits, setCommits] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [commitsData, bugsData] = await Promise.all([
          fetch('/api/commits').then(r => r.json()),
          fetch('/api/bugs').then(r => r.json())
        ]);
        setCommits(commitsData);
        setBugs(bugsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommitsLineChart commits={commits} loading={loading} />
        <BugSeverityPieChart bugs={bugs} loading={loading} />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Completion Rate</h3>
          <ProgressRing completed={75} total={100} size={80} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Commit Trend</h3>
          <MiniSparkline data={commits} valueKey="count" />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
```

## Support

For questions or issues:
- Check documentation
- Review example usage
- Inspect prop types
- Test with sample data

## Version

**Charts & Analytics Layer v2.0**
- Built: 2024-11-24
- Recharts: 2.10.3
- React: 18.2.0
