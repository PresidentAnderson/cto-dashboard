/**
 * Database Utility Functions for CTO Dashboard
 *
 * Provides type-safe, optimized query helpers for common data access patterns.
 * Includes caching strategies, analytics queries, and performance optimizations.
 */

import { Prisma, ProjectStatus, BugStatus, BugSeverity } from '@prisma/client'
import { prisma } from './prisma'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DateRange = {
  startDate: Date
  endDate: Date
}

export type ProjectWithBugs = Prisma.ProjectGetPayload<{
  include: {
    bugs: true
    metrics: true
  }
}>

export type BugWithRelations = Prisma.BugGetPayload<{
  include: {
    project: true
    assignedTo: true
    createdBy: true
    history: true
  }
}>

export type DailyMetrics = {
  date: Date
  bugsOpen: number
  bugsClosed: number
  commits: number
  prs: number
  hoursSpent: number
  revenueAtRisk: number
}

export type SyncStatus = {
  lastSync: Date | null
  status: string
  recordsImported: number
  recordsFailed: number
  errors: string[]
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

/**
 * Get a single project with all its bugs and metrics
 * @param projectId - UUID of the project
 * @returns Project with bugs and metrics, or null if not found
 */
export async function getProjectWithBugs(
  projectId: string
): Promise<ProjectWithBugs | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        bugs: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days
        },
      },
    })

    return project
  } catch (error) {
    console.error('Error fetching project with bugs:', error)
    throw error
  }
}

/**
 * Get all active projects with bug counts and health metrics
 * @returns Array of projects with aggregated bug statistics
 */
export async function getActiveProjectsWithStats() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: ProjectStatus.active,
      },
      include: {
        bugs: {
          where: {
            status: {
              notIn: [BugStatus.closed, BugStatus.shipped],
            },
          },
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return projects.map(project => ({
      ...project,
      bugStats: {
        total: project.bugs.length,
        critical: project.bugs.filter(b => b.severity === BugSeverity.critical).length,
        high: project.bugs.filter(b => b.severity === BugSeverity.high).length,
        medium: project.bugs.filter(b => b.severity === BugSeverity.medium).length,
        low: project.bugs.filter(b => b.severity === BugSeverity.low).length,
      },
      latestMetrics: project.metrics[0] || null,
    }))
  } catch (error) {
    console.error('Error fetching active projects:', error)
    throw error
  }
}

/**
 * Get portfolio overview with financial metrics
 * @returns Aggregated portfolio statistics
 */
export async function getPortfolioOverview() {
  try {
    const [projects, latestSnapshot] = await Promise.all([
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          year3Revenue: true,
          dcfValuation: true,
          monthlyInfraCost: true,
          roiScore: true,
          complexity: true,
          clientAppeal: true,
        },
      }),
      prisma.portfolioMetric.findFirst({
        orderBy: { snapshotDate: 'desc' },
      }),
    ])

    const activeProjects = projects.filter(p => p.status === ProjectStatus.active)
    const shippedProjects = projects.filter(p => p.status === ProjectStatus.shipped)

    const totalYear3Revenue = projects.reduce(
      (sum, p) => sum + (p.year3Revenue?.toNumber() || 0),
      0
    )

    const totalDcfValuation = projects.reduce(
      (sum, p) => sum + (p.dcfValuation?.toNumber() || 0),
      0
    )

    const totalMonthlyInfra = projects.reduce(
      (sum, p) => sum + (p.monthlyInfraCost?.toNumber() || 0),
      0
    )

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      shippedProjects: shippedProjects.length,
      totalYear3Revenue,
      totalDcfValuation,
      totalMonthlyInfra,
      latestSnapshot,
      projects,
    }
  } catch (error) {
    console.error('Error fetching portfolio overview:', error)
    throw error
  }
}

// ============================================================================
// BUG QUERIES
// ============================================================================

/**
 * Get bugs with filtering and pagination
 * @param filters - Optional filters for severity, status, project
 * @param pagination - Page and limit for pagination
 * @returns Paginated bug results with total count
 */
export async function getBugsWithFilters(
  filters?: {
    severity?: BugSeverity
    status?: BugStatus
    projectId?: string
    assignedToId?: string
  },
  pagination?: {
    page?: number
    limit?: number
  }
) {
  try {
    const where: Prisma.BugWhereInput = {}

    if (filters?.severity) {
      where.severity = filters.severity
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId
    }

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId
    }

    const page = pagination?.page || 1
    const limit = pagination?.limit || 50
    const skip = (page - 1) * limit

    const [bugs, totalCount] = await Promise.all([
      prisma.bug.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { priorityScore: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.bug.count({ where }),
    ])

    return {
      bugs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching bugs with filters:', error)
    throw error
  }
}

/**
 * Get critical bugs requiring immediate attention
 * @returns Array of critical bugs with SLA information
 */
export async function getCriticalBugs() {
  try {
    const bugs = await prisma.bug.findMany({
      where: {
        severity: BugSeverity.critical,
        status: {
          notIn: [BugStatus.closed, BugStatus.shipped],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return bugs.map(bug => {
      const hoursSinceCreated =
        (Date.now() - new Date(bug.createdAt).getTime()) / (1000 * 60 * 60)
      const hoursUntilSla = bug.slaHours - hoursSinceCreated
      const isSlaBreached = hoursUntilSla <= 0

      return {
        ...bug,
        hoursSinceCreated: Math.floor(hoursSinceCreated),
        hoursUntilSla: Math.floor(hoursUntilSla),
        isSlaBreached,
      }
    })
  } catch (error) {
    console.error('Error fetching critical bugs:', error)
    throw error
  }
}

/**
 * Get bug statistics by severity and status
 * @returns Aggregated bug counts
 */
export async function getBugStatistics() {
  try {
    const [
      totalBugs,
      criticalBugs,
      highBugs,
      mediumBugs,
      lowBugs,
      pendingBugs,
      inProgressBugs,
      blockerBugs,
    ] = await Promise.all([
      prisma.bug.count(),
      prisma.bug.count({ where: { severity: BugSeverity.critical } }),
      prisma.bug.count({ where: { severity: BugSeverity.high } }),
      prisma.bug.count({ where: { severity: BugSeverity.medium } }),
      prisma.bug.count({ where: { severity: BugSeverity.low } }),
      prisma.bug.count({ where: { status: BugStatus.pending } }),
      prisma.bug.count({ where: { status: BugStatus.in_progress } }),
      prisma.bug.count({ where: { isBlocker: true, status: { notIn: [BugStatus.closed, BugStatus.shipped] } } }),
    ])

    return {
      total: totalBugs,
      bySeverity: {
        critical: criticalBugs,
        high: highBugs,
        medium: mediumBugs,
        low: lowBugs,
      },
      byStatus: {
        pending: pendingBugs,
        inProgress: inProgressBugs,
      },
      blockers: blockerBugs,
    }
  } catch (error) {
    console.error('Error fetching bug statistics:', error)
    throw error
  }
}

// ============================================================================
// METRICS QUERIES
// ============================================================================

/**
 * Get daily metrics for a project within a date range
 * @param projectId - UUID of the project
 * @param dateRange - Start and end dates
 * @returns Array of daily metrics
 */
export async function getDailyMetrics(
  projectId: string,
  dateRange: DateRange
): Promise<DailyMetrics[]> {
  try {
    const metrics = await prisma.projectMetric.findMany({
      where: {
        projectId,
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Transform to daily metrics format
    return metrics.map(metric => ({
      date: metric.date,
      bugsOpen: 0, // TODO: Calculate from bug history
      bugsClosed: 0, // TODO: Calculate from bug history
      commits: metric.commitsCount,
      prs: 0, // TODO: Add PR tracking
      hoursSpent: 0, // TODO: Calculate from bug actual hours
      revenueAtRisk: 0, // TODO: Calculate from open bugs
    }))
  } catch (error) {
    console.error('Error fetching daily metrics:', error)
    throw error
  }
}

/**
 * Get monthly metrics for trend analysis
 * @param months - Number of months to retrieve (default: 12)
 * @returns Array of monthly metrics
 */
export async function getMonthlyMetrics(months: number = 12) {
  try {
    const metrics = await prisma.monthlyMetric.findMany({
      orderBy: { month: 'desc' },
      take: months,
    })

    return metrics.reverse() // Return in ascending order
  } catch (error) {
    console.error('Error fetching monthly metrics:', error)
    throw error
  }
}

/**
 * Get engineering efficiency metrics
 * @returns Calculated efficiency statistics
 */
export async function getEngineeringMetrics() {
  try {
    const [
      totalBugs,
      resolvedBugs,
      totalEstimatedHours,
      totalActualHours,
      avgResolutionTime,
    ] = await Promise.all([
      prisma.bug.count(),
      prisma.bug.count({
        where: {
          status: {
            in: [BugStatus.closed, BugStatus.shipped],
          },
        },
      }),
      prisma.bug.aggregate({
        _sum: { estimatedHours: true },
      }),
      prisma.bug.aggregate({
        _sum: { actualHours: true },
        where: {
          actualHours: { not: null },
        },
      }),
      prisma.bug.aggregate({
        _avg: {
          actualHours: true,
        },
        where: {
          resolvedAt: { not: null },
          actualHours: { not: null },
        },
      }),
    ])

    const resolutionRate = totalBugs > 0 ? (resolvedBugs / totalBugs) * 100 : 0
    const estimationAccuracy =
      totalActualHours._sum.actualHours && totalEstimatedHours._sum.estimatedHours
        ? (1 - Math.abs(
            Number(totalActualHours._sum.actualHours) - Number(totalEstimatedHours._sum.estimatedHours)
          ) / Number(totalEstimatedHours._sum.estimatedHours)) * 100
        : null

    return {
      totalBugs,
      resolvedBugs,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      totalEstimatedHours: Number(totalEstimatedHours._sum.estimatedHours || 0),
      totalActualHours: Number(totalActualHours._sum.actualHours || 0),
      avgResolutionTime: Number(avgResolutionTime._avg.actualHours || 0),
      estimationAccuracy: estimationAccuracy ? Math.round(estimationAccuracy * 100) / 100 : null,
    }
  } catch (error) {
    console.error('Error fetching engineering metrics:', error)
    throw error
  }
}

// ============================================================================
// SYNC & IMPORT QUERIES
// ============================================================================

/**
 * Get the status of the last sync operation
 * @returns Sync status information
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const latestSync = await prisma.importLog.findFirst({
      orderBy: { timestamp: 'desc' },
    })

    if (!latestSync) {
      return {
        lastSync: null,
        status: 'never_synced',
        recordsImported: 0,
        recordsFailed: 0,
        errors: [],
      }
    }

    return {
      lastSync: latestSync.timestamp,
      status: latestSync.recordsFailed > 0 ? 'completed_with_errors' : 'success',
      recordsImported: latestSync.recordsImported,
      recordsFailed: latestSync.recordsFailed,
      errors: latestSync.errors,
    }
  } catch (error) {
    console.error('Error fetching sync status:', error)
    throw error
  }
}

/**
 * Get import history with filtering
 * @param limit - Number of records to retrieve
 * @param source - Filter by import source (optional)
 * @returns Array of import logs
 */
export async function getImportHistory(
  limit: number = 10,
  source?: 'csv' | 'github' | 'manual'
) {
  try {
    const where: Prisma.ImportLogWhereInput = source ? { source } : {}

    const logs = await prisma.importLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return logs
  } catch (error) {
    console.error('Error fetching import history:', error)
    throw error
  }
}

// ============================================================================
// SEARCH & FULL-TEXT QUERIES
// ============================================================================

/**
 * Search projects by name or description
 * @param query - Search term
 * @returns Array of matching projects
 */
export async function searchProjects(query: string) {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      include: {
        bugs: {
          where: {
            status: {
              notIn: [BugStatus.closed, BugStatus.shipped],
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return projects
  } catch (error) {
    console.error('Error searching projects:', error)
    throw error
  }
}

/**
 * Search bugs by title or description
 * @param query - Search term
 * @returns Array of matching bugs
 */
export async function searchBugs(query: string) {
  try {
    const bugs = await prisma.bug.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { bugNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { priorityScore: 'desc' },
      take: 50,
    })

    return bugs
  } catch (error) {
    console.error('Error searching bugs:', error)
    throw error
  }
}

// ============================================================================
// USER & TEAM QUERIES
// ============================================================================

/**
 * Get user workload statistics
 * @param userId - UUID of the user
 * @returns User's assigned bugs and workload
 */
export async function getUserWorkload(userId: string) {
  try {
    const [assignedBugs, user] = await Promise.all([
      prisma.bug.findMany({
        where: {
          assignedToId: userId,
          status: {
            notIn: [BugStatus.closed, BugStatus.shipped],
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { priorityScore: 'desc' },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      }),
    ])

    const totalEstimatedHours = assignedBugs.reduce(
      (sum, bug) => sum + Number(bug.estimatedHours || 0),
      0
    )

    const criticalCount = assignedBugs.filter(b => b.severity === BugSeverity.critical).length
    const highCount = assignedBugs.filter(b => b.severity === BugSeverity.high).length

    return {
      user,
      assignedBugs,
      totalBugs: assignedBugs.length,
      totalEstimatedHours,
      criticalBugs: criticalCount,
      highBugs: highCount,
    }
  } catch (error) {
    console.error('Error fetching user workload:', error)
    throw error
  }
}

/**
 * Get team performance statistics
 * @returns Array of users with their bug statistics
 */
export async function getTeamPerformance() {
  try {
    const users = await prisma.user.findMany({
      include: {
        assignedBugs: {
          where: {
            status: {
              notIn: [BugStatus.closed, BugStatus.shipped],
            },
          },
        },
        _count: {
          select: {
            assignedBugs: true,
          },
        },
      },
    })

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      activeBugs: user.assignedBugs.length,
      criticalBugs: user.assignedBugs.filter(b => b.severity === BugSeverity.critical).length,
      totalEstimatedHours: user.assignedBugs.reduce(
        (sum, bug) => sum + Number(bug.estimatedHours || 0),
        0
      ),
    }))
  } catch (error) {
    console.error('Error fetching team performance:', error)
    throw error
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check database connection health
 * @returns Database connection status
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  latency: number
  error?: string
}> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    return {
      isHealthy: true,
      latency,
    }
  } catch (error) {
    return {
      isHealthy: false,
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get database statistics (table counts)
 * @returns Object with counts for each table
 */
export async function getDatabaseStatistics() {
  try {
    const [
      projectCount,
      bugCount,
      userCount,
      metricCount,
      importLogCount,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.bug.count(),
      prisma.user.count(),
      prisma.projectMetric.count(),
      prisma.importLog.count(),
    ])

    return {
      projects: projectCount,
      bugs: bugCount,
      users: userCount,
      metrics: metricCount,
      importLogs: importLogCount,
    }
  } catch (error) {
    console.error('Error fetching database statistics:', error)
    throw error
  }
}
