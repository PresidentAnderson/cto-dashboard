/**
 * Daily Metrics Builder
 *
 * Builds and populates daily metrics snapshots for materialized view pattern.
 * Can be triggered by cron jobs for daily aggregation.
 */

import { prisma } from '@/lib/prisma';
import { DailyMetrics } from './types';
import { calculateTotalBugCost, calculateRevenueAtRisk } from './calculator';

/**
 * Build daily metrics for a specific date
 *
 * Aggregates:
 * - Bugs opened/closed
 * - Commits count
 * - PRs opened/merged
 * - Hours spent
 * - Revenue at risk
 * - Active projects
 *
 * @param date - Date to build metrics for (defaults to today)
 * @returns Daily metrics snapshot
 */
export async function buildDailyMetrics(date?: Date): Promise<DailyMetrics> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Count bugs opened on this date
  const bugsOpened = await prisma.bug.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Count bugs closed on this date
  const bugsClosed = await prisma.bug.count({
    where: {
      resolvedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Get commits count from project metrics
  const projectMetrics = await prisma.projectMetric.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      commitsCount: true,
    },
  });

  const commitsCount = projectMetrics.reduce(
    (sum, metric) => sum + metric.commitsCount,
    0
  );

  // Calculate hours spent (from bugs with actualHours)
  const bugsWithHours = await prisma.bug.findMany({
    where: {
      updatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      actualHours: {
        not: null,
      },
    },
    select: {
      actualHours: true,
    },
  });

  const hoursSpent = bugsWithHours.reduce((sum, bug) => {
    return sum + (bug.actualHours ? Number(bug.actualHours) : 0);
  }, 0);

  // Get critical bugs for revenue at risk calculation
  const criticalBugs = await prisma.bug.findMany({
    where: {
      severity: 'critical',
      status: {
        notIn: ['closed', 'shipped'],
      },
      createdAt: {
        lte: endOfDay,
      },
    },
    include: {
      project: true,
    },
  });

  const revenueRisk = calculateRevenueAtRisk(criticalBugs);

  // Count active projects (with activity in last 30 days)
  const thirtyDaysAgo = new Date(targetDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeProjects = await prisma.project.count({
    where: {
      status: 'active',
      OR: [
        {
          lastCommit: {
            gte: thirtyDaysAgo,
          },
        },
        {
          bugs: {
            some: {
              createdAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      ],
    },
  });

  return {
    date: targetDate,
    bugsOpened,
    bugsClosed,
    commitsCount,
    prsOpened: 0, // TODO: Add PR tracking when available
    prsMerged: 0, // TODO: Add PR tracking when available
    hoursSpent,
    revenueAtRisk: revenueRisk.totalDailyLoss,
    activeProjects,
    criticalBugs: criticalBugs.length,
  };
}

/**
 * Build and persist daily metrics to a table (materialized view pattern)
 *
 * Note: Requires a metrics_daily table to be created
 *
 * @param date - Date to build metrics for
 * @returns Persisted metrics
 */
export async function persistDailyMetrics(date?: Date): Promise<DailyMetrics> {
  const metrics = await buildDailyMetrics(date);

  // Store in database - requires metrics_daily table
  // For now, we'll just return the calculated metrics
  // In a real implementation, you'd insert into a dedicated table:
  //
  // await prisma.metricsDaily.upsert({
  //   where: { date: metrics.date },
  //   create: metrics,
  //   update: metrics,
  // });

  console.log(`[DailyMetrics] Built metrics for ${metrics.date.toISOString()}`);

  return metrics;
}

/**
 * Build metrics for a date range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of daily metrics
 */
export async function buildMetricsRange(
  startDate: Date,
  endDate: Date
): Promise<DailyMetrics[]> {
  const metrics: DailyMetrics[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dailyMetrics = await buildDailyMetrics(new Date(currentDate));
    metrics.push(dailyMetrics);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return metrics;
}

/**
 * Get or build daily metrics with caching
 *
 * @param date - Date to get metrics for
 * @returns Daily metrics (cached or fresh)
 */
export async function getDailyMetrics(date: Date): Promise<DailyMetrics> {
  // In production, check cache or database first
  // For now, always build fresh
  return buildDailyMetrics(date);
}

/**
 * Backfill daily metrics for historical data
 *
 * @param days - Number of days to backfill
 */
export async function backfillDailyMetrics(days: number = 30): Promise<void> {
  console.log(`[DailyMetrics] Starting backfill for ${days} days...`);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await buildMetricsRange(startDate, endDate);

  console.log(`[DailyMetrics] Backfilled ${metrics.length} daily metric records`);
}

/**
 * Calculate rolling averages from daily metrics
 *
 * @param metrics - Array of daily metrics
 * @param windowSize - Size of rolling window (default 7 days)
 */
export function calculateRollingAverages(
  metrics: DailyMetrics[],
  windowSize: number = 7
): Array<{
  date: Date;
  avgBugsOpened: number;
  avgBugsClosed: number;
  avgCommits: number;
  avgHoursSpent: number;
}> {
  const result = [];

  for (let i = windowSize - 1; i < metrics.length; i++) {
    const window = metrics.slice(i - windowSize + 1, i + 1);

    const avgBugsOpened = window.reduce((sum, m) => sum + m.bugsOpened, 0) / windowSize;
    const avgBugsClosed = window.reduce((sum, m) => sum + m.bugsClosed, 0) / windowSize;
    const avgCommits = window.reduce((sum, m) => sum + m.commitsCount, 0) / windowSize;
    const avgHoursSpent = window.reduce((sum, m) => sum + m.hoursSpent, 0) / windowSize;

    result.push({
      date: metrics[i].date,
      avgBugsOpened,
      avgBugsClosed,
      avgCommits,
      avgHoursSpent,
    });
  }

  return result;
}
