/**
 * Trend Analysis
 *
 * Time-series analysis for bugs, commits, costs, and velocity.
 * Generates trend data for charts and insights.
 */

import { prisma } from '@/lib/prisma';
import {
  BugTrends,
  CommitTrends,
  CostTrends,
  VelocityTrends,
  TrendDataPoint,
  DateRange,
} from './types';
import { withCache, generateCacheKey } from './cache';
import { calculateTotalBugCost } from './calculator';

/**
 * Get bug trends (creation vs resolution)
 *
 * @param dateRange - Date range for analysis
 * @returns Bug trend data
 */
export async function getBugTrends(dateRange: DateRange): Promise<BugTrends> {
  return withCache(
    generateCacheKey('trends', 'bugs', dateRange.start, dateRange.end),
    async () => {
      // Generate daily buckets
      const days = Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      );

      const creationTrend: TrendDataPoint[] = [];
      const resolutionTrend: TrendDataPoint[] = [];
      const netChange: TrendDataPoint[] = [];

      let totalResolutionTime = 0;
      let resolvedCount = 0;

      for (let i = 0; i <= days; i++) {
        const date = new Date(dateRange.start);
        date.setDate(date.getDate() + i);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Count bugs created on this day
        const created = await prisma.bug.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDay,
            },
          },
        });

        // Count bugs resolved on this day
        const resolved = await prisma.bug.count({
          where: {
            resolvedAt: {
              gte: date,
              lt: nextDay,
            },
          },
        });

        // Get resolution times for this day
        const resolvedBugs = await prisma.bug.findMany({
          where: {
            resolvedAt: {
              gte: date,
              lt: nextDay,
            },
          },
          select: {
            createdAt: true,
            resolvedAt: true,
          },
        });

        for (const bug of resolvedBugs) {
          if (bug.resolvedAt) {
            const resolutionTime =
              (bug.resolvedAt.getTime() - bug.createdAt.getTime()) /
              (1000 * 60 * 60 * 24); // days
            totalResolutionTime += resolutionTime;
            resolvedCount++;
          }
        }

        creationTrend.push({
          date,
          value: created,
          label: date.toLocaleDateString(),
        });

        resolutionTrend.push({
          date,
          value: resolved,
          label: date.toLocaleDateString(),
        });

        netChange.push({
          date,
          value: created - resolved,
          label: date.toLocaleDateString(),
        });
      }

      const averageResolutionTime =
        resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

      return {
        creationTrend,
        resolutionTrend,
        netChange,
        averageResolutionTime,
        period: dateRange,
      };
    }
  );
}

/**
 * Get commit trends (activity over time)
 *
 * @param dateRange - Date range for analysis
 * @returns Commit trend data
 */
export async function getCommitTrends(dateRange: DateRange): Promise<CommitTrends> {
  return withCache(
    generateCacheKey('trends', 'commits', dateRange.start, dateRange.end),
    async () => {
      const metrics = await prisma.projectMetric.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        orderBy: {
          date: 'asc',
        },
        select: {
          date: true,
          commitsCount: true,
          contributors: true,
        },
      });

      // Group by date
      const commitsByDate = new Map<string, { commits: number; contributors: number }>();

      for (const metric of metrics) {
        const dateKey = metric.date.toISOString().split('T')[0];
        const existing = commitsByDate.get(dateKey) || { commits: 0, contributors: 0 };
        existing.commits += metric.commitsCount;
        existing.contributors = Math.max(existing.contributors, metric.contributors);
        commitsByDate.set(dateKey, existing);
      }

      // Convert to trend data points
      const commitActivity: TrendDataPoint[] = [];
      const contributorActivity: TrendDataPoint[] = [];
      const dayCommits: { [key: string]: number } = {};

      for (const [dateKey, data] of commitsByDate.entries()) {
        const date = new Date(dateKey);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        commitActivity.push({
          date,
          value: data.commits,
          label: date.toLocaleDateString(),
        });

        contributorActivity.push({
          date,
          value: data.contributors,
          label: date.toLocaleDateString(),
        });

        dayCommits[dayOfWeek] = (dayCommits[dayOfWeek] || 0) + data.commits;
      }

      // Calculate average commits per day
      const totalCommits = commitActivity.reduce((sum, point) => sum + point.value, 0);
      const days = commitActivity.length || 1;
      const averageCommitsPerDay = totalCommits / days;

      // Find most active day
      let mostActiveDay = 'Monday';
      let maxCommits = 0;
      for (const [day, commits] of Object.entries(dayCommits)) {
        if (commits > maxCommits) {
          maxCommits = commits;
          mostActiveDay = day;
        }
      }

      return {
        commitActivity,
        contributorActivity,
        averageCommitsPerDay,
        mostActiveDay,
        period: dateRange,
      };
    }
  );
}

/**
 * Get cost trends (spending patterns)
 *
 * @param dateRange - Date range for analysis
 * @returns Cost trend data
 */
export async function getCostTrends(dateRange: DateRange): Promise<CostTrends> {
  return withCache(
    generateCacheKey('trends', 'costs', dateRange.start, dateRange.end),
    async () => {
      // Get all bugs with actual hours in the date range
      const bugs = await prisma.bug.findMany({
        where: {
          updatedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          actualHours: {
            not: null,
          },
        },
        select: {
          updatedAt: true,
          actualHours: true,
          severity: true,
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      // Calculate costs
      const costCalculations = calculateTotalBugCost(bugs as any);

      // Group by month
      const costsByMonth = new Map<string, number>();
      const bugCostBreakdown = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      for (const bug of bugs) {
        const monthKey = new Date(bug.updatedAt).toISOString().slice(0, 7); // YYYY-MM
        const bugCosts = calculateTotalBugCost([bug as any]);

        const existing = costsByMonth.get(monthKey) || 0;
        costsByMonth.set(monthKey, existing + bugCosts.totalCost);

        // Add to breakdown
        switch (bug.severity) {
          case 'critical':
            bugCostBreakdown.critical += bugCosts.totalCost;
            break;
          case 'high':
            bugCostBreakdown.high += bugCosts.totalCost;
            break;
          case 'medium':
            bugCostBreakdown.medium += bugCosts.totalCost;
            break;
          case 'low':
            bugCostBreakdown.low += bugCosts.totalCost;
            break;
        }
      }

      // Convert to trend data points
      const spendingByMonth: TrendDataPoint[] = [];
      const cumulativeSpending: TrendDataPoint[] = [];
      let cumulative = 0;

      for (const [monthKey, cost] of Array.from(costsByMonth.entries()).sort()) {
        const date = new Date(monthKey + '-01');
        cumulative += cost;

        spendingByMonth.push({
          date,
          value: Math.round(cost),
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        });

        cumulativeSpending.push({
          date,
          value: Math.round(cumulative),
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        });
      }

      return {
        spendingByMonth,
        cumulativeSpending,
        bugCostBreakdown: {
          critical: Math.round(bugCostBreakdown.critical),
          high: Math.round(bugCostBreakdown.high),
          medium: Math.round(bugCostBreakdown.medium),
          low: Math.round(bugCostBreakdown.low),
        },
        totalCost: Math.round(costCalculations.totalCost),
        period: dateRange,
      };
    }
  );
}

/**
 * Get velocity trends (speed metrics over time)
 *
 * @param dateRange - Date range for analysis
 * @returns Velocity trend data
 */
export async function getVelocityTrends(dateRange: DateRange): Promise<VelocityTrends> {
  return withCache(
    generateCacheKey('trends', 'velocity', dateRange.start, dateRange.end),
    async () => {
      // Get bugs resolved in period for cycle time
      const resolvedBugs = await prisma.bug.findMany({
        where: {
          resolvedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
        orderBy: {
          resolvedAt: 'asc',
        },
      });

      // Get commit metrics
      const metrics = await prisma.projectMetric.findMany({
        where: {
          date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        orderBy: {
          date: 'asc',
        },
        select: {
          date: true,
          commitsCount: true,
        },
      });

      // Calculate weekly cycle times
      const cycleTimeTrend: TrendDataPoint[] = [];
      const deploymentFrequencyTrend: TrendDataPoint[] = [];
      const throughputTrend: TrendDataPoint[] = [];

      // Group by week
      const weeks = new Map<string, { bugs: typeof resolvedBugs; commits: number }>();

      for (const bug of resolvedBugs) {
        if (bug.resolvedAt) {
          const weekKey = getWeekKey(bug.resolvedAt);
          const existing = weeks.get(weekKey) || { bugs: [], commits: 0 };
          existing.bugs.push(bug);
          weeks.set(weekKey, existing);
        }
      }

      for (const metric of metrics) {
        const weekKey = getWeekKey(metric.date);
        const existing = weeks.get(weekKey) || { bugs: [], commits: 0 };
        existing.commits += metric.commitsCount;
        weeks.set(weekKey, existing);
      }

      // Calculate trends
      let totalVelocity = 0;
      let weekCount = 0;

      for (const [weekKey, data] of Array.from(weeks.entries()).sort()) {
        const date = new Date(weekKey);

        // Calculate average cycle time for the week
        let totalCycleTime = 0;
        for (const bug of data.bugs) {
          if (bug.resolvedAt) {
            const cycleTime =
              (bug.resolvedAt.getTime() - bug.createdAt.getTime()) /
              (1000 * 60 * 60); // hours
            totalCycleTime += cycleTime;
          }
        }
        const avgCycleTime = data.bugs.length > 0 ? totalCycleTime / data.bugs.length : 0;

        // Deployment frequency (1 deployment per 5 commits)
        const deploymentFrequency = data.commits / 5;

        // Throughput (bugs resolved per week)
        const throughput = data.bugs.length;

        cycleTimeTrend.push({
          date,
          value: Math.round(avgCycleTime),
          label: `Week of ${date.toLocaleDateString()}`,
        });

        deploymentFrequencyTrend.push({
          date,
          value: Math.round(deploymentFrequency * 10) / 10,
          label: `Week of ${date.toLocaleDateString()}`,
        });

        throughputTrend.push({
          date,
          value: throughput,
          label: `Week of ${date.toLocaleDateString()}`,
        });

        totalVelocity += data.commits / 7; // commits per day
        weekCount++;
      }

      const averageVelocity = weekCount > 0 ? totalVelocity / weekCount : 0;

      return {
        cycleTimeTrend,
        deploymentFrequencyTrend,
        throughputTrend,
        averageVelocity: Math.round(averageVelocity * 10) / 10,
        period: dateRange,
      };
    }
  );
}

/**
 * Get week key for grouping (YYYY-WW format)
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get comprehensive trend summary
 *
 * @param dateRange - Date range for analysis
 * @returns All trend data in one call
 */
export async function getAllTrends(dateRange: DateRange): Promise<{
  bugs: BugTrends;
  commits: CommitTrends;
  costs: CostTrends;
  velocity: VelocityTrends;
}> {
  const [bugs, commits, costs, velocity] = await Promise.all([
    getBugTrends(dateRange),
    getCommitTrends(dateRange),
    getCostTrends(dateRange),
    getVelocityTrends(dateRange),
  ]);

  return {
    bugs,
    commits,
    costs,
    velocity,
  };
}

/**
 * Get trend comparison (current period vs previous period)
 *
 * @param dateRange - Current period date range
 * @returns Comparison data
 */
export async function getTrendComparison(dateRange: DateRange): Promise<{
  current: {
    bugs: BugTrends;
    commits: CommitTrends;
    costs: CostTrends;
    velocity: VelocityTrends;
  };
  previous: {
    bugs: BugTrends;
    commits: CommitTrends;
    costs: CostTrends;
    velocity: VelocityTrends;
  };
}> {
  const periodLength =
    dateRange.end.getTime() - dateRange.start.getTime();

  const previousRange: DateRange = {
    start: new Date(dateRange.start.getTime() - periodLength),
    end: new Date(dateRange.start),
  };

  const [current, previous] = await Promise.all([
    getAllTrends(dateRange),
    getAllTrends(previousRange),
  ]);

  return {
    current,
    previous,
  };
}
