/**
 * Chart Data Transformers
 * Utilities to transform API/DB data into chart-ready formats
 */

import { format, parseISO, subDays, eachDayOfInterval, startOfDay, differenceInDays } from 'date-fns';

/**
 * Transform commit data for line chart
 * Groups commits by date and counts them
 */
export const transformCommitsForLineChart = (commits = []) => {
  if (!commits || commits.length === 0) {
    // Return empty data for last 30 days
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });
    return days.map(day => ({
      date: format(day, 'MMM dd'),
      commits: 0
    }));
  }

  // Group commits by date
  const commitsByDate = commits.reduce((acc, commit) => {
    const date = format(startOfDay(parseISO(commit.created_at || commit.date)), 'MMM dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  // Create array with all dates in range
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map(day => {
    const dateKey = format(day, 'MMM dd');
    return {
      date: dateKey,
      commits: commitsByDate[dateKey] || 0
    };
  });
};

/**
 * Transform PR data for bar chart
 * Groups PRs by week
 */
export const transformPRsForBarChart = (prs = []) => {
  if (!prs || prs.length === 0) {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `Week ${i + 1}`,
      merged: 0,
      opened: 0,
      closed: 0
    }));
  }

  // Group by week
  const prsByWeek = prs.reduce((acc, pr) => {
    const date = parseISO(pr.created_at || pr.date);
    const weekNum = Math.floor(differenceInDays(new Date(), date) / 7);
    const weekKey = `Week ${12 - weekNum}`;

    if (!acc[weekKey]) {
      acc[weekKey] = { merged: 0, opened: 0, closed: 0 };
    }

    acc[weekKey].opened += 1;
    if (pr.merged_at) acc[weekKey].merged += 1;
    if (pr.closed_at && !pr.merged_at) acc[weekKey].closed += 1;

    return acc;
  }, {});

  return Object.entries(prsByWeek).map(([week, data]) => ({
    week,
    ...data
  }));
};

/**
 * Transform commit data for activity heatmap
 * Returns data grouped by day of week and hour
 */
export const transformCommitsForHeatmap = (commits = []) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const heatmapData = [];

  days.forEach((day, dayIndex) => {
    hours.forEach(hour => {
      const count = commits.filter(commit => {
        const date = parseISO(commit.created_at || commit.date);
        return date.getDay() === dayIndex && date.getHours() === hour;
      }).length;

      heatmapData.push({
        day,
        hour,
        count,
        intensity: count > 0 ? Math.min(count / 5, 1) : 0
      });
    });
  });

  return heatmapData;
};

/**
 * Transform bug data for pie chart
 * Groups bugs by severity
 */
export const transformBugsForPieChart = (bugs = []) => {
  const severities = ['critical', 'high', 'medium', 'low'];

  const bugsBySeverity = bugs.reduce((acc, bug) => {
    const severity = bug.severity?.toLowerCase() || 'low';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  return severities.map(severity => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: bugsBySeverity[severity] || 0,
    severity
  }));
};

/**
 * Transform bug data for trend line
 * Shows bug creation vs resolution over time
 */
export const transformBugsForTrendLine = (bugs = []) => {
  const days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  return days.map(day => {
    const dateKey = format(day, 'MMM dd');
    const dayStart = startOfDay(day);

    const created = bugs.filter(bug => {
      const bugDate = startOfDay(parseISO(bug.created_at || bug.date));
      return bugDate.getTime() === dayStart.getTime();
    }).length;

    const resolved = bugs.filter(bug => {
      if (!bug.resolved_at) return false;
      const resolvedDate = startOfDay(parseISO(bug.resolved_at));
      return resolvedDate.getTime() === dayStart.getTime();
    }).length;

    return {
      date: dateKey,
      created,
      resolved,
      net: created - resolved
    };
  });
};

/**
 * Transform bug data for age histogram
 * Groups bugs by age in days
 */
export const transformBugsForAgeHistogram = (bugs = []) => {
  const ageBuckets = [
    { label: '0-7 days', min: 0, max: 7, count: 0 },
    { label: '8-14 days', min: 8, max: 14, count: 0 },
    { label: '15-30 days', min: 15, max: 30, count: 0 },
    { label: '31-60 days', min: 31, max: 60, count: 0 },
    { label: '61-90 days', min: 61, max: 90, count: 0 },
    { label: '90+ days', min: 91, max: Infinity, count: 0 }
  ];

  bugs.forEach(bug => {
    const age = differenceInDays(new Date(), parseISO(bug.created_at || bug.date));
    const bucket = ageBuckets.find(b => age >= b.min && age <= b.max);
    if (bucket) bucket.count++;
  });

  return ageBuckets;
};

/**
 * Transform cost data for area chart
 */
export const transformCostForAreaChart = (costData = []) => {
  if (!costData || costData.length === 0) {
    const months = eachDayOfInterval({
      start: subDays(new Date(), 179), // ~6 months
      end: new Date()
    }).filter((_, i) => i % 30 === 0);

    return months.map(month => ({
      month: format(month, 'MMM yyyy'),
      infrastructure: 0,
      personnel: 0,
      tools: 0,
      total: 0
    }));
  }

  return costData.map(item => ({
    month: format(parseISO(item.month || item.date), 'MMM yyyy'),
    infrastructure: item.infrastructure || 0,
    personnel: item.personnel || 0,
    tools: item.tools || 0,
    total: (item.infrastructure || 0) + (item.personnel || 0) + (item.tools || 0)
  }));
};

/**
 * Transform project data for revenue at risk bar chart
 */
export const transformRevenueAtRisk = (projects = []) => {
  return projects
    .filter(p => p.revenue_impact > 0)
    .sort((a, b) => b.revenue_impact - a.revenue_impact)
    .slice(0, 10)
    .map(project => ({
      name: project.name,
      revenue: project.revenue_impact,
      risk: project.risk_score || 0,
      status: project.status
    }));
};

/**
 * Transform sprint/milestone data for burndown chart
 */
export const transformBurndownData = (tasks = [], sprintStart, sprintEnd) => {
  const days = eachDayOfInterval({
    start: parseISO(sprintStart),
    end: parseISO(sprintEnd)
  });

  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 1), 0);

  return days.map((day, index) => {
    const dayStart = startOfDay(day);
    const completedPoints = tasks
      .filter(task => {
        if (!task.completed_at) return false;
        const completedDate = startOfDay(parseISO(task.completed_at));
        return completedDate <= dayStart;
      })
      .reduce((sum, task) => sum + (task.points || 1), 0);

    const remainingPoints = totalPoints - completedPoints;
    const idealRemaining = totalPoints - (totalPoints / days.length) * (index + 1);

    return {
      date: format(day, 'MMM dd'),
      ideal: Math.max(0, idealRemaining),
      actual: remainingPoints,
      completed: completedPoints
    };
  });
};

/**
 * Transform project data for bubble chart
 * Size represents project size, position represents risk vs value
 */
export const transformProjectsForBubbleChart = (projects = []) => {
  return projects.map(project => ({
    name: project.name,
    x: project.risk_score || 50,
    y: project.value_score || 50,
    z: project.team_size || project.lines_of_code / 10000 || 5,
    category: project.category || 'uncategorized',
    status: project.status
  }));
};

/**
 * Transform project health metrics for radar chart
 */
export const transformHealthForRadarChart = (project) => {
  return [
    { metric: 'Code Quality', value: project.code_quality_score || 0, fullMark: 100 },
    { metric: 'Test Coverage', value: project.test_coverage || 0, fullMark: 100 },
    { metric: 'Documentation', value: project.documentation_score || 0, fullMark: 100 },
    { metric: 'Security', value: project.security_score || 0, fullMark: 100 },
    { metric: 'Performance', value: project.performance_score || 0, fullMark: 100 },
    { metric: 'Maintainability', value: project.maintainability_score || 0, fullMark: 100 }
  ];
};

/**
 * Transform projects for category distribution
 */
export const transformCategoryDistribution = (projects = []) => {
  const categories = projects.reduce((acc, project) => {
    const category = project.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(categories).map(([name, value]) => ({
    name,
    value,
    percentage: (value / projects.length) * 100
  }));
};

/**
 * Transform data for mini sparkline
 * Returns simplified trend data
 */
export const transformForSparkline = (data = [], valueKey = 'value') => {
  if (!data || data.length === 0) {
    return Array.from({ length: 10 }, (_, i) => ({ index: i, value: 0 }));
  }

  // Take last 10 data points
  return data.slice(-10).map((item, index) => ({
    index,
    value: item[valueKey] || 0
  }));
};

/**
 * Calculate progress percentage
 */
export const calculateProgress = (completed, total) => {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Transform data for comparison bars
 */
export const transformForComparison = (current, previous, label) => {
  const change = current - previous;
  const changePercent = previous > 0 ? ((change / previous) * 100).toFixed(1) : 0;

  return {
    label,
    current,
    previous,
    change,
    changePercent,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
  };
};

/**
 * Handle missing data gracefully
 */
export const fillMissingData = (data, dateKey = 'date', valueKey = 'value') => {
  if (!data || data.length === 0) return [];

  // Sort by date
  const sorted = [...data].sort((a, b) =>
    new Date(a[dateKey]) - new Date(b[dateKey])
  );

  // Fill gaps with zero values
  const filled = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    filled.push(sorted[i]);

    const currentDate = parseISO(sorted[i][dateKey]);
    const nextDate = parseISO(sorted[i + 1][dateKey]);
    const daysDiff = differenceInDays(nextDate, currentDate);

    // If gap is more than 1 day, fill with zeros
    if (daysDiff > 1) {
      const gapDays = eachDayOfInterval({
        start: currentDate,
        end: nextDate
      }).slice(1, -1);

      gapDays.forEach(day => {
        filled.push({
          [dateKey]: format(day, 'yyyy-MM-dd'),
          [valueKey]: 0
        });
      });
    }
  }

  filled.push(sorted[sorted.length - 1]);
  return filled;
};

/**
 * Aggregate data by time period
 */
export const aggregateByPeriod = (data, period = 'day', valueKey = 'value') => {
  const formatMap = {
    day: 'yyyy-MM-dd',
    week: 'yyyy-ww',
    month: 'yyyy-MM',
    year: 'yyyy'
  };

  const formatString = formatMap[period] || formatMap.day;

  const aggregated = data.reduce((acc, item) => {
    const date = parseISO(item.date || item.created_at);
    const key = format(date, formatString);

    if (!acc[key]) {
      acc[key] = { date: key, [valueKey]: 0, count: 0 };
    }

    acc[key][valueKey] += item[valueKey] || 1;
    acc[key].count += 1;

    return acc;
  }, {});

  return Object.values(aggregated);
};

export default {
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
};
