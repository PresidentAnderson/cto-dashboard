/**
 * Metrics Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 *
 * Handles all metrics and analytics operations:
 * - Dashboard KPIs
 * - Project-specific metrics
 * - Monthly metrics aggregation
 * - Portfolio metrics
 * - Metrics recalculation
 */

'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { type ActionResponse, success, error } from './types'
import { validateSchema, generateMetricsSchema } from './validations'
import { logAudit, logSyncEvent } from './utils'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

type DashboardMetrics = {
  overview: {
    totalProjects: number
    activeProjects: number
    shippedProjects: number
    totalBugs: number
    activeBugs: number
    criticalBugs: number
    blockerBugs: number
  }
  bugs: {
    bySeverity: {
      critical: number
      high: number
      medium: number
      low: number
    }
    byStatus: {
      pending: number
      in_progress: number
      verified: number
      shipped: number
      closed: number
      deferred: number
    }
    avgResolutionTime: number // in hours
    slaCompliance: number // percentage
  }
  financial: {
    totalArr: number
    totalYear3Revenue: number
    totalDcfValuation: number
    monthlyInfraCost: number
    portfolioValue: number
  }
  recent: {
    recentBugs: Array<{
      id: string
      bugNumber: string
      title: string
      severity: string
      status: string
      createdAt: Date
    }>
    recentProjects: Array<{
      id: string
      name: string
      status: string
      complexity: number | null
      clientAppeal: number | null
    }>
  }
}

type ProjectMetrics = {
  project: {
    id: string
    name: string
    status: string
    githubUrl: string | null
  }
  bugs: {
    total: number
    active: number
    bySeverity: {
      critical: number
      high: number
      medium: number
      low: number
    }
    byStatus: {
      pending: number
      in_progress: number
      verified: number
      shipped: number
      closed: number
      deferred: number
    }
  }
  timeline: Array<{
    date: Date
    commitsCount: number
    contributors: number
    linesOfCode: number
    healthScore: number
  }>
  financial: {
    arr: number | null
    year1Revenue: number | null
    year3Revenue: number | null
    roiScore: number | null
    dcfValuation: number | null
    monthlyInfraCost: number | null
  }
}

// ============================================================================
// CACHE TAGS
// ============================================================================

const CACHE_TAGS = {
  metrics: 'metrics',
  dashboardMetrics: 'dashboard-metrics',
  projectMetrics: (id: string) => `project-metrics-${id}`,
  monthlyMetrics: 'monthly-metrics',
  portfolioMetrics: 'portfolio-metrics',
} as const

// ============================================================================
// GET DASHBOARD METRICS
// ============================================================================

export async function getDashboardMetricsAction(): Promise<ActionResponse<DashboardMetrics>> {
  try {
    // Get overview counts
    const [
      totalProjects,
      activeProjects,
      shippedProjects,
      totalBugs,
      activeBugs,
      criticalBugs,
      blockerBugs,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'active' } }),
      prisma.project.count({ where: { status: 'shipped' } }),
      prisma.bug.count(),
      prisma.bug.count({ where: { status: { in: ['pending', 'in_progress'] } } }),
      prisma.bug.count({ where: { severity: 'critical', status: { notIn: ['closed', 'shipped'] } } }),
      prisma.bug.count({ where: { isBlocker: true, status: { notIn: ['closed', 'shipped'] } } }),
    ])

    // Get bug counts by severity
    const bugsBySeverity = await prisma.bug.groupBy({
      by: ['severity'],
      _count: { severity: true },
      where: { status: { notIn: ['closed', 'shipped'] } },
    })

    // Get bug counts by status
    const bugsByStatus = await prisma.bug.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    // Calculate average resolution time for closed bugs
    const resolvedBugs = await prisma.bug.findMany({
      where: {
        status: { in: ['closed', 'shipped'] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    })

    let avgResolutionTime = 0
    if (resolvedBugs.length > 0) {
      const totalHours = resolvedBugs.reduce((sum, bug) => {
        if (bug.resolvedAt) {
          const diff = bug.resolvedAt.getTime() - bug.createdAt.getTime()
          return sum + diff / (1000 * 60 * 60) // Convert to hours
        }
        return sum
      }, 0)
      avgResolutionTime = totalHours / resolvedBugs.length
    }

    // Calculate SLA compliance
    const bugsWithSla = await prisma.bug.findMany({
      where: {
        status: { in: ['closed', 'shipped'] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
        slaHours: true,
      },
    })

    let slaCompliance = 100
    if (bugsWithSla.length > 0) {
      const compliant = bugsWithSla.filter((bug) => {
        if (!bug.resolvedAt) return false
        const resolutionHours = (bug.resolvedAt.getTime() - bug.createdAt.getTime()) / (1000 * 60 * 60)
        return resolutionHours <= bug.slaHours
      })
      slaCompliance = (compliant.length / bugsWithSla.length) * 100
    }

    // Get financial metrics
    const projects = await prisma.project.findMany({
      where: { status: { in: ['active', 'shipped'] } },
      select: {
        arr: true,
        year3Revenue: true,
        dcfValuation: true,
        monthlyInfraCost: true,
      },
    })

    const financial = projects.reduce(
      (acc, proj) => ({
        totalArr: acc.totalArr + Number(proj.arr || 0),
        totalYear3Revenue: acc.totalYear3Revenue + Number(proj.year3Revenue || 0),
        totalDcfValuation: acc.totalDcfValuation + Number(proj.dcfValuation || 0),
        monthlyInfraCost: acc.monthlyInfraCost + Number(proj.monthlyInfraCost || 0),
      }),
      {
        totalArr: 0,
        totalYear3Revenue: 0,
        totalDcfValuation: 0,
        monthlyInfraCost: 0,
      }
    )

    // Get recent bugs
    const recentBugs = await prisma.bug.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        bugNumber: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
      },
    })

    // Get recent projects
    const recentProjects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        complexity: true,
        clientAppeal: true,
      },
    })

    const metrics: DashboardMetrics = {
      overview: {
        totalProjects,
        activeProjects,
        shippedProjects,
        totalBugs,
        activeBugs,
        criticalBugs,
        blockerBugs,
      },
      bugs: {
        bySeverity: {
          critical: bugsBySeverity.find((b) => b.severity === 'critical')?._count.severity || 0,
          high: bugsBySeverity.find((b) => b.severity === 'high')?._count.severity || 0,
          medium: bugsBySeverity.find((b) => b.severity === 'medium')?._count.severity || 0,
          low: bugsBySeverity.find((b) => b.severity === 'low')?._count.severity || 0,
        },
        byStatus: {
          pending: bugsByStatus.find((b) => b.status === 'pending')?._count.status || 0,
          in_progress: bugsByStatus.find((b) => b.status === 'in_progress')?._count.status || 0,
          verified: bugsByStatus.find((b) => b.status === 'verified')?._count.status || 0,
          shipped: bugsByStatus.find((b) => b.status === 'shipped')?._count.status || 0,
          closed: bugsByStatus.find((b) => b.status === 'closed')?._count.status || 0,
          deferred: bugsByStatus.find((b) => b.status === 'deferred')?._count.status || 0,
        },
        avgResolutionTime,
        slaCompliance,
      },
      financial: {
        ...financial,
        portfolioValue: financial.totalDcfValuation,
      },
      recent: {
        recentBugs,
        recentProjects,
      },
    }

    return success(metrics)
  } catch (err) {
    console.error('Error fetching dashboard metrics:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to fetch dashboard metrics',
      'FETCH_ERROR'
    )
  }
}

// ============================================================================
// GET PROJECT METRICS
// ============================================================================

export async function getProjectMetricsAction(
  projectId: string
): Promise<ActionResponse<ProjectMetrics>> {
  try {
    // Validate ID
    if (!projectId || typeof projectId !== 'string') {
      return error('Invalid project ID', 'INVALID_ID')
    }

    // Get project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        status: true,
        githubUrl: true,
        arr: true,
        year1Revenue: true,
        year3Revenue: true,
        roiScore: true,
        dcfValuation: true,
        monthlyInfraCost: true,
      },
    })

    if (!project) {
      return error('Project not found', 'NOT_FOUND')
    }

    // Get bug counts
    const [totalBugs, activeBugs, bugsBySeverity, bugsByStatus] = await Promise.all([
      prisma.bug.count({ where: { projectId } }),
      prisma.bug.count({ where: { projectId, status: { in: ['pending', 'in_progress'] } } }),
      prisma.bug.groupBy({
        by: ['severity'],
        _count: { severity: true },
        where: { projectId, status: { notIn: ['closed', 'shipped'] } },
      }),
      prisma.bug.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { projectId },
      }),
    ])

    // Get project metrics timeline
    const timeline = await prisma.projectMetric.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        date: true,
        commitsCount: true,
        contributors: true,
        linesOfCode: true,
        healthScore: true,
      },
    })

    const metrics: ProjectMetrics = {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        githubUrl: project.githubUrl,
      },
      bugs: {
        total: totalBugs,
        active: activeBugs,
        bySeverity: {
          critical: bugsBySeverity.find((b) => b.severity === 'critical')?._count.severity || 0,
          high: bugsBySeverity.find((b) => b.severity === 'high')?._count.severity || 0,
          medium: bugsBySeverity.find((b) => b.severity === 'medium')?._count.severity || 0,
          low: bugsBySeverity.find((b) => b.severity === 'low')?._count.severity || 0,
        },
        byStatus: {
          pending: bugsByStatus.find((b) => b.status === 'pending')?._count.status || 0,
          in_progress: bugsByStatus.find((b) => b.status === 'in_progress')?._count.status || 0,
          verified: bugsByStatus.find((b) => b.status === 'verified')?._count.status || 0,
          shipped: bugsByStatus.find((b) => b.status === 'shipped')?._count.status || 0,
          closed: bugsByStatus.find((b) => b.status === 'closed')?._count.status || 0,
          deferred: bugsByStatus.find((b) => b.status === 'deferred')?._count.status || 0,
        },
      },
      timeline,
      financial: {
        arr: project.arr ? Number(project.arr) : null,
        year1Revenue: project.year1Revenue ? Number(project.year1Revenue) : null,
        year3Revenue: project.year3Revenue ? Number(project.year3Revenue) : null,
        roiScore: project.roiScore ? Number(project.roiScore) : null,
        dcfValuation: project.dcfValuation ? Number(project.dcfValuation) : null,
        monthlyInfraCost: project.monthlyInfraCost ? Number(project.monthlyInfraCost) : null,
      },
    }

    return success(metrics)
  } catch (err) {
    console.error('Error fetching project metrics:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to fetch project metrics',
      'FETCH_ERROR'
    )
  }
}

// ============================================================================
// GENERATE METRICS
// ============================================================================

export async function generateMetricsAction(
  projectId?: string,
  dateRange?: { startDate: Date; endDate: Date }
): Promise<ActionResponse<{ generated: number }>> {
  try {
    // Validate input
    const validation = validateSchema(generateMetricsSchema, { projectId, dateRange })
    if (!validation.success) {
      return error(validation.error, 'VALIDATION_ERROR')
    }

    const startTime = Date.now()
    let generated = 0

    if (projectId) {
      // Generate metrics for single project
      generated = await generateProjectMetrics(projectId, dateRange)
    } else {
      // Generate metrics for all active projects
      const projects = await prisma.project.findMany({
        where: { status: { in: ['active', 'shipped'] } },
        select: { id: true },
      })

      for (const project of projects) {
        generated += await generateProjectMetrics(project.id, dateRange)
      }
    }

    // Generate monthly metrics
    await generateMonthlyMetrics()

    // Generate portfolio metrics
    await generatePortfolioMetrics()

    const duration = Date.now() - startTime

    // Log to sync events
    await logSyncEvent('manual', generated, 0, [], {
      action: 'metrics_generation',
      projectId: projectId || 'all',
      duration,
    })

    // Log to audit
    await logAudit('metrics.generated', {}, 'metrics', projectId || 'all', {
      generated,
      duration,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.metrics)
    revalidateTag(CACHE_TAGS.dashboardMetrics)
    revalidateTag(CACHE_TAGS.monthlyMetrics)
    revalidateTag(CACHE_TAGS.portfolioMetrics)
    if (projectId) {
      revalidateTag(CACHE_TAGS.projectMetrics(projectId))
    }
    revalidatePath('/dashboard')
    revalidatePath('/analytics')

    return success({ generated })
  } catch (err) {
    console.error('Error generating metrics:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to generate metrics',
      'GENERATE_ERROR'
    )
  }
}

/**
 * Generate metrics for a single project
 */
async function generateProjectMetrics(
  projectId: string,
  dateRange?: { startDate: Date; endDate: Date }
): Promise<number> {
  // In a real implementation, this would:
  // 1. Fetch data from GitHub API
  // 2. Calculate metrics (commits, contributors, LOC, etc.)
  // 3. Calculate health score
  // 4. Store in ProjectMetric table

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // For now, create a placeholder metric
  await prisma.projectMetric.upsert({
    where: {
      projectId_date: {
        projectId,
        date: today,
      },
    },
    update: {
      healthScore: 75, // Placeholder
    },
    create: {
      projectId,
      date: today,
      commitsCount: 0,
      contributors: 0,
      linesOfCode: 0,
      techStack: [],
      healthScore: 75,
    },
  })

  return 1
}

/**
 * Generate monthly metrics aggregation
 */
async function generateMonthlyMetrics(): Promise<void> {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Get bug counts for the month
  const [totalBugs, bugsBySeverity, bugsCreated, bugsResolved] = await Promise.all([
    prisma.bug.count(),
    prisma.bug.groupBy({
      by: ['severity'],
      _count: { severity: true },
      where: { status: { notIn: ['closed', 'shipped'] } },
    }),
    prisma.bug.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    }),
    prisma.bug.count({
      where: {
        resolvedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    }),
  ])

  // Calculate average resolution time
  const resolvedBugs = await prisma.bug.findMany({
    where: {
      resolvedAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
      actualHours: true,
    },
  })

  let avgResolutionDays = null
  if (resolvedBugs.length > 0) {
    const totalDays = resolvedBugs.reduce((sum, bug) => {
      if (bug.resolvedAt) {
        const diff = bug.resolvedAt.getTime() - bug.createdAt.getTime()
        return sum + diff / (1000 * 60 * 60 * 24) // Convert to days
      }
      return sum
    }, 0)
    avgResolutionDays = totalDays / resolvedBugs.length
  }

  // Calculate engineering hours and costs
  const engHours = resolvedBugs.reduce((sum, bug) => sum + Number(bug.actualHours || 0), 0)
  const totalCost = engHours * 150 // Placeholder: $150/hour

  // Calculate revenue impact
  const bugsWithImpact = await prisma.bug.findMany({
    where: {
      status: { notIn: ['closed', 'shipped'] },
      revenueImpact: { not: null },
    },
    select: { revenueImpact: true },
  })

  const revenueImpactDaily = bugsWithImpact.reduce(
    (sum, bug) => sum + Number(bug.revenueImpact || 0),
    0
  )

  // Upsert monthly metric
  await prisma.monthlyMetric.upsert({
    where: { month: monthStart },
    update: {
      totalBugs,
      criticalBugs: bugsBySeverity.find((b) => b.severity === 'critical')?._count.severity || 0,
      highBugs: bugsBySeverity.find((b) => b.severity === 'high')?._count.severity || 0,
      mediumBugs: bugsBySeverity.find((b) => b.severity === 'medium')?._count.severity || 0,
      lowBugs: bugsBySeverity.find((b) => b.severity === 'low')?._count.severity || 0,
      engHours,
      totalCost,
      revenueImpactDaily,
      avgResolutionDays,
      bugsCreated,
      bugsResolved,
    },
    create: {
      month: monthStart,
      totalBugs,
      criticalBugs: bugsBySeverity.find((b) => b.severity === 'critical')?._count.severity || 0,
      highBugs: bugsBySeverity.find((b) => b.severity === 'high')?._count.severity || 0,
      mediumBugs: bugsBySeverity.find((b) => b.severity === 'medium')?._count.severity || 0,
      lowBugs: bugsBySeverity.find((b) => b.severity === 'low')?._count.severity || 0,
      engHours,
      totalCost,
      revenueImpactDaily,
      avgResolutionDays,
      bugsCreated,
      bugsResolved,
    },
  })
}

/**
 * Generate portfolio metrics snapshot
 */
async function generatePortfolioMetrics(): Promise<void> {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Get portfolio totals
  const [totalProjects, shippedProjects, projects] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'shipped' } }),
    prisma.project.findMany({
      where: { status: { in: ['active', 'shipped'] } },
      select: {
        year3Revenue: true,
        dcfValuation: true,
        monthlyInfraCost: true,
      },
    }),
  ])

  const totals = projects.reduce(
    (acc, proj) => ({
      year3RevenueTotal: acc.year3RevenueTotal + Number(proj.year3Revenue || 0),
      portfolioDcfTotal: acc.portfolioDcfTotal + Number(proj.dcfValuation || 0),
      monthlyDepsCost: acc.monthlyDepsCost + Number(proj.monthlyInfraCost || 0),
    }),
    {
      year3RevenueTotal: 0,
      portfolioDcfTotal: 0,
      monthlyDepsCost: 0,
    }
  )

  // Create portfolio snapshot
  await prisma.portfolioMetric.create({
    data: {
      totalProjects,
      shippedProjects,
      year3RevenueTotal: totals.year3RevenueTotal,
      portfolioDcfTotal: totals.portfolioDcfTotal,
      monthlyDepsCost: totals.monthlyDepsCost,
      snapshotDate: now,
    },
  })
}
