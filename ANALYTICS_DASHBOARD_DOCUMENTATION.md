# Analytics Dashboard Documentation

## CTO Dashboard v2.0 - Analytics Features

Complete documentation for the analytics dashboard implementation with real data-driven charts and KPIs.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [API Endpoints](#api-endpoints)
5. [Calculations & Algorithms](#calculations--algorithms)
6. [Performance Optimization](#performance-optimization)
7. [Usage Guide](#usage-guide)
8. [Customization](#customization)

---

## Overview

The Analytics Dashboard provides real-time visibility into your entire portfolio with:

- **8 Key Performance Indicators (KPIs)**
- **5 Interactive Charts** (Pie, Bar, Line, Area)
- **Health Score Metrics** with detailed breakdowns
- **Auto-refresh** functionality (5-minute intervals)
- **Filter & Export** capabilities
- **Professional executive-level** presentation

### Key Features

- Real-time data from PostgreSQL database
- 5-minute server-side caching for performance
- Responsive design (mobile, tablet, desktop)
- Export charts as PNG images
- Date range and status filtering
- Loading skeletons and error handling
- Trend indicators on all metrics

---

## Architecture

### Technology Stack

**Frontend:**
- React 18.2
- Recharts 2.10.3 (charting library)
- Axios (HTTP client)
- date-fns (date formatting)
- Tailwind CSS (styling)

**Backend:**
- Node.js + Express
- PostgreSQL 14+
- Winston (logging)
- In-memory caching

### File Structure

```
frontend/src/
├── components/
│   ├── MetricsCard.jsx              # Reusable KPI card component
│   ├── DashboardOverview.jsx        # Main KPI grid layout
│   ├── AnalyticsCharts.jsx          # All chart types
│   └── ProjectHealthScore.jsx       # Health score calculator
├── pages/
│   └── Dashboard.jsx                # Main dashboard page
└── config.js                        # Configuration

backend/
└── server.js                        # Analytics API endpoints
```

---

## Components

### 1. MetricsCard.jsx

**Purpose:** Reusable KPI card with trend indicators and color-coded styling.

**Props:**
- `title` (string): Card title
- `value` (string/number): Main metric value
- `subtitle` (string): Additional context
- `icon` (string): Emoji icon
- `trend` ('up'|'down'|'neutral'): Trend direction
- `trendValue` (string): Trend percentage/value
- `color` ('red'|'orange'|'yellow'|'green'|'blue'|'purple'|'teal'|'gray'): Color theme
- `loading` (boolean): Show loading skeleton

**Features:**
- Gradient backgrounds
- Hover animations
- Trend arrows (up/down/neutral)
- Color-coded by metric type
- Loading states

**Example Usage:**
```jsx
<MetricsCard
  title="Total Projects"
  value={25}
  subtitle="Across all statuses"
  icon="📁"
  trend="up"
  trendValue="+5.2%"
  color="blue"
  loading={false}
/>
```

---

### 2. DashboardOverview.jsx

**Purpose:** Main dashboard with KPI grid layout and language distribution.

**Props:**
- `analytics` (object): Analytics data from API
- `loading` (boolean): Loading state
- `lastSyncTime` (string): Last data sync timestamp

**KPIs Displayed:**
1. Total Projects
2. Active Projects
3. Total Stars
4. Total Forks
5. Bug Backlog Count
6. Average Health Score
7. Recent Commits (30 days)
8. Open Issues

**Features:**
- Hero header with gradient
- 4-column responsive grid
- Top 5 languages with progress bars
- Language emoji mapping
- Last sync timestamp
- Refresh data button

---

### 3. AnalyticsCharts.jsx

**Purpose:** Interactive charts using Recharts library.

**Props:**
- `analyticsData` (object): Chart data
- `loading` (boolean): Loading state

**Charts Included:**

#### Pie Chart: Projects by Language
- Distribution of projects across tech stack
- Color-coded segments
- Percentage labels
- Interactive tooltips

#### Bar Chart: Projects by Status
- Current status of all projects
- Status-specific colors
- Vertical bars with rounded corners

#### Line Chart: Commits Over Time
- 30-day commit activity trend
- Smooth line with dots
- Hover effects

#### Bar Chart: Stars Distribution
- Top 10 projects by stars
- Horizontal bars
- Project name labels

#### Area Chart: Bug Backlog Trend
- Stacked area chart
- Bug count by severity over time
- Color-coded by severity (critical, high, medium, low)

**Color Scheme:**
```javascript
COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'],
  severity: {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  },
  status: {
    pending: '#6b7280',
    in_progress: '#3b82f6',
    verified: '#22c55e',
    shipped: '#14b8a6',
    closed: '#4b5563',
    deferred: '#a855f7'
  }
}
```

**Export Functionality:**
Each chart has an "Export" button that exports the chart as PNG image.

---

### 4. ProjectHealthScore.jsx

**Purpose:** Visual health indicator with detailed breakdown.

**Props:**
- `project` (object): Project object
- `recentCommits` (number): Commits in last 30 days
- `issueCount` (number): Open issues
- `stars` (number): GitHub stars
- `lastUpdateDays` (number): Days since last update
- `codeCoverage` (number): Code coverage percentage
- `showDetails` (boolean): Show breakdown

**Health Score Calculation (0-100):**

```
Total Score = Recency Score (40%) + Activity Score (30%) + Stars Score (30%)
```

**Breakdown:**

1. **Recency Score (40 points max):**
   - ≤7 days: 40 points
   - ≤30 days: 30 points
   - ≤90 days: 20 points
   - ≤180 days: 10 points
   - >180 days: 0 points

2. **Activity Score (30 points max):**
   - ≥50 commits: 30 points
   - ≥20 commits: 25 points
   - ≥10 commits: 20 points
   - ≥5 commits: 15 points
   - ≥1 commit: 10 points
   - 0 commits: 0 points

3. **Stars Score (30 points max):**
   - ≥1000 stars: 30 points
   - ≥500 stars: 25 points
   - ≥100 stars: 20 points
   - ≥50 stars: 15 points
   - ≥10 stars: 10 points
   - ≥1 star: 5 points
   - 0 stars: 0 points

4. **Issues Penalty:**
   - >20 issues: -10 points
   - >10 issues: -5 points

5. **Coverage Bonus:**
   - ≥80% coverage: +10 points
   - ≥60% coverage: +5 points

**Health Levels:**
- 80-100: Excellent (Green)
- 60-79: Good (Blue)
- 40-59: Fair (Yellow)
- 20-39: Poor (Orange)
- 0-19: Critical (Red)

---

### 5. Dashboard.jsx

**Purpose:** Main dashboard page with auto-refresh and filtering.

**Features:**

#### Auto-Refresh
- Refreshes every 5 minutes automatically
- Can be toggled on/off
- Shows countdown timer until next refresh
- Manual refresh button

#### Filtering
- Date range: 7/30/90/365 days
- Status: all/active/shipped/deferred/cancelled
- Language: all or specific language
- Clear filters button

#### Sections
1. **Top Navigation Bar**
   - Auto-refresh toggle
   - Manual refresh button
   - Last update timestamp
   - Countdown timer

2. **Filters Bar**
   - Date range selector
   - Status filter
   - Language filter

3. **KPI Overview**
   - DashboardOverview component
   - 8 key metrics

4. **Analytics Charts**
   - 5 interactive charts
   - Export buttons

5. **Portfolio Health**
   - Health score cards
   - Detailed breakdowns

6. **Quick Actions**
   - Link to bugs page
   - Link to projects page
   - Link to settings

---

## API Endpoints

### GET /api/analytics

**Purpose:** Comprehensive analytics endpoint with caching.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProjects": 25,
    "activeProjects": 18,
    "totalStars": 1250,
    "totalForks": 340,
    "bugBacklogCount": 47,
    "criticalBugs": 3,
    "highBugs": 12,
    "healthScoreAverage": 75,
    "recentCommits": 156,
    "totalIssues": 47,
    "projectsByStatus": [
      { "status": "active", "count": 18 },
      { "status": "shipped", "count": 5 },
      { "status": "deferred", "count": 2 }
    ],
    "projectsByLanguage": [
      { "name": "JavaScript", "value": 10 },
      { "name": "Python", "value": 8 },
      { "name": "TypeScript", "value": 5 },
      { "name": "Go", "value": 2 }
    ],
    "bugsBySeverity": [
      { "severity": "critical", "count": 3 },
      { "severity": "high", "count": 12 },
      { "severity": "medium", "count": 18 },
      { "severity": "low", "count": 14 }
    ],
    "bugsByStatus": [
      { "status": "pending", "count": 15 },
      { "status": "in_progress", "count": 20 },
      { "status": "verified", "count": 8 },
      { "status": "shipped", "count": 4 }
    ],
    "commitsTrend": [
      { "date": "2024-11-01", "commits": 15 },
      { "date": "2024-11-02", "commits": 22 }
    ],
    "bugTrend": [
      { "date": "2024-11-01", "critical": 2, "high": 8, "medium": 12, "low": 15 }
    ],
    "starsDistribution": [],
    "monthlyMetrics": [],
    "lastSync": "2024-11-24T10:30:00Z",
    "cacheExpiry": "2024-11-24T10:35:00Z"
  },
  "cached": false
}
```

**Caching:**
- In-memory cache
- 5-minute duration
- Automatic expiry
- Cache status in response

**Performance:**
- Parallel query execution
- Optimized aggregations
- Database indexes used
- Response time: ~200-500ms (uncached)

---

### POST /api/analytics/clear-cache

**Purpose:** Clear analytics cache (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

## Calculations & Algorithms

### 1. Health Score Algorithm

**Formula:**
```javascript
healthScore = Math.min(100, Math.max(0,
  recencyScore + activityScore + starsScore + issuesPenalty + coverageBonus
))
```

**Implementation:**
```javascript
function calculateHealthScore(data) {
  const { lastUpdateDays, recentCommits, stars, issueCount, codeCoverage } = data;

  // Recency (40 points)
  let recencyScore = 0;
  if (lastUpdateDays <= 7) recencyScore = 40;
  else if (lastUpdateDays <= 30) recencyScore = 30;
  else if (lastUpdateDays <= 90) recencyScore = 20;
  else if (lastUpdateDays <= 180) recencyScore = 10;

  // Activity (30 points)
  let activityScore = 0;
  if (recentCommits >= 50) activityScore = 30;
  else if (recentCommits >= 20) activityScore = 25;
  else if (recentCommits >= 10) activityScore = 20;
  else if (recentCommits >= 5) activityScore = 15;
  else if (recentCommits >= 1) activityScore = 10;

  // Stars (30 points)
  let starsScore = 0;
  if (stars >= 1000) starsScore = 30;
  else if (stars >= 500) starsScore = 25;
  else if (stars >= 100) starsScore = 20;
  else if (stars >= 50) starsScore = 15;
  else if (stars >= 10) starsScore = 10;
  else if (stars >= 1) starsScore = 5;

  // Issues penalty
  let issuesPenalty = 0;
  if (issueCount > 20) issuesPenalty = -10;
  else if (issueCount > 10) issuesPenalty = -5;

  // Coverage bonus
  let coverageBonus = 0;
  if (codeCoverage >= 80) coverageBonus = 10;
  else if (codeCoverage >= 60) coverageBonus = 5;

  return Math.min(100, Math.max(0,
    recencyScore + activityScore + starsScore + issuesPenalty + coverageBonus
  ));
}
```

---

### 2. Average Health Score (Portfolio-wide)

**Formula:**
```javascript
portfolioHealth = 100 - (criticalBugs * 5) - (highBugs * 2) - floor(totalBugs / 10)
```

**Range:** 0-100

---

### 3. Trend Calculations

**Trend Direction:**
- `up`: Positive change (good for metrics like stars, commits)
- `down`: Negative change (good for metrics like bugs)
- `neutral`: No significant change

**Implementation:**
```javascript
function calculateTrend(current, previous, isPositiveGood = true) {
  const change = current - previous;
  const threshold = previous * 0.05; // 5% threshold

  if (Math.abs(change) < threshold) return 'neutral';

  if (isPositiveGood) {
    return change > 0 ? 'up' : 'down';
  } else {
    return change > 0 ? 'down' : 'up';
  }
}
```

---

## Performance Optimization

### Backend Optimizations

1. **In-Memory Caching**
   - 5-minute cache duration
   - Reduces database load
   - Faster response times

2. **Parallel Query Execution**
   ```javascript
   const results = await Promise.all([
     query1(), query2(), query3(), ...
   ]);
   ```

3. **Database Indexes**
   - Indexes on severity, status, created_at
   - Views for common queries
   - Aggregate functions

4. **Query Optimization**
   - Use of prepared statements
   - Efficient JOIN operations
   - LIMIT/OFFSET pagination

### Frontend Optimizations

1. **Loading Skeletons**
   - Immediate UI feedback
   - Reduce perceived load time

2. **Lazy Loading**
   - Load charts on demand
   - Defer non-critical content

3. **Memoization**
   - useCallback for functions
   - useMemo for computations
   - Prevent unnecessary re-renders

4. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: sm, md, lg, xl
   - Touch-friendly interfaces

---

## Usage Guide

### Installation

1. **Install Dependencies:**
```bash
cd frontend
npm install

cd ../backend
npm install
```

2. **Start Backend:**
```bash
cd backend
npm start
```

3. **Start Frontend:**
```bash
cd frontend
npm run dev
```

### Accessing the Dashboard

Navigate to: `http://localhost:5173/dashboard`

### Features Guide

#### Auto-Refresh
- Click "Auto-refresh ON/OFF" to toggle
- Countdown timer shows next refresh
- Manual refresh available anytime

#### Filters
- Select date range (7/30/90/365 days)
- Filter by project status
- Filter by programming language
- Click "Clear Filters" to reset

#### Export Charts
- Click "Export" button on any chart
- Downloads PNG image
- Includes chart title and legend

#### Health Score
- Hover over score for breakdown
- Shows individual component scores
- Color-coded by health level

---

## Customization

### Changing Colors

**Edit:** `frontend/src/components/AnalyticsCharts.jsx`

```javascript
const COLORS = {
  primary: ['#your-color-1', '#your-color-2', ...],
  severity: {
    critical: '#your-critical-color',
    // ...
  }
}
```

### Changing Refresh Interval

**Edit:** `frontend/src/pages/Dashboard.jsx`

```javascript
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
```

### Changing Cache Duration

**Edit:** `backend/server.js`

```javascript
const ANALYTICS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
```

### Adding New KPIs

1. Add query to analytics endpoint:
```javascript
const newMetricResult = await query('SELECT ...');
```

2. Add to response data:
```javascript
analyticsData = {
  ...analyticsData,
  newMetric: newMetricResult.rows[0].value
}
```

3. Add MetricsCard to DashboardOverview:
```jsx
<MetricsCard
  title="New Metric"
  value={analytics.newMetric}
  icon="🎯"
  color="blue"
/>
```

### Adding New Charts

1. Prepare data in analytics endpoint
2. Add chart in AnalyticsCharts.jsx:
```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={yourData}>
    {/* Chart configuration */}
  </BarChart>
</ResponsiveContainer>
```

---

## Production Considerations

### Security
- Implement authentication middleware
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

### Scalability
- Consider Redis for caching (multi-instance)
- Database connection pooling
- CDN for static assets
- Load balancing

### Monitoring
- Add error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- Analytics tracking (Google Analytics)
- Uptime monitoring

### Testing
- Unit tests for calculations
- Integration tests for API endpoints
- E2E tests for user workflows
- Performance testing

---

## Troubleshooting

### Charts Not Displaying
- Check browser console for errors
- Verify API response data structure
- Ensure Recharts is installed
- Check data format (arrays, objects)

### Slow Performance
- Clear analytics cache
- Check database query performance
- Monitor network requests
- Optimize large datasets

### Auto-Refresh Not Working
- Check browser console for errors
- Verify API endpoint is accessible
- Check interval configuration
- Test manual refresh

---

## Support & Resources

- **Recharts Documentation:** https://recharts.org/
- **React Documentation:** https://react.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **PostgreSQL:** https://www.postgresql.org/docs/

---

## Version History

- **v2.0** (2024-11-24): Initial analytics dashboard release
  - 8 KPIs
  - 5 chart types
  - Health score calculations
  - Auto-refresh functionality
  - Export capabilities
  - Responsive design

---

## License

MIT License - See LICENSE file for details

---

**Built with by President Anderson**
**CTO Dashboard v2.0**
