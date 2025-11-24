/**
 * Type Definitions for Metrics Engine
 *
 * Shared types used across all metrics calculation modules
 */

import { BugSeverity, BugStatus, ProjectStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Bug cost calculation result
 */
export interface BugCost {
  bugId: string;
  bugNumber: string;
  severity: BugSeverity;
  actualHours: number;
  hourlyRate: number;
  monetaryCost: number;
  severityMultiplier: number;
}

/**
 * Engineering effort calculation result
 */
export interface EngineeringEffort {
  totalHours: number;
  trackedHours: number;
  inferredHours: number;
  commitCount: number;
  averageHoursPerCommit: number;
}

/**
 * Revenue at risk calculation result
 */
export interface RevenueAtRisk {
  totalDailyLoss: number;
  projectedMonthlyLoss: number;
  projectedAnnualLoss: number;
  criticalBugCount: number;
  blockerCount: number;
  affectedProjects: string[];
}

/**
 * Velocity metrics
 */
export interface VelocityMetrics {
  averageCycleTime: number; // hours
  deploymentFrequency: number; // per week
  commitVelocity: number; // commits per day
  bugResolutionRate: number; // bugs per week
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Project risk score components
 */
export interface ProjectRiskScore {
  projectId: string;
  projectName: string;
  overallScore: number; // 0-100
  components: {
    criticalBugsScore: number;
    stalledPRsScore: number;
    lowActivityScore: number;
    overdueMilestonesScore: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Daily metrics snapshot
 */
export interface DailyMetrics {
  date: Date;
  bugsOpened: number;
  bugsClosed: number;
  commitsCount: number;
  prsOpened: number;
  prsMerged: number;
  hoursSpent: number;
  revenueAtRisk: number;
  activeProjects: number;
  criticalBugs: number;
}

/**
 * Dashboard KPI result
 */
export interface DashboardKPIs {
  totalProjects: number;
  activeProjects: number;
  activeBugs: number;
  criticalBugs: number;
  totalEngineeringHours: number;
  revenueAtRisk: number;
  averageVelocity: number;
  topRiskyProjects: ProjectRiskScore[];
  lastUpdated: Date;
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  date: Date;
  value: number;
  label?: string;
}

/**
 * Bug trend analysis
 */
export interface BugTrends {
  creationTrend: TrendDataPoint[];
  resolutionTrend: TrendDataPoint[];
  netChange: TrendDataPoint[];
  averageResolutionTime: number; // days
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Commit trend analysis
 */
export interface CommitTrends {
  commitActivity: TrendDataPoint[];
  contributorActivity: TrendDataPoint[];
  averageCommitsPerDay: number;
  mostActiveDay: string;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Cost trend analysis
 */
export interface CostTrends {
  spendingByMonth: TrendDataPoint[];
  cumulativeSpending: TrendDataPoint[];
  bugCostBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalCost: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Velocity trend analysis
 */
export interface VelocityTrends {
  cycleTimeTrend: TrendDataPoint[];
  deploymentFrequencyTrend: TrendDataPoint[];
  throughputTrend: TrendDataPoint[];
  averageVelocity: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Activity data for effort calculation
 */
export interface ActivityData {
  bugId?: string;
  projectId?: string;
  hours?: number | Decimal | null;
  commits?: number;
  type: 'bug' | 'commit' | 'pr';
  timestamp: Date;
}

/**
 * Project data for risk scoring
 */
export interface ProjectRiskData {
  id: string;
  name: string;
  status: ProjectStatus;
  criticalBugCount: number;
  stalledPRCount: number;
  lastCommitDate: Date | null;
  currentMilestone: number;
  totalMilestones: number;
  lastActivityDate: Date | null;
}
