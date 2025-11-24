/**
 * Metrics Engine - Main Export
 *
 * Central export point for all metrics calculation functions.
 * Use this to import metrics functionality throughout the application.
 *
 * @example
 * ```typescript
 * import { getDashboardKPIs, calculateBugCost, getBugTrends } from '@/lib/metrics';
 *
 * // Get dashboard KPIs
 * const kpis = await getDashboardKPIs();
 *
 * // Calculate bug costs
 * const costs = calculateBugCost(bugs);
 *
 * // Get bug trends
 * const trends = await getBugTrends({ start: new Date('2025-01-01'), end: new Date() });
 * ```
 */

// Configuration
export { getConfig, defaultConfig, validateConfig } from './config';
export type { MetricsConfig } from './config';

// Types
export type {
  BugCost,
  EngineeringEffort,
  RevenueAtRisk,
  VelocityMetrics,
  ProjectRiskScore,
  DailyMetrics,
  DashboardKPIs,
  TrendDataPoint,
  BugTrends,
  CommitTrends,
  CostTrends,
  VelocityTrends,
  DateRange,
  ActivityData,
  ProjectRiskData,
} from './types';

// Core Calculators
export {
  calculateBugCost,
  calculateEngineeringEffort,
  calculateRevenueAtRisk,
  calculateVelocity,
  calculateProjectRiskScore,
  calculateTotalBugCost,
} from './calculator';

// Daily Metrics
export {
  buildDailyMetrics,
  persistDailyMetrics,
  buildMetricsRange,
  getDailyMetrics,
  backfillDailyMetrics,
  calculateRollingAverages,
} from './daily-metrics';

// Dashboard KPIs
export {
  getTotalProjects,
  getActiveProjects,
  getActiveBugs,
  getCriticalBugs,
  getTotalEngineeringHours,
  getRevenueAtRisk,
  getAverageVelocity,
  getDashboardKPIs,
  getProjectKPIs,
  getKPIComparison,
} from './dashboard-kpis';

// Risk Scoring
export {
  calculateAllProjectRisks,
  getTopRiskyProjects,
  getProjectRiskScore,
  getProjectsByRiskLevel,
  getRiskDistribution,
  getProjectsWithIncreasingRisk,
  getPortfolioRiskMetrics,
  getRiskAlerts,
  exportRiskReport,
} from './risk-scorer';

// Trend Analysis
export {
  getBugTrends,
  getCommitTrends,
  getCostTrends,
  getVelocityTrends,
  getAllTrends,
  getTrendComparison,
} from './trends';

// Cache utilities
export {
  metricsCache,
  generateCacheKey,
  withCache,
  invalidateByPrefix,
} from './cache';
