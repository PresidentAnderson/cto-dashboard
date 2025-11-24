/**
 * Unit Tests for Core Metrics Calculator
 *
 * Run with: npm test calculator.test.ts
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateBugCost,
  calculateEngineeringEffort,
  calculateRevenueAtRisk,
  calculateProjectRiskScore,
  calculateTotalBugCost,
} from './calculator';
import { Bug, BugSeverity, BugStatus, Project, ProjectStatus } from '@prisma/client';
import { ActivityData, ProjectRiskData } from './types';

// Mock bugs for testing
const createMockBug = (
  severity: BugSeverity,
  actualHours: number | null
): Partial<Bug> => ({
  id: `bug-${Math.random()}`,
  bugNumber: `BUG-${Math.floor(Math.random() * 1000)}`,
  title: 'Test Bug',
  severity,
  status: 'in_progress' as BugStatus,
  actualHours: actualHours ? new Decimal(actualHours) : null,
  slaHours: 24,
  isBlocker: false,
  priorityScore: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedToId: null,
  projectId: null,
  businessImpact: null,
  revenueImpact: null,
  estimatedHours: null,
  resolvedAt: null,
  createdById: null,
  description: null,
});

describe('calculateBugCost', () => {
  it('should calculate cost for bugs with actual hours', () => {
    const bugs = [
      createMockBug('critical', 8),
      createMockBug('high', 4),
      createMockBug('medium', 2),
      createMockBug('low', 1),
    ] as Bug[];

    const costs = calculateBugCost(bugs);

    expect(costs).toHaveLength(4);

    // Critical: 8 hours × $150 × 3.0 = $3,600
    expect(costs[0].monetaryCost).toBe(3600);
    expect(costs[0].severityMultiplier).toBe(3.0);

    // High: 4 hours × $150 × 2.0 = $1,200
    expect(costs[1].monetaryCost).toBe(1200);
    expect(costs[1].severityMultiplier).toBe(2.0);

    // Medium: 2 hours × $150 × 1.0 = $300
    expect(costs[2].monetaryCost).toBe(300);
    expect(costs[2].severityMultiplier).toBe(1.0);

    // Low: 1 hour × $150 × 0.5 = $75
    expect(costs[3].monetaryCost).toBe(75);
    expect(costs[3].severityMultiplier).toBe(0.5);
  });

  it('should filter out bugs without actual hours', () => {
    const bugs = [
      createMockBug('critical', 8),
      createMockBug('high', null),
      createMockBug('medium', 0),
    ] as Bug[];

    const costs = calculateBugCost(bugs);

    expect(costs).toHaveLength(1);
    expect(costs[0].actualHours).toBe(8);
  });

  it('should handle empty bug array', () => {
    const costs = calculateBugCost([]);
    expect(costs).toHaveLength(0);
  });
});

describe('calculateEngineeringEffort', () => {
  it('should calculate total effort from tracked hours and commits', () => {
    const activities: ActivityData[] = [
      {
        type: 'bug',
        hours: 10,
        timestamp: new Date(),
      },
      {
        type: 'bug',
        hours: new Decimal(5),
        timestamp: new Date(),
      },
      {
        type: 'commit',
        commits: 8,
        timestamp: new Date(),
      },
    ];

    const effort = calculateEngineeringEffort(activities);

    expect(effort.trackedHours).toBe(15);
    expect(effort.commitCount).toBe(8);
    expect(effort.inferredHours).toBe(16); // 8 commits × 2 hours
    expect(effort.totalHours).toBe(31); // 15 + 16
    expect(effort.averageHoursPerCommit).toBe(2);
  });

  it('should handle activities with no tracked hours', () => {
    const activities: ActivityData[] = [
      {
        type: 'commit',
        commits: 10,
        timestamp: new Date(),
      },
    ];

    const effort = calculateEngineeringEffort(activities);

    expect(effort.trackedHours).toBe(0);
    expect(effort.commitCount).toBe(10);
    expect(effort.inferredHours).toBe(20);
    expect(effort.totalHours).toBe(20);
  });

  it('should handle empty activities', () => {
    const effort = calculateEngineeringEffort([]);

    expect(effort.totalHours).toBe(0);
    expect(effort.trackedHours).toBe(0);
    expect(effort.inferredHours).toBe(0);
    expect(effort.commitCount).toBe(0);
  });
});

describe('calculateRevenueAtRisk', () => {
  it('should calculate total revenue at risk from critical bugs', () => {
    const criticalBugs = [
      {
        ...createMockBug('critical', 8),
        revenueImpact: new Decimal(1000),
        isBlocker: false,
        project: { name: 'Project A' } as Project,
      },
      {
        ...createMockBug('critical', 4),
        revenueImpact: new Decimal(2000),
        isBlocker: true,
        project: { name: 'Project B' } as Project,
      },
      {
        ...createMockBug('critical', 2),
        revenueImpact: new Decimal(500),
        isBlocker: false,
        project: { name: 'Project A' } as Project,
      },
    ] as Array<Bug & { project?: Project | null }>;

    const risk = calculateRevenueAtRisk(criticalBugs);

    // Daily loss: 1000 + (2000 × 2.0 blocker) + 500 = 5500
    expect(risk.totalDailyLoss).toBe(5500);
    expect(risk.projectedMonthlyLoss).toBe(165000); // 5500 × 30
    expect(risk.projectedAnnualLoss).toBe(2007500); // 5500 × 365
    expect(risk.criticalBugCount).toBe(3);
    expect(risk.blockerCount).toBe(1);
    expect(risk.affectedProjects).toContain('Project A');
    expect(risk.affectedProjects).toContain('Project B');
  });

  it('should handle bugs without revenue impact', () => {
    const criticalBugs = [
      {
        ...createMockBug('critical', 8),
        revenueImpact: null,
        project: null,
      },
    ] as Array<Bug & { project?: Project | null }>;

    const risk = calculateRevenueAtRisk(criticalBugs);

    expect(risk.totalDailyLoss).toBe(0);
    expect(risk.criticalBugCount).toBe(1);
    expect(risk.affectedProjects).toHaveLength(0);
  });

  it('should handle empty bug array', () => {
    const risk = calculateRevenueAtRisk([]);

    expect(risk.totalDailyLoss).toBe(0);
    expect(risk.criticalBugCount).toBe(0);
    expect(risk.blockerCount).toBe(0);
    expect(risk.affectedProjects).toHaveLength(0);
  });
});

describe('calculateProjectRiskScore', () => {
  it('should calculate risk score with all factors', () => {
    const projectData: ProjectRiskData = {
      id: 'project-1',
      name: 'High Risk Project',
      status: 'active' as ProjectStatus,
      criticalBugCount: 5, // Should be 100 score (5+ bugs)
      stalledPRCount: 8, // Should be 80 score
      lastCommitDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
      currentMilestone: 1,
      totalMilestones: 5,
      lastActivityDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    };

    const riskScore = calculateProjectRiskScore(projectData);

    expect(riskScore.projectId).toBe('project-1');
    expect(riskScore.projectName).toBe('High Risk Project');
    expect(riskScore.overallScore).toBeGreaterThan(50);
    expect(riskScore.components.criticalBugsScore).toBe(100);
    expect(riskScore.components.stalledPRsScore).toBe(80);
    expect(riskScore.components.lowActivityScore).toBeGreaterThan(80);
    expect(riskScore.riskLevel).toBe('critical');
  });

  it('should calculate low risk for healthy project', () => {
    const projectData: ProjectRiskData = {
      id: 'project-2',
      name: 'Healthy Project',
      status: 'active' as ProjectStatus,
      criticalBugCount: 0,
      stalledPRCount: 0,
      lastCommitDate: new Date(), // today
      currentMilestone: 4,
      totalMilestones: 5,
      lastActivityDate: new Date(), // today
    };

    const riskScore = calculateProjectRiskScore(projectData);

    expect(riskScore.overallScore).toBeLessThan(25);
    expect(riskScore.components.criticalBugsScore).toBe(0);
    expect(riskScore.components.stalledPRsScore).toBe(0);
    expect(riskScore.components.lowActivityScore).toBe(0);
    expect(riskScore.riskLevel).toBe('low');
  });

  it('should handle project with no activity', () => {
    const projectData: ProjectRiskData = {
      id: 'project-3',
      name: 'Stalled Project',
      status: 'active' as ProjectStatus,
      criticalBugCount: 0,
      stalledPRCount: 0,
      lastCommitDate: null,
      currentMilestone: 0,
      totalMilestones: 5,
      lastActivityDate: null,
    };

    const riskScore = calculateProjectRiskScore(projectData);

    expect(riskScore.components.lowActivityScore).toBe(100);
    expect(riskScore.components.overdueMilestonesScore).toBe(100);
  });

  it('should categorize risk levels correctly', () => {
    const testCases = [
      { score: 85, expected: 'critical' },
      { score: 65, expected: 'high' },
      { score: 40, expected: 'medium' },
      { score: 15, expected: 'low' },
    ];

    testCases.forEach(({ score, expected }) => {
      // Create project data that will produce the target score
      const projectData: ProjectRiskData = {
        id: 'project',
        name: 'Test Project',
        status: 'active' as ProjectStatus,
        criticalBugCount: Math.floor((score / 100) * 5),
        stalledPRCount: 0,
        lastCommitDate: new Date(),
        currentMilestone: 3,
        totalMilestones: 5,
        lastActivityDate: new Date(),
      };

      const riskScore = calculateProjectRiskScore(projectData);

      // Allow for slight variation in score due to weighted calculation
      if (score >= 75) expect(riskScore.riskLevel).toBe('critical');
      else if (score >= 50) expect(riskScore.riskLevel).toBe('high');
      else if (score >= 25) expect(riskScore.riskLevel).toBe('medium');
      else expect(riskScore.riskLevel).toBe('low');
    });
  });
});

describe('calculateTotalBugCost', () => {
  it('should aggregate costs by severity', () => {
    const bugs = [
      createMockBug('critical', 8),
      createMockBug('critical', 4),
      createMockBug('high', 6),
      createMockBug('medium', 3),
      createMockBug('low', 2),
    ] as Bug[];

    const totals = calculateTotalBugCost(bugs);

    // Critical: (8 × 150 × 3.0) + (4 × 150 × 3.0) = 3600 + 1800 = 5400
    expect(totals.byCritical).toBe(5400);

    // High: 6 × 150 × 2.0 = 1800
    expect(totals.byHigh).toBe(1800);

    // Medium: 3 × 150 × 1.0 = 450
    expect(totals.byMedium).toBe(450);

    // Low: 2 × 150 × 0.5 = 150
    expect(totals.byLow).toBe(150);

    // Total: 5400 + 1800 + 450 + 150 = 7800
    expect(totals.totalCost).toBe(7800);
    expect(totals.bugCount).toBe(5);
  });

  it('should handle empty bug array', () => {
    const totals = calculateTotalBugCost([]);

    expect(totals.totalCost).toBe(0);
    expect(totals.byCritical).toBe(0);
    expect(totals.byHigh).toBe(0);
    expect(totals.byMedium).toBe(0);
    expect(totals.byLow).toBe(0);
    expect(totals.bugCount).toBe(0);
  });
});
