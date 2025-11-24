/**
 * Analytics API Routes
 * CTO Dashboard v2.0
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  asyncHandler,
  optionalAuth,
  validateRequest
} = require('../lib/middleware');

const {
  analyticsDateRangeSchema,
  trendAnalysisSchema,
  slugParamSchema
} = require('../lib/validators');

// ============================================================================
// GET /api/analytics/summary - Dashboard overview
// ============================================================================

router.get('/summary',
  optionalAuth,
  asyncHandler(async (req, res) => {
    // Get current bug statistics
    const [bugCounts, blockerBugs, slaBreach, recentBugs] = await Promise.all([
      prisma.bug.groupBy({
        by: ['severity', 'status'],
        _count: true
      }),
      prisma.bug.count({
        where: { isBlocker: true, status: { notIn: ['closed', 'shipped'] } }
      }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM bugs
        WHERE status NOT IN ('closed', 'shipped')
        AND EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 > sla_hours
      `,
      prisma.bug.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Transform bug counts
    const bugsBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const bugsByStatus = {
      pending: 0,
      in_progress: 0,
      verified: 0,
      shipped: 0,
      closed: 0,
      deferred: 0
    };

    bugCounts.forEach(item => {
      bugsBySeverity[item.severity] = (bugsBySeverity[item.severity] || 0) + item._count;
      bugsByStatus[item.status] = (bugsByStatus[item.status] || 0) + item._count;
    });

    // Get project statistics
    const [projectStats, portfolioMetric] = await Promise.all([
      prisma.project.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.portfolioMetric.findFirst({
        orderBy: { snapshotDate: 'desc' }
      })
    ]);

    const projectsByStatus = {
      active: 0,
      shipped: 0,
      deferred: 0,
      cancelled: 0
    };

    projectStats.forEach(item => {
      projectsByStatus[item.status] = item._count;
    });

    // Get monthly metrics for trends
    const monthlyMetrics = await prisma.monthlyMetric.findMany({
      orderBy: { month: 'desc' },
      take: 12
    });

    // Calculate revenue impact
    const activeRevenueLoss = await prisma.bug.aggregate({
      where: {
        status: { notIn: ['closed', 'shipped'] },
        revenueImpact: { not: null }
      },
      _sum: { revenueImpact: true }
    });

    // Get top priority bugs
    const topBugs = await prisma.bug.findMany({
      where: {
        status: { notIn: ['closed', 'shipped'] }
      },
      orderBy: { priorityScore: 'desc' },
      take: 5,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });

    return res.success({
      bugs: {
        by_severity: bugsBySeverity,
        by_status: bugsByStatus,
        blockers: blockerBugs,
        sla_breached: parseInt(slaBreach[0]?.count || 0),
        recent_24h: recentBugs,
        total_open: bugsByStatus.pending + bugsByStatus.in_progress + bugsByStatus.verified
      },
      projects: {
        by_status: projectsByStatus,
        total: Object.values(projectsByStatus).reduce((a, b) => a + b, 0)
      },
      portfolio: portfolioMetric ? {
        total_projects: portfolioMetric.totalProjects,
        shipped_projects: portfolioMetric.shippedProjects,
        year3_revenue: portfolioMetric.year3RevenueTotal,
        dcf_valuation: portfolioMetric.portfolioDcfTotal,
        monthly_costs: portfolioMetric.monthlyDepsCost
      } : null,
      revenue_impact: {
        daily_loss: activeRevenueLoss._sum.revenueImpact || 0
      },
      trends: {
        monthly: monthlyMetrics.reverse().map(m => ({
          month: m.month,
          total_bugs: m.totalBugs,
          critical_bugs: m.criticalBugs,
          eng_hours: m.engHours,
          total_cost: m.totalCost,
          bugs_created: m.bugsCreated,
          bugs_resolved: m.bugsResolved
        }))
      },
      top_priority_bugs: topBugs,
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// GET /api/analytics/project/:slug - Project-specific analytics
// ============================================================================

router.get('/project/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    // Find project (by ID or by name slug)
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { id: slug },
          { name: { contains: slug, mode: 'insensitive' } }
        ]
      },
      include: {
        _count: {
          select: { bugs: true, metrics: true }
        }
      }
    });

    if (!project) {
      return res.error('Project not found', 'PROJECT_NOT_FOUND', 404);
    }

    // Get bug statistics
    const [bugStats, recentBugs, bugTrend] = await Promise.all([
      prisma.bug.groupBy({
        by: ['severity', 'status'],
        where: { projectId: project.id },
        _count: true
      }),
      prisma.bug.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, avatarUrl: true }
          }
        }
      }),
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as bugs_created,
          COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as bugs_resolved
        FROM bugs
        WHERE project_id = ${project.id}::uuid
        AND created_at >= NOW() - INTERVAL '90 days'
        GROUP BY week
        ORDER BY week DESC
      `
    ]);

    // Transform bug stats
    const bugsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    const bugsByStatus = { pending: 0, in_progress: 0, verified: 0, shipped: 0, closed: 0, deferred: 0 };

    bugStats.forEach(item => {
      bugsBySeverity[item.severity] = (bugsBySeverity[item.severity] || 0) + item._count;
      bugsByStatus[item.status] = (bugsByStatus[item.status] || 0) + item._count;
    });

    // Get metrics history
    const metrics = await prisma.projectMetric.findMany({
      where: { projectId: project.id },
      orderBy: { date: 'desc' },
      take: 30
    });

    // Calculate health score trend
    const healthTrend = metrics.map(m => ({
      date: m.date,
      health_score: m.healthScore,
      commits: m.commitsCount,
      contributors: m.contributors
    }));

    // Calculate resolution time
    const resolutionStats = await prisma.$queryRaw`
      SELECT
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) as avg_days,
        MIN(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) as min_days,
        MAX(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400) as max_days
      FROM bugs
      WHERE project_id = ${project.id}::uuid
      AND resolved_at IS NOT NULL
    `;

    return res.success({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        github_url: project.githubUrl,
        complexity: project.complexity,
        client_appeal: project.clientAppeal,
        roi_score: project.roiScore
      },
      bugs: {
        total: project._count.bugs,
        by_severity: bugsBySeverity,
        by_status: bugsByStatus,
        recent: recentBugs,
        weekly_trend: bugTrend
      },
      metrics: {
        history: healthTrend,
        latest: metrics[0] || null
      },
      resolution_time: resolutionStats[0] ? {
        average_days: parseFloat(resolutionStats[0].avg_days || 0).toFixed(2),
        min_days: parseFloat(resolutionStats[0].min_days || 0).toFixed(2),
        max_days: parseFloat(resolutionStats[0].max_days || 0).toFixed(2)
      } : null
    });
  })
);

// ============================================================================
// GET /api/analytics/trends - Trend data for charts
// ============================================================================

router.get('/trends',
  optionalAuth,
  validateRequest(trendAnalysisSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { metric, period, group_by } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    let trendData;

    switch (metric) {
      case 'bugs':
        trendData = await prisma.$queryRaw`
          SELECT
            DATE_TRUNC(${group_by}, created_at) as period,
            COUNT(*) as total,
            COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
            COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
            COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
            COUNT(CASE WHEN severity = 'low' THEN 1 END) as low
          FROM bugs
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
          GROUP BY period
          ORDER BY period ASC
        `;
        break;

      case 'revenue_impact':
        trendData = await prisma.$queryRaw`
          SELECT
            DATE_TRUNC(${group_by}, created_at) as period,
            SUM(revenue_impact_daily) as daily_impact,
            COUNT(*) as bugs_with_impact
          FROM bugs
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
          AND revenue_impact_daily IS NOT NULL
          GROUP BY period
          ORDER BY period ASC
        `;
        break;

      case 'resolution_time':
        trendData = await prisma.$queryRaw`
          SELECT
            DATE_TRUNC(${group_by}, resolved_at) as period,
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours,
            COUNT(*) as resolved_count
          FROM bugs
          WHERE resolved_at BETWEEN ${startDate} AND ${endDate}
          GROUP BY period
          ORDER BY period ASC
        `;
        break;

      case 'eng_hours':
        trendData = await prisma.$queryRaw`
          SELECT
            DATE_TRUNC(${group_by}, created_at) as period,
            SUM(actual_hours) as total_hours,
            SUM(estimated_hours) as estimated_hours,
            COUNT(*) as bugs_count
          FROM bugs
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
          AND actual_hours IS NOT NULL
          GROUP BY period
          ORDER BY period ASC
        `;
        break;
    }

    return res.success({
      metric,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        group_by
      },
      data: trendData
    });
  })
);

// ============================================================================
// GET /api/analytics/risks - Risk assessment
// ============================================================================

router.get('/risks',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const risks = [];

    // Critical bugs risk
    const criticalBugs = await prisma.bug.count({
      where: {
        severity: 'critical',
        status: { notIn: ['closed', 'shipped'] }
      }
    });

    if (criticalBugs > 5) {
      risks.push({
        type: 'CRITICAL_BUGS',
        severity: 'high',
        title: 'High Critical Bug Count',
        description: `${criticalBugs} critical bugs are open (threshold: 5)`,
        impact: 'high',
        recommendation: 'Prioritize critical bug resolution immediately',
        affected_count: criticalBugs
      });
    }

    // SLA breach risk
    const slaBreached = await prisma.$queryRaw`
      SELECT COUNT(*) as count,
             ARRAY_AGG(bug_number) as bug_numbers
      FROM bugs
      WHERE status NOT IN ('closed', 'shipped')
      AND EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 > sla_hours
    `;

    if (parseInt(slaBreached[0]?.count || 0) > 0) {
      risks.push({
        type: 'SLA_BREACH',
        severity: 'high',
        title: 'SLA Breaches Detected',
        description: `${slaBreached[0].count} bugs have exceeded their SLA`,
        impact: 'high',
        recommendation: 'Review and expedite overdue bugs',
        affected_bugs: slaBreached[0].bug_numbers,
        affected_count: parseInt(slaBreached[0].count)
      });
    }

    // Blocker bugs risk
    const blockerBugs = await prisma.bug.findMany({
      where: {
        isBlocker: true,
        status: { notIn: ['closed', 'shipped'] }
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    if (blockerBugs.length > 0) {
      risks.push({
        type: 'BLOCKER_BUGS',
        severity: 'critical',
        title: 'Project Blockers Active',
        description: `${blockerBugs.length} blocker bugs preventing progress`,
        impact: 'critical',
        recommendation: 'Resolve blockers to unblock project milestones',
        affected_bugs: blockerBugs.map(b => ({
          id: b.id,
          bug_number: b.bugNumber,
          title: b.title,
          project: b.project?.name
        })),
        affected_count: blockerBugs.length
      });
    }

    // Revenue impact risk
    const highRevenueImpact = await prisma.bug.aggregate({
      where: {
        status: { notIn: ['closed', 'shipped'] },
        revenueImpact: { gte: 1000 }
      },
      _sum: { revenueImpact: true },
      _count: true
    });

    if (highRevenueImpact._count > 0) {
      risks.push({
        type: 'REVENUE_IMPACT',
        severity: 'medium',
        title: 'High Revenue Impact Bugs',
        description: `${highRevenueImpact._count} bugs causing significant revenue loss`,
        impact: 'medium',
        recommendation: 'Prioritize bugs with revenue impact',
        daily_revenue_loss: highRevenueImpact._sum.revenueImpact,
        affected_count: highRevenueImpact._count
      });
    }

    // Unassigned critical bugs risk
    const unassignedCritical = await prisma.bug.count({
      where: {
        severity: { in: ['critical', 'high'] },
        status: 'pending',
        assignedToId: null
      }
    });

    if (unassignedCritical > 0) {
      risks.push({
        type: 'UNASSIGNED_CRITICAL',
        severity: 'medium',
        title: 'Unassigned Critical Bugs',
        description: `${unassignedCritical} critical/high bugs are unassigned`,
        impact: 'medium',
        recommendation: 'Assign critical bugs to engineers immediately',
        affected_count: unassignedCritical
      });
    }

    // Old open bugs risk
    const staleBugs = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM bugs
      WHERE status = 'in_progress'
      AND updated_at < NOW() - INTERVAL '7 days'
    `;

    if (parseInt(staleBugs[0]?.count || 0) > 0) {
      risks.push({
        type: 'STALE_BUGS',
        severity: 'low',
        title: 'Stale In-Progress Bugs',
        description: `${staleBugs[0].count} bugs haven't been updated in 7+ days`,
        impact: 'low',
        recommendation: 'Review progress on stale bugs',
        affected_count: parseInt(staleBugs[0].count)
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return res.success({
      total_risks: risks.length,
      critical: risks.filter(r => r.severity === 'critical').length,
      high: risks.filter(r => r.severity === 'high').length,
      medium: risks.filter(r => r.severity === 'medium').length,
      low: risks.filter(r => r.severity === 'low').length,
      risks,
      assessed_at: new Date().toISOString()
    });
  })
);

module.exports = router;
