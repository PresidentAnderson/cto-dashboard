/**
 * Metrics API Routes - Regenerate and Query Metrics
 * CTO Dashboard v2.0
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  asyncHandler,
  authenticateApiKey,
  optionalAuth,
  strictLimiter,
  validateRequest
} = require('../lib/middleware');

const {
  metricsRebuildSchema,
  dailyMetricsSchema
} = require('../lib/validators');

// ============================================================================
// POST /api/metrics/rebuild - Regenerate metrics
// ============================================================================

router.post('/rebuild',
  authenticateApiKey,
  strictLimiter,
  validateRequest(metricsRebuildSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { metric_type, start_date, end_date, force } = req.body;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const results = {
      monthly: null,
      portfolio: null,
      project: null
    };

    try {
      // Rebuild monthly metrics
      if (metric_type === 'monthly' || metric_type === 'all') {
        results.monthly = await rebuildMonthlyMetrics(startDate, endDate, force);
      }

      // Rebuild portfolio metrics
      if (metric_type === 'portfolio' || metric_type === 'all') {
        results.portfolio = await rebuildPortfolioMetrics(force);
      }

      // Rebuild project metrics
      if (metric_type === 'project' || metric_type === 'all') {
        results.project = await rebuildProjectMetrics(startDate, endDate, force);
      }

      return res.success({
        message: 'Metrics rebuild completed',
        metric_type,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        results
      });

    } catch (err) {
      console.error('Metrics rebuild error:', err);
      return res.error(
        `Metrics rebuild failed: ${err.message}`,
        'REBUILD_FAILED',
        500
      );
    }
  })
);

// ============================================================================
// GET /api/metrics/daily - Get daily metrics data
// ============================================================================

router.get('/daily',
  optionalAuth,
  validateRequest(dailyMetricsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date, days } = req.query;

    const endDate = date ? new Date(date) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    // Get daily bug statistics
    const dailyBugStats = await prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as bugs_created,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low,
        SUM(CASE WHEN revenue_impact_daily IS NOT NULL THEN revenue_impact_daily ELSE 0 END) as revenue_impact
      FROM bugs
      WHERE DATE(created_at) BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `;

    // Get daily resolution statistics
    const dailyResolutions = await prisma.$queryRaw`
      SELECT
        DATE(resolved_at) as date,
        COUNT(*) as bugs_resolved,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_resolution_hours
      FROM bugs
      WHERE DATE(resolved_at) BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(resolved_at)
      ORDER BY DATE(resolved_at) ASC
    `;

    // Merge the two datasets
    const dailyMetrics = [];
    const resolutionMap = new Map(
      dailyResolutions.map(r => [r.date.toISOString().split('T')[0], r])
    );

    for (const stat of dailyBugStats) {
      const dateKey = stat.date.toISOString().split('T')[0];
      const resolution = resolutionMap.get(dateKey);

      dailyMetrics.push({
        date: stat.date,
        bugs_created: parseInt(stat.bugs_created),
        bugs_resolved: resolution ? parseInt(resolution.bugs_resolved) : 0,
        by_severity: {
          critical: parseInt(stat.critical),
          high: parseInt(stat.high),
          medium: parseInt(stat.medium),
          low: parseInt(stat.low)
        },
        revenue_impact: parseFloat(stat.revenue_impact),
        avg_resolution_hours: resolution ? parseFloat(resolution.avg_resolution_hours).toFixed(2) : null
      });
    }

    // Get summary statistics
    const summary = {
      total_bugs_created: dailyMetrics.reduce((sum, d) => sum + d.bugs_created, 0),
      total_bugs_resolved: dailyMetrics.reduce((sum, d) => sum + d.bugs_resolved, 0),
      total_revenue_impact: dailyMetrics.reduce((sum, d) => sum + d.revenue_impact, 0),
      avg_bugs_per_day: (dailyMetrics.reduce((sum, d) => sum + d.bugs_created, 0) / days).toFixed(2),
      avg_resolution_per_day: (dailyMetrics.reduce((sum, d) => sum + d.bugs_resolved, 0) / days).toFixed(2)
    };

    return res.success({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days
      },
      summary,
      daily_metrics: dailyMetrics
    });
  })
);

// ============================================================================
// GET /api/metrics/monthly - Get monthly metrics
// ============================================================================

router.get('/monthly',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { months = 12 } = req.query;

    const monthlyMetrics = await prisma.monthlyMetric.findMany({
      orderBy: { month: 'desc' },
      take: parseInt(months)
    });

    return res.success({
      months: monthlyMetrics.length,
      data: monthlyMetrics.reverse()
    });
  })
);

// ============================================================================
// GET /api/metrics/portfolio - Get portfolio metrics
// ============================================================================

router.get('/portfolio',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const latestMetric = await prisma.portfolioMetric.findFirst({
      orderBy: { snapshotDate: 'desc' }
    });

    if (!latestMetric) {
      return res.error('No portfolio metrics available', 'NO_METRICS', 404);
    }

    // Get historical data for trends
    const historicalMetrics = await prisma.portfolioMetric.findMany({
      orderBy: { snapshotDate: 'desc' },
      take: 30
    });

    return res.success({
      current: latestMetric,
      history: historicalMetrics.reverse()
    });
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Rebuild monthly metrics
 */
async function rebuildMonthlyMetrics(startDate, endDate, force) {
  const months = [];
  let currentDate = new Date(startDate);
  currentDate.setDate(1); // Start of month

  while (currentDate <= endDate) {
    months.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  let created = 0;
  let updated = 0;

  for (const month of months) {
    const nextMonth = new Date(month);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Check if metric already exists
    const existing = await prisma.monthlyMetric.findUnique({
      where: { month }
    });

    if (existing && !force) {
      continue;
    }

    // Calculate metrics for the month
    const bugStats = await prisma.bug.groupBy({
      by: ['severity'],
      where: {
        createdAt: {
          gte: month,
          lt: nextMonth
        }
      },
      _count: true
    });

    const resolutionStats = await prisma.bug.aggregate({
      where: {
        resolvedAt: {
          gte: month,
          lt: nextMonth
        }
      },
      _count: true,
      _avg: {
        actualHours: true
      }
    });

    const revenueImpact = await prisma.bug.aggregate({
      where: {
        createdAt: {
          gte: month,
          lt: nextMonth
        },
        revenueImpact: { not: null }
      },
      _sum: {
        revenueImpact: true
      }
    });

    const bugsCreated = await prisma.bug.count({
      where: {
        createdAt: {
          gte: month,
          lt: nextMonth
        }
      }
    });

    const bugsResolved = resolutionStats._count;

    // Transform bug stats
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    bugStats.forEach(stat => {
      severityCounts[stat.severity] = stat._count;
    });

    const totalBugs = Object.values(severityCounts).reduce((a, b) => a + b, 0);
    const engHours = resolutionStats._avg.actualHours || 0;
    const totalCost = engHours * 150; // $150/hour rate
    const revenueImpactDaily = revenueImpact._sum.revenueImpact || 0;

    // Upsert metric
    await prisma.monthlyMetric.upsert({
      where: { month },
      update: {
        totalBugs,
        criticalBugs: severityCounts.critical,
        highBugs: severityCounts.high,
        mediumBugs: severityCounts.medium,
        lowBugs: severityCounts.low,
        engHours,
        totalCost,
        revenueImpactDaily,
        bugsCreated,
        bugsResolved,
        avgResolutionDays: null // TODO: Calculate from resolved bugs
      },
      create: {
        month,
        totalBugs,
        criticalBugs: severityCounts.critical,
        highBugs: severityCounts.high,
        mediumBugs: severityCounts.medium,
        lowBugs: severityCounts.low,
        engHours,
        totalCost,
        revenueImpactDaily,
        bugsCreated,
        bugsResolved
      }
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  return { created, updated, total: months.length };
}

/**
 * Rebuild portfolio metrics
 */
async function rebuildPortfolioMetrics(force) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if metric already exists for today
  const existing = await prisma.portfolioMetric.findFirst({
    where: { snapshotDate: today }
  });

  if (existing && !force) {
    return { message: 'Portfolio metric already exists for today', created: false };
  }

  // Calculate portfolio metrics
  const projectStats = await prisma.project.groupBy({
    by: ['status'],
    _count: true,
    _sum: {
      year3Revenue: true,
      dcfValuation: true,
      monthlyInfraCost: true
    }
  });

  const totalProjects = projectStats.reduce((sum, stat) => sum + stat._count, 0);
  const shippedProjects = projectStats.find(s => s.status === 'shipped')?._count || 0;

  const year3RevenueTotal = projectStats.reduce(
    (sum, stat) => sum + (parseFloat(stat._sum.year3Revenue) || 0),
    0
  );

  const portfolioDcfTotal = projectStats.reduce(
    (sum, stat) => sum + (parseFloat(stat._sum.dcfValuation) || 0),
    0
  );

  const monthlyDepsCost = projectStats.reduce(
    (sum, stat) => sum + (parseFloat(stat._sum.monthlyInfraCost) || 0),
    0
  );

  if (existing) {
    await prisma.portfolioMetric.update({
      where: { id: existing.id },
      data: {
        totalProjects,
        shippedProjects,
        year3RevenueTotal,
        portfolioDcfTotal,
        monthlyDepsCost,
        snapshotDate: today
      }
    });
    return { message: 'Portfolio metric updated', created: false };
  } else {
    await prisma.portfolioMetric.create({
      data: {
        totalProjects,
        shippedProjects,
        year3RevenueTotal,
        portfolioDcfTotal,
        monthlyDepsCost,
        snapshotDate: today
      }
    });
    return { message: 'Portfolio metric created', created: true };
  }
}

/**
 * Rebuild project metrics
 */
async function rebuildProjectMetrics(startDate, endDate, force) {
  // Get all projects with GitHub URLs
  const projects = await prisma.project.findMany({
    where: {
      githubUrl: { not: null }
    }
  });

  if (projects.length === 0) {
    return { message: 'No projects with GitHub URLs found', created: 0 };
  }

  let created = 0;

  for (const project of projects) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if metric already exists for today
    const existing = await prisma.projectMetric.findUnique({
      where: {
        projectId_date: {
          projectId: project.id,
          date: today
        }
      }
    });

    if (existing && !force) {
      continue;
    }

    // Calculate project health score
    const bugCount = await prisma.bug.count({
      where: {
        projectId: project.id,
        status: { notIn: ['closed', 'shipped'] }
      }
    });

    const criticalBugs = await prisma.bug.count({
      where: {
        projectId: project.id,
        severity: 'critical',
        status: { notIn: ['closed', 'shipped'] }
      }
    });

    // Simple health score calculation
    let healthScore = 100;
    healthScore -= criticalBugs * 20;
    healthScore -= bugCount * 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Upsert metric
    await prisma.projectMetric.upsert({
      where: {
        projectId_date: {
          projectId: project.id,
          date: today
        }
      },
      update: {
        healthScore,
        commitsCount: 0, // TODO: Fetch from GitHub API
        contributors: 0, // TODO: Fetch from GitHub API
        linesOfCode: 0, // TODO: Fetch from GitHub API
        techStack: []
      },
      create: {
        projectId: project.id,
        date: today,
        healthScore,
        commitsCount: 0,
        contributors: 0,
        linesOfCode: 0,
        techStack: []
      }
    });

    created++;
  }

  return { created, total: projects.length };
}

module.exports = router;
