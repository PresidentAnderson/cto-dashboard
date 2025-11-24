/**
 * Core Metrics Calculator
 *
 * Fundamental calculation functions for bug costs, engineering effort,
 * revenue at risk, velocity, and project risk scoring.
 */

import { Bug, BugSeverity, Project, ProjectStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { getConfig } from './config';
import {
  BugCost,
  EngineeringEffort,
  RevenueAtRisk,
  VelocityMetrics,
  ProjectRiskScore,
  ActivityData,
  ProjectRiskData,
} from './types';

/**
 * Calculate monetary cost for bugs based on actual hours spent
 *
 * Formula: monetary_cost = Σ(actual_hours × hourly_rate × severity_multiplier)
 *
 * @param bugs - Array of bugs with actual hours tracked
 * @returns Array of bug costs with detailed breakdown
 */
export function calculateBugCost(bugs: Bug[]): BugCost[] {
  const config = getConfig();
  const { hourlyRate, bugCost } = config;

  return bugs
    .filter(bug => bug.actualHours && Number(bug.actualHours) > 0)
    .map(bug => {
      const actualHours = Number(bug.actualHours);

      // Get severity multiplier
      let severityMultiplier = 1.0;
      switch (bug.severity) {
        case 'critical':
          severityMultiplier = bugCost.criticalMultiplier;
          break;
        case 'high':
          severityMultiplier = bugCost.highMultiplier;
          break;
        case 'medium':
          severityMultiplier = bugCost.mediumMultiplier;
          break;
        case 'low':
          severityMultiplier = bugCost.lowMultiplier;
          break;
      }

      const monetaryCost = actualHours * hourlyRate * severityMultiplier;

      return {
        bugId: bug.id,
        bugNumber: bug.bugNumber,
        severity: bug.severity,
        actualHours,
        hourlyRate,
        monetaryCost,
        severityMultiplier,
      };
    });
}

/**
 * Calculate total engineering effort from tracked hours and inferred from commits
 *
 * Formula: total_hours = tracked_hours + (commits × avg_hours_per_commit)
 *
 * @param activities - Array of activity data (bugs, commits, PRs)
 * @returns Engineering effort breakdown
 */
export function calculateEngineeringEffort(
  activities: ActivityData[]
): EngineeringEffort {
  let trackedHours = 0;
  let commitCount = 0;

  // Default: 2 hours per commit if no tracked data
  const HOURS_PER_COMMIT = 2;

  for (const activity of activities) {
    if (activity.type === 'bug' && activity.hours) {
      const hours = activity.hours instanceof Decimal
        ? Number(activity.hours)
        : activity.hours;
      trackedHours += hours;
    }

    if (activity.type === 'commit' && activity.commits) {
      commitCount += activity.commits;
    }
  }

  // Infer hours from commits (only if we don't have tracked hours for them)
  const inferredHours = commitCount * HOURS_PER_COMMIT;
  const totalHours = trackedHours + inferredHours;

  return {
    totalHours,
    trackedHours,
    inferredHours,
    commitCount,
    averageHoursPerCommit: HOURS_PER_COMMIT,
  };
}

/**
 * Calculate revenue at risk from critical and blocker bugs
 *
 * Formula: revenue_at_risk = Σ(daily_impact × projection_days × blocker_multiplier)
 *
 * @param criticalBugs - Array of critical/blocker bugs with revenue impact
 * @returns Revenue at risk breakdown
 */
export function calculateRevenueAtRisk(
  criticalBugs: (Bug & { project?: Project | null })[]
): RevenueAtRisk {
  const config = getConfig();
  const { projectionDays, blockerMultiplier } = config.revenueRisk;

  let totalDailyLoss = 0;
  let blockerCount = 0;
  const affectedProjects = new Set<string>();

  for (const bug of criticalBugs) {
    if (bug.revenueImpact) {
      const dailyImpact = Number(bug.revenueImpact);
      const multiplier = bug.isBlocker ? blockerMultiplier : 1.0;
      totalDailyLoss += dailyImpact * multiplier;

      if (bug.isBlocker) {
        blockerCount++;
      }

      if (bug.project?.name) {
        affectedProjects.add(bug.project.name);
      }
    }
  }

  const projectedMonthlyLoss = totalDailyLoss * projectionDays;
  const projectedAnnualLoss = totalDailyLoss * 365;

  return {
    totalDailyLoss,
    projectedMonthlyLoss,
    projectedAnnualLoss,
    criticalBugCount: criticalBugs.length,
    blockerCount,
    affectedProjects: Array.from(affectedProjects),
  };
}

/**
 * Calculate velocity metrics (cycle time, deployment frequency)
 *
 * @param projectId - Project ID to calculate velocity for
 * @param lookbackDays - Number of days to look back (default from config)
 * @returns Velocity metrics
 */
export async function calculateVelocity(
  projectId: string,
  lookbackDays?: number
): Promise<VelocityMetrics> {
  const config = getConfig();
  const days = lookbackDays || config.velocity.lookbackDays;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get bugs resolved in period
  const resolvedBugs = await prisma.bug.findMany({
    where: {
      projectId,
      resolvedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
    },
  });

  // Calculate average cycle time (hours)
  let totalCycleTime = 0;
  for (const bug of resolvedBugs) {
    if (bug.resolvedAt) {
      const cycleTime = bug.resolvedAt.getTime() - bug.createdAt.getTime();
      totalCycleTime += cycleTime;
    }
  }

  const averageCycleTime = resolvedBugs.length > 0
    ? totalCycleTime / resolvedBugs.length / (1000 * 60 * 60) // Convert to hours
    : 0;

  // Get commit count for period
  const metrics = await prisma.projectMetric.findMany({
    where: {
      projectId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      commitsCount: true,
      date: true,
    },
  });

  const totalCommits = metrics.reduce((sum, m) => sum + m.commitsCount, 0);
  const commitVelocity = totalCommits / days;

  // Deployment frequency (assuming 1 deployment per 5 commits as baseline)
  const deploymentFrequency = (totalCommits / 5) / (days / 7); // per week

  // Bug resolution rate
  const bugResolutionRate = resolvedBugs.length / (days / 7); // per week

  return {
    averageCycleTime,
    deploymentFrequency,
    commitVelocity,
    bugResolutionRate,
    period: {
      start: startDate,
      end: endDate,
    },
  };
}

/**
 * Calculate project risk score (0-100) using weighted model
 *
 * Factors:
 * - Critical bugs (40%)
 * - Stalled PRs (25%)
 * - Low activity (20%)
 * - Overdue milestones (15%)
 *
 * @param project - Project data with risk indicators
 * @returns Risk score with component breakdown
 */
export function calculateProjectRiskScore(
  project: ProjectRiskData
): ProjectRiskScore {
  const config = getConfig();
  const weights = config.riskWeights;

  // 1. Critical Bugs Score (0-100)
  // Scale: 0 bugs = 0, 5+ bugs = 100
  const criticalBugsScore = Math.min(100, (project.criticalBugCount / 5) * 100);

  // 2. Stalled PRs Score (0-100)
  // Scale: 0 stalled = 0, 10+ stalled = 100
  const stalledPRsScore = Math.min(100, (project.stalledPRCount / 10) * 100);

  // 3. Low Activity Score (0-100)
  // Scale: Active today = 0, 30+ days inactive = 100
  let lowActivityScore = 0;
  if (project.lastActivityDate) {
    const daysSinceActivity = Math.floor(
      (Date.now() - project.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    lowActivityScore = Math.min(100, (daysSinceActivity / 30) * 100);
  } else {
    lowActivityScore = 100; // No activity recorded
  }

  // 4. Overdue Milestones Score (0-100)
  // Scale: On track = 0, significantly behind = 100
  let overdueMilestonesScore = 0;
  if (project.totalMilestones > 0) {
    const progressRatio = project.currentMilestone / project.totalMilestones;
    // If less than 50% complete and inactive, increase score
    if (progressRatio < 0.5 && lowActivityScore > 50) {
      overdueMilestonesScore = 100;
    } else if (progressRatio < 0.75) {
      overdueMilestonesScore = 50;
    }
  }

  // Calculate weighted overall score
  const overallScore = Math.round(
    (criticalBugsScore * weights.criticalBugs +
      stalledPRsScore * weights.stalledPRs +
      lowActivityScore * weights.lowActivity +
      overdueMilestonesScore * weights.overdueMilestones) /
      100
  );

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (overallScore >= 75) {
    riskLevel = 'critical';
  } else if (overallScore >= 50) {
    riskLevel = 'high';
  } else if (overallScore >= 25) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    projectId: project.id,
    projectName: project.name,
    overallScore,
    components: {
      criticalBugsScore: Math.round(criticalBugsScore),
      stalledPRsScore: Math.round(stalledPRsScore),
      lowActivityScore: Math.round(lowActivityScore),
      overdueMilestonesScore: Math.round(overdueMilestonesScore),
    },
    riskLevel,
  };
}

/**
 * Calculate aggregate bug costs for a set of bugs
 *
 * @param bugs - Array of bugs
 * @returns Total monetary cost and breakdown
 */
export function calculateTotalBugCost(bugs: Bug[]): {
  totalCost: number;
  byCritical: number;
  byHigh: number;
  byMedium: number;
  byLow: number;
  bugCount: number;
} {
  const costs = calculateBugCost(bugs);

  let totalCost = 0;
  let byCritical = 0;
  let byHigh = 0;
  let byMedium = 0;
  let byLow = 0;

  for (const cost of costs) {
    totalCost += cost.monetaryCost;

    switch (cost.severity) {
      case 'critical':
        byCritical += cost.monetaryCost;
        break;
      case 'high':
        byHigh += cost.monetaryCost;
        break;
      case 'medium':
        byMedium += cost.monetaryCost;
        break;
      case 'low':
        byLow += cost.monetaryCost;
        break;
    }
  }

  return {
    totalCost,
    byCritical,
    byHigh,
    byMedium,
    byLow,
    bugCount: costs.length,
  };
}
