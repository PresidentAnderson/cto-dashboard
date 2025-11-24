/**
 * Dashboard KPIs
 *
 * High-level KPIs for CEO-grade dashboard with caching for performance.
 * These functions power the main dashboard view.
 */

import { prisma } from '@/lib/prisma';
import { DashboardKPIs, ProjectRiskScore } from './types';
import { withCache, generateCacheKey } from './cache';
import { calculateRevenueAtRisk, calculateProjectRiskScore } from './calculator';
import { getTopRiskyProjects } from './risk-scorer';

/**
 * Get total project count
 *
 * @returns Total number of projects
 */
export async function getTotalProjects(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'total-projects'),
    async () => {
      return prisma.project.count();
    }
  );
}

/**
 * Get active project count
 *
 * @returns Number of active projects
 */
export async function getActiveProjects(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'active-projects'),
    async () => {
      return prisma.project.count({
        where: {
          status: 'active',
        },
      });
    }
  );
}

/**
 * Get active bugs count (excluding closed/shipped)
 *
 * @returns Number of active bugs
 */
export async function getActiveBugs(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'active-bugs'),
    async () => {
      return prisma.bug.count({
        where: {
          status: {
            notIn: ['closed', 'shipped'],
          },
        },
      });
    }
  );
}

/**
 * Get critical bugs count
 *
 * @returns Number of critical bugs
 */
export async function getCriticalBugs(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'critical-bugs'),
    async () => {
      return prisma.bug.count({
        where: {
          severity: 'critical',
          status: {
            notIn: ['closed', 'shipped'],
          },
        },
      });
    }
  );
}

/**
 * Get total engineering hours across all bugs
 *
 * @returns Total hours spent
 */
export async function getTotalEngineeringHours(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'total-hours'),
    async () => {
      const result = await prisma.bug.aggregate({
        _sum: {
          actualHours: true,
        },
        where: {
          actualHours: {
            not: null,
          },
        },
      });

      return Number(result._sum.actualHours || 0);
    }
  );
}

/**
 * Get total revenue at risk from critical bugs
 *
 * @returns Total daily revenue at risk
 */
export async function getRevenueAtRisk(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'revenue-at-risk'),
    async () => {
      const criticalBugs = await prisma.bug.findMany({
        where: {
          severity: 'critical',
          status: {
            notIn: ['closed', 'shipped'],
          },
          revenueImpact: {
            not: null,
          },
        },
        include: {
          project: true,
        },
      });

      const revenueRisk = calculateRevenueAtRisk(criticalBugs);
      return revenueRisk.totalDailyLoss;
    }
  );
}

/**
 * Get average velocity across all active projects
 *
 * @returns Average velocity score
 */
export async function getAverageVelocity(): Promise<number> {
  return withCache(
    generateCacheKey('kpi', 'avg-velocity'),
    async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get project metrics for last 30 days
      const metrics = await prisma.projectMetric.findMany({
        where: {
          date: {
            gte: thirtyDaysAgo,
          },
          project: {
            status: 'active',
          },
        },
        select: {
          commitsCount: true,
          projectId: true,
        },
      });

      // Group by project and calculate average commits per day
      const projectCommits = new Map<string, number>();

      for (const metric of metrics) {
        const current = projectCommits.get(metric.projectId) || 0;
        projectCommits.set(metric.projectId, current + metric.commitsCount);
      }

      if (projectCommits.size === 0) {
        return 0;
      }

      // Calculate average commits per day per project
      const totalCommits = Array.from(projectCommits.values()).reduce(
        (sum, count) => sum + count,
        0
      );

      const avgCommitsPerDay = totalCommits / 30 / projectCommits.size;

      // Convert to velocity score (0-100 scale, 5+ commits/day = 100)
      return Math.min(100, (avgCommitsPerDay / 5) * 100);
    }
  );
}

/**
 * Get complete dashboard KPIs
 *
 * @returns All dashboard KPIs in one call
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  return withCache(
    generateCacheKey('kpi', 'dashboard-all'),
    async () => {
      // Fetch all KPIs in parallel
      const [
        totalProjects,
        activeProjects,
        activeBugs,
        criticalBugs,
        totalEngineeringHours,
        revenueAtRisk,
        averageVelocity,
        topRiskyProjects,
      ] = await Promise.all([
        getTotalProjects(),
        getActiveProjects(),
        getActiveBugs(),
        getCriticalBugs(),
        getTotalEngineeringHours(),
        getRevenueAtRisk(),
        getAverageVelocity(),
        getTopRiskyProjects(5),
      ]);

      return {
        totalProjects,
        activeProjects,
        activeBugs,
        criticalBugs,
        totalEngineeringHours,
        revenueAtRisk,
        averageVelocity,
        topRiskyProjects,
        lastUpdated: new Date(),
      };
    }
  );
}

/**
 * Get KPIs for a specific project
 *
 * @param projectId - Project ID
 * @returns Project-specific KPIs
 */
export async function getProjectKPIs(projectId: string): Promise<{
  activeBugs: number;
  criticalBugs: number;
  totalHours: number;
  revenueAtRisk: number;
  velocity: number;
  riskScore: ProjectRiskScore | null;
}> {
  return withCache(
    generateCacheKey('kpi', 'project', projectId),
    async () => {
      // Get bugs for project
      const activeBugs = await prisma.bug.count({
        where: {
          projectId,
          status: {
            notIn: ['closed', 'shipped'],
          },
        },
      });

      const criticalBugs = await prisma.bug.count({
        where: {
          projectId,
          severity: 'critical',
          status: {
            notIn: ['closed', 'shipped'],
          },
        },
      });

      // Get total hours
      const hoursResult = await prisma.bug.aggregate({
        where: {
          projectId,
          actualHours: {
            not: null,
          },
        },
        _sum: {
          actualHours: true,
        },
      });

      const totalHours = Number(hoursResult._sum.actualHours || 0);

      // Get revenue at risk
      const criticalBugsData = await prisma.bug.findMany({
        where: {
          projectId,
          severity: 'critical',
          status: {
            notIn: ['closed', 'shipped'],
          },
          revenueImpact: {
            not: null,
          },
        },
        include: {
          project: true,
        },
      });

      const revenueRisk = calculateRevenueAtRisk(criticalBugsData);

      // Get velocity (commits in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const metrics = await prisma.projectMetric.findMany({
        where: {
          projectId,
          date: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          commitsCount: true,
        },
      });

      const totalCommits = metrics.reduce((sum, m) => sum + m.commitsCount, 0);
      const velocity = totalCommits / 30; // commits per day

      // Get risk score
      const riskyProjects = await getTopRiskyProjects(100);
      const riskScore = riskyProjects.find(p => p.projectId === projectId) || null;

      return {
        activeBugs,
        criticalBugs,
        totalHours,
        revenueAtRisk: revenueRisk.totalDailyLoss,
        velocity,
        riskScore,
      };
    }
  );
}

/**
 * Get KPI comparison (current vs previous period)
 *
 * @param days - Number of days to compare
 * @returns Current and previous period KPIs
 */
export async function getKPIComparison(days: number = 30): Promise<{
  current: {
    activeBugs: number;
    criticalBugs: number;
    totalHours: number;
    commitsCount: number;
  };
  previous: {
    activeBugs: number;
    criticalBugs: number;
    totalHours: number;
    commitsCount: number;
  };
  change: {
    activeBugs: number;
    criticalBugs: number;
    totalHours: number;
    commitsCount: number;
  };
}> {
  const now = new Date();
  const currentPeriodStart = new Date();
  currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);

  const previousPeriodEnd = new Date(currentPeriodStart);

  // Current period
  const currentActiveBugs = await prisma.bug.count({
    where: {
      createdAt: { gte: currentPeriodStart, lte: now },
      status: { notIn: ['closed', 'shipped'] },
    },
  });

  const currentCriticalBugs = await prisma.bug.count({
    where: {
      createdAt: { gte: currentPeriodStart, lte: now },
      severity: 'critical',
      status: { notIn: ['closed', 'shipped'] },
    },
  });

  const currentHours = await prisma.bug.aggregate({
    where: {
      updatedAt: { gte: currentPeriodStart, lte: now },
      actualHours: { not: null },
    },
    _sum: { actualHours: true },
  });

  const currentMetrics = await prisma.projectMetric.findMany({
    where: { date: { gte: currentPeriodStart, lte: now } },
    select: { commitsCount: true },
  });

  const currentCommits = currentMetrics.reduce((sum, m) => sum + m.commitsCount, 0);

  // Previous period
  const previousActiveBugs = await prisma.bug.count({
    where: {
      createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
      status: { notIn: ['closed', 'shipped'] },
    },
  });

  const previousCriticalBugs = await prisma.bug.count({
    where: {
      createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
      severity: 'critical',
      status: { notIn: ['closed', 'shipped'] },
    },
  });

  const previousHours = await prisma.bug.aggregate({
    where: {
      updatedAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
      actualHours: { not: null },
    },
    _sum: { actualHours: true },
  });

  const previousMetrics = await prisma.projectMetric.findMany({
    where: { date: { gte: previousPeriodStart, lte: previousPeriodEnd } },
    select: { commitsCount: true },
  });

  const previousCommits = previousMetrics.reduce((sum, m) => sum + m.commitsCount, 0);

  return {
    current: {
      activeBugs: currentActiveBugs,
      criticalBugs: currentCriticalBugs,
      totalHours: Number(currentHours._sum.actualHours || 0),
      commitsCount: currentCommits,
    },
    previous: {
      activeBugs: previousActiveBugs,
      criticalBugs: previousCriticalBugs,
      totalHours: Number(previousHours._sum.actualHours || 0),
      commitsCount: previousCommits,
    },
    change: {
      activeBugs: currentActiveBugs - previousActiveBugs,
      criticalBugs: currentCriticalBugs - previousCriticalBugs,
      totalHours: Number(currentHours._sum.actualHours || 0) - Number(previousHours._sum.actualHours || 0),
      commitsCount: currentCommits - previousCommits,
    },
  };
}
