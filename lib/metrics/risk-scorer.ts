/**
 * Risk Scoring System
 *
 * Calculates project risk scores using a weighted model with configurable parameters.
 * Factors: critical bugs, stalled PRs, low activity, overdue milestones.
 */

import { prisma } from '@/lib/prisma';
import { ProjectRiskScore, ProjectRiskData } from './types';
import { calculateProjectRiskScore } from './calculator';
import { withCache, generateCacheKey } from './cache';

/**
 * Get risk data for all active projects
 *
 * @returns Array of project risk data
 */
async function getProjectRiskData(): Promise<ProjectRiskData[]> {
  const projects = await prisma.project.findMany({
    where: {
      status: 'active',
    },
    include: {
      bugs: {
        where: {
          severity: 'critical',
          status: {
            notIn: ['closed', 'shipped'],
          },
        },
        select: {
          id: true,
        },
      },
      metrics: {
        orderBy: {
          date: 'desc',
        },
        take: 1,
        select: {
          date: true,
        },
      },
    },
  });

  return projects.map(project => {
    // Get last activity date
    let lastActivityDate: Date | null = null;
    if (project.lastCommit) {
      lastActivityDate = project.lastCommit;
    } else if (project.metrics.length > 0) {
      lastActivityDate = project.metrics[0].date;
    }

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      criticalBugCount: project.bugs.length,
      stalledPRCount: 0, // TODO: Add PR tracking
      lastCommitDate: project.lastCommit,
      currentMilestone: project.currentMilestone,
      totalMilestones: project.totalMilestones,
      lastActivityDate,
    };
  });
}

/**
 * Calculate risk scores for all active projects
 *
 * @returns Array of project risk scores, sorted by risk (highest first)
 */
export async function calculateAllProjectRisks(): Promise<ProjectRiskScore[]> {
  return withCache(
    generateCacheKey('risk', 'all-projects'),
    async () => {
      const projectData = await getProjectRiskData();

      const riskScores = projectData.map(project =>
        calculateProjectRiskScore(project)
      );

      // Sort by risk score (highest first)
      return riskScores.sort((a, b) => b.overallScore - a.overallScore);
    }
  );
}

/**
 * Get top N risky projects
 *
 * @param limit - Number of projects to return (default 10)
 * @returns Top risky projects
 */
export async function getTopRiskyProjects(limit: number = 10): Promise<ProjectRiskScore[]> {
  return withCache(
    generateCacheKey('risk', 'top-risky', limit),
    async () => {
      const allRisks = await calculateAllProjectRisks();
      return allRisks.slice(0, limit);
    }
  );
}

/**
 * Get risk score for a specific project
 *
 * @param projectId - Project ID
 * @returns Project risk score or null if not found
 */
export async function getProjectRiskScore(
  projectId: string
): Promise<ProjectRiskScore | null> {
  return withCache(
    generateCacheKey('risk', 'project', projectId),
    async () => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          bugs: {
            where: {
              severity: 'critical',
              status: {
                notIn: ['closed', 'shipped'],
              },
            },
            select: {
              id: true,
            },
          },
          metrics: {
            orderBy: {
              date: 'desc',
            },
            take: 1,
            select: {
              date: true,
            },
          },
        },
      });

      if (!project) {
        return null;
      }

      // Get last activity date
      let lastActivityDate: Date | null = null;
      if (project.lastCommit) {
        lastActivityDate = project.lastCommit;
      } else if (project.metrics.length > 0) {
        lastActivityDate = project.metrics[0].date;
      }

      const projectData: ProjectRiskData = {
        id: project.id,
        name: project.name,
        status: project.status,
        criticalBugCount: project.bugs.length,
        stalledPRCount: 0, // TODO: Add PR tracking
        lastCommitDate: project.lastCommit,
        currentMilestone: project.currentMilestone,
        totalMilestones: project.totalMilestones,
        lastActivityDate,
      };

      return calculateProjectRiskScore(projectData);
    }
  );
}

/**
 * Get projects by risk level
 *
 * @param riskLevel - Risk level to filter by
 * @returns Projects matching the risk level
 */
export async function getProjectsByRiskLevel(
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): Promise<ProjectRiskScore[]> {
  return withCache(
    generateCacheKey('risk', 'by-level', riskLevel),
    async () => {
      const allRisks = await calculateAllProjectRisks();
      return allRisks.filter(risk => risk.riskLevel === riskLevel);
    }
  );
}

/**
 * Get risk distribution across all projects
 *
 * @returns Distribution of projects by risk level
 */
export async function getRiskDistribution(): Promise<{
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}> {
  return withCache(
    generateCacheKey('risk', 'distribution'),
    async () => {
      const allRisks = await calculateAllProjectRisks();

      const distribution = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: allRisks.length,
      };

      for (const risk of allRisks) {
        distribution[risk.riskLevel]++;
      }

      return distribution;
    }
  );
}

/**
 * Get projects with increasing risk (trend analysis)
 *
 * Compares current risk score with historical data
 * Note: Requires historical risk scores to be stored
 *
 * @returns Projects with increasing risk
 */
export async function getProjectsWithIncreasingRisk(): Promise<
  Array<{
    project: ProjectRiskScore;
    previousScore: number;
    change: number;
  }>
> {
  // TODO: Implement once historical risk scores are stored
  // For now, return empty array
  return [];
}

/**
 * Get risk score breakdown for portfolio
 *
 * @returns Aggregate risk metrics across all projects
 */
export async function getPortfolioRiskMetrics(): Promise<{
  averageRiskScore: number;
  medianRiskScore: number;
  highRiskCount: number;
  criticalRiskCount: number;
  totalProjects: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
}> {
  return withCache(
    generateCacheKey('risk', 'portfolio-metrics'),
    async () => {
      const allRisks = await calculateAllProjectRisks();

      if (allRisks.length === 0) {
        return {
          averageRiskScore: 0,
          medianRiskScore: 0,
          highRiskCount: 0,
          criticalRiskCount: 0,
          totalProjects: 0,
          riskTrend: 'stable',
        };
      }

      // Calculate average
      const totalScore = allRisks.reduce((sum, risk) => sum + risk.overallScore, 0);
      const averageRiskScore = totalScore / allRisks.length;

      // Calculate median
      const sortedScores = allRisks.map(r => r.overallScore).sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedScores.length / 2);
      const medianRiskScore =
        sortedScores.length % 2 === 0
          ? (sortedScores[medianIndex - 1] + sortedScores[medianIndex]) / 2
          : sortedScores[medianIndex];

      // Count high and critical risk projects
      const highRiskCount = allRisks.filter(r => r.riskLevel === 'high').length;
      const criticalRiskCount = allRisks.filter(r => r.riskLevel === 'critical').length;

      // TODO: Calculate trend from historical data
      const riskTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

      return {
        averageRiskScore: Math.round(averageRiskScore),
        medianRiskScore: Math.round(medianRiskScore),
        highRiskCount,
        criticalRiskCount,
        totalProjects: allRisks.length,
        riskTrend,
      };
    }
  );
}

/**
 * Get risk alerts for immediate attention
 *
 * @returns Projects requiring immediate attention
 */
export async function getRiskAlerts(): Promise<
  Array<{
    project: ProjectRiskScore;
    alerts: string[];
    severity: 'warning' | 'critical';
  }>
> {
  const allRisks = await calculateAllProjectRisks();

  return allRisks
    .filter(risk => risk.riskLevel === 'critical' || risk.riskLevel === 'high')
    .map(risk => {
      const alerts: string[] = [];

      if (risk.components.criticalBugsScore >= 80) {
        alerts.push(`${risk.components.criticalBugsScore}% critical bugs severity`);
      }

      if (risk.components.lowActivityScore >= 80) {
        alerts.push('Project appears stalled (no recent activity)');
      }

      if (risk.components.overdueMilestonesScore >= 80) {
        alerts.push('Significantly behind milestone schedule');
      }

      if (risk.components.stalledPRsScore >= 80) {
        alerts.push('Multiple stalled pull requests');
      }

      return {
        project: risk,
        alerts,
        severity: risk.riskLevel === 'critical' ? 'critical' : 'warning',
      };
    });
}

/**
 * Export risk report for all projects
 *
 * @returns Complete risk assessment data
 */
export async function exportRiskReport(): Promise<{
  generatedAt: Date;
  projects: ProjectRiskScore[];
  portfolio: {
    averageRiskScore: number;
    medianRiskScore: number;
    distribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  alerts: Array<{
    project: ProjectRiskScore;
    alerts: string[];
    severity: 'warning' | 'critical';
  }>;
}> {
  const [projects, portfolioMetrics, alerts, distribution] = await Promise.all([
    calculateAllProjectRisks(),
    getPortfolioRiskMetrics(),
    getRiskAlerts(),
    getRiskDistribution(),
  ]);

  return {
    generatedAt: new Date(),
    projects,
    portfolio: {
      averageRiskScore: portfolioMetrics.averageRiskScore,
      medianRiskScore: portfolioMetrics.medianRiskScore,
      distribution: {
        critical: distribution.critical,
        high: distribution.high,
        medium: distribution.medium,
        low: distribution.low,
      },
    },
    alerts,
  };
}
