/**
 * Metrics Engine - Usage Examples
 *
 * Copy-paste examples for common use cases
 */

import {
  getDashboardKPIs,
  calculateBugCost,
  getBugTrends,
  getTopRiskyProjects,
  buildDailyMetrics,
  getProjectKPIs,
  getAllTrends,
  getRiskAlerts,
  calculateRevenueAtRisk,
  getKPIComparison,
} from './index';
import { prisma } from '@/lib/prisma';

/**
 * Example 1: Fetch Dashboard Data
 * Use this in your main dashboard page
 */
export async function example1_fetchDashboard() {
  // Get all KPIs in one optimized call
  const kpis = await getDashboardKPIs();

  console.log('Dashboard KPIs:');
  console.log(`- Total Projects: ${kpis.totalProjects}`);
  console.log(`- Active Bugs: ${kpis.activeBugs}`);
  console.log(`- Critical Bugs: ${kpis.criticalBugs}`);
  console.log(`- Engineering Hours: ${kpis.totalEngineeringHours}`);
  console.log(`- Revenue at Risk: $${kpis.revenueAtRisk.toLocaleString()}`);
  console.log(`- Average Velocity: ${kpis.averageVelocity}`);

  // Get top 5 risky projects
  console.log('\nTop Risky Projects:');
  kpis.topRiskyProjects.forEach(project => {
    console.log(`- ${project.projectName}: ${project.overallScore}/100 (${project.riskLevel})`);
  });

  return kpis;
}

/**
 * Example 2: Calculate Bug Costs
 * Use this for bug cost reports
 */
export async function example2_bugCostReport() {
  // Fetch bugs with actual hours
  const bugs = await prisma.bug.findMany({
    where: {
      actualHours: { not: null },
      status: { notIn: ['closed', 'shipped'] },
    },
  });

  // Calculate costs
  const costs = calculateBugCost(bugs);

  console.log('Bug Cost Report:');
  costs.forEach(cost => {
    console.log(`${cost.bugNumber}: $${cost.monetaryCost.toLocaleString()} (${cost.actualHours}h × $${cost.hourlyRate} × ${cost.severityMultiplier}x)`);
  });

  // Calculate total
  const totalCost = costs.reduce((sum, cost) => sum + cost.monetaryCost, 0);
  console.log(`\nTotal Cost: $${totalCost.toLocaleString()}`);

  return costs;
}

/**
 * Example 3: Analyze Bug Trends
 * Use this for trend charts
 */
export async function example3_bugTrends() {
  // Last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const trends = await getBugTrends({ start: startDate, end: endDate });

  console.log('Bug Trends (Last 30 Days):');
  console.log(`- Average Resolution Time: ${trends.averageResolutionTime.toFixed(1)} days`);
  console.log(`- Total Created: ${trends.creationTrend.reduce((sum, d) => sum + d.value, 0)}`);
  console.log(`- Total Resolved: ${trends.resolutionTrend.reduce((sum, d) => sum + d.value, 0)}`);

  return trends;
}

/**
 * Example 4: Get Risk Alerts
 * Use this for notifications/alerts
 */
export async function example4_riskAlerts() {
  const alerts = await getRiskAlerts();

  console.log('Risk Alerts:');
  alerts.forEach(alert => {
    console.log(`\n${alert.severity.toUpperCase()}: ${alert.project.projectName}`);
    alert.alerts.forEach(msg => console.log(`  - ${msg}`));
  });

  return alerts;
}

/**
 * Example 5: Project Deep Dive
 * Use this for project detail pages
 */
export async function example5_projectDeepDive(projectId: string) {
  const kpis = await getProjectKPIs(projectId);

  console.log('Project KPIs:');
  console.log(`- Active Bugs: ${kpis.activeBugs}`);
  console.log(`- Critical Bugs: ${kpis.criticalBugs}`);
  console.log(`- Total Hours: ${kpis.totalHours}`);
  console.log(`- Revenue at Risk: $${kpis.revenueAtRisk.toLocaleString()}`);
  console.log(`- Velocity: ${kpis.velocity.toFixed(1)} commits/day`);

  if (kpis.riskScore) {
    console.log(`\nRisk Score: ${kpis.riskScore.overallScore}/100 (${kpis.riskScore.riskLevel})`);
    console.log('Components:');
    console.log(`- Critical Bugs: ${kpis.riskScore.components.criticalBugsScore}`);
    console.log(`- Stalled PRs: ${kpis.riskScore.components.stalledPRsScore}`);
    console.log(`- Low Activity: ${kpis.riskScore.components.lowActivityScore}`);
    console.log(`- Overdue Milestones: ${kpis.riskScore.components.overdueMilestonesScore}`);
  }

  return kpis;
}

/**
 * Example 6: Comprehensive Trend Analysis
 * Use this for analytics dashboards
 */
export async function example6_comprehensiveTrends() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // Last 90 days

  const trends = await getAllTrends({ start: startDate, end: endDate });

  console.log('Comprehensive Trends (Last 90 Days):');

  console.log('\nBug Trends:');
  console.log(`- Avg Resolution Time: ${trends.bugs.averageResolutionTime.toFixed(1)} days`);

  console.log('\nCommit Trends:');
  console.log(`- Avg Commits/Day: ${trends.commits.averageCommitsPerDay.toFixed(1)}`);
  console.log(`- Most Active Day: ${trends.commits.mostActiveDay}`);

  console.log('\nCost Trends:');
  console.log(`- Total Cost: $${trends.costs.totalCost.toLocaleString()}`);
  console.log(`- Critical Bugs: $${trends.costs.bugCostBreakdown.critical.toLocaleString()}`);
  console.log(`- High Bugs: $${trends.costs.bugCostBreakdown.high.toLocaleString()}`);

  console.log('\nVelocity Trends:');
  console.log(`- Average Velocity: ${trends.velocity.averageVelocity.toFixed(1)}`);

  return trends;
}

/**
 * Example 7: Revenue at Risk Analysis
 * Use this for executive reports
 */
export async function example7_revenueRisk() {
  const criticalBugs = await prisma.bug.findMany({
    where: {
      severity: 'critical',
      status: { notIn: ['closed', 'shipped'] },
      revenueImpact: { not: null },
    },
    include: { project: true },
  });

  const risk = calculateRevenueAtRisk(criticalBugs);

  console.log('Revenue at Risk Analysis:');
  console.log(`- Daily Loss: $${risk.totalDailyLoss.toLocaleString()}`);
  console.log(`- Monthly Loss: $${risk.projectedMonthlyLoss.toLocaleString()}`);
  console.log(`- Annual Loss: $${risk.projectedAnnualLoss.toLocaleString()}`);
  console.log(`- Critical Bugs: ${risk.criticalBugCount}`);
  console.log(`- Blockers: ${risk.blockerCount}`);
  console.log(`- Affected Projects: ${risk.affectedProjects.join(', ')}`);

  return risk;
}

/**
 * Example 8: Period Comparison
 * Use this for comparing metrics over time
 */
export async function example8_periodComparison() {
  const comparison = await getKPIComparison(30); // Last 30 days vs previous 30 days

  console.log('KPI Comparison (30-day periods):');

  console.log('\nCurrent Period:');
  console.log(`- Active Bugs: ${comparison.current.activeBugs}`);
  console.log(`- Critical Bugs: ${comparison.current.criticalBugs}`);
  console.log(`- Total Hours: ${comparison.current.totalHours}`);
  console.log(`- Commits: ${comparison.current.commitsCount}`);

  console.log('\nPrevious Period:');
  console.log(`- Active Bugs: ${comparison.previous.activeBugs}`);
  console.log(`- Critical Bugs: ${comparison.previous.criticalBugs}`);
  console.log(`- Total Hours: ${comparison.previous.totalHours}`);
  console.log(`- Commits: ${comparison.previous.commitsCount}`);

  console.log('\nChange:');
  console.log(`- Active Bugs: ${comparison.change.activeBugs > 0 ? '+' : ''}${comparison.change.activeBugs}`);
  console.log(`- Critical Bugs: ${comparison.change.criticalBugs > 0 ? '+' : ''}${comparison.change.criticalBugs}`);
  console.log(`- Total Hours: ${comparison.change.totalHours > 0 ? '+' : ''}${comparison.change.totalHours}`);
  console.log(`- Commits: ${comparison.change.commitsCount > 0 ? '+' : ''}${comparison.change.commitsCount}`);

  return comparison;
}

/**
 * Example 9: Daily Metrics Cron Job
 * Use this in your cron scheduler
 */
export async function example9_dailyMetricsCron() {
  console.log('Running daily metrics job...');

  // Build metrics for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const metrics = await buildDailyMetrics(yesterday);

  console.log('Daily Metrics Built:');
  console.log(`- Date: ${metrics.date.toLocaleDateString()}`);
  console.log(`- Bugs Opened: ${metrics.bugsOpened}`);
  console.log(`- Bugs Closed: ${metrics.bugsClosed}`);
  console.log(`- Commits: ${metrics.commitsCount}`);
  console.log(`- Hours Spent: ${metrics.hoursSpent}`);
  console.log(`- Active Projects: ${metrics.activeProjects}`);

  // Store in database or send notification
  // await notifyTeam(metrics);

  return metrics;
}

/**
 * Example 10: API Route Handler
 * Use this in Next.js API routes
 */
export async function example10_apiRoute() {
  try {
    const [kpis, risks, trends] = await Promise.all([
      getDashboardKPIs(),
      getTopRiskyProjects(5),
      getBugTrends({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
    ]);

    return {
      success: true,
      data: {
        kpis,
        risks,
        trends,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: 'Failed to fetch metrics',
      timestamp: new Date(),
    };
  }
}

/**
 * Run all examples (for testing)
 */
export async function runAllExamples() {
  console.log('\n=== Example 1: Dashboard Data ===');
  await example1_fetchDashboard();

  console.log('\n=== Example 2: Bug Cost Report ===');
  await example2_bugCostReport();

  console.log('\n=== Example 3: Bug Trends ===');
  await example3_bugTrends();

  console.log('\n=== Example 4: Risk Alerts ===');
  await example4_riskAlerts();

  // Skip project-specific examples (need valid project ID)
  // await example5_projectDeepDive('project-uuid');

  console.log('\n=== Example 6: Comprehensive Trends ===');
  await example6_comprehensiveTrends();

  console.log('\n=== Example 7: Revenue Risk ===');
  await example7_revenueRisk();

  console.log('\n=== Example 8: Period Comparison ===');
  await example8_periodComparison();

  console.log('\n=== Example 9: Daily Metrics ===');
  await example9_dailyMetricsCron();

  console.log('\n=== Example 10: API Route ===');
  const apiResult = await example10_apiRoute();
  console.log('API Result:', JSON.stringify(apiResult, null, 2));

  console.log('\n=== All Examples Complete ===');
}
