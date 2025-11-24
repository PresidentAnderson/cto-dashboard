/**
 * Cron Job Monitoring for CTO Dashboard v2.0
 *
 * Provides comprehensive monitoring and alerting for cron jobs:
 * - Track job execution time
 * - Alert on failures
 * - Dashboard for job status
 * - Log sync events
 * - Performance metrics
 */

import { prisma } from './prisma'
import { JobType, JobStatus } from '@prisma/client'

export interface SyncEventData {
  eventType: string
  source?: string
  status: 'started' | 'success' | 'failed' | 'warning'
  message?: string
  details?: any
  duration?: number
  recordsProcessed?: number
  recordsFailed?: number
  jobId?: string
}

export interface AlertConfig {
  failureThreshold: number // Number of consecutive failures before alert
  slowExecutionMs: number // Execution time threshold for slow job alert
  enableEmailAlerts: boolean
  alertEmails: string[]
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  failureThreshold: 3,
  slowExecutionMs: 5 * 60 * 1000, // 5 minutes
  enableEmailAlerts: false,
  alertEmails: [],
}

/**
 * Cron Monitor class for tracking and alerting on job execution
 */
export class CronMonitor {
  private config: AlertConfig

  constructor(config?: Partial<AlertConfig>) {
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config }
  }

  /**
   * Log a sync event to the database
   */
  async logSyncEvent(data: SyncEventData): Promise<string> {
    const event = await prisma.syncEvent.create({
      data: {
        eventType: data.eventType,
        source: data.source,
        status: data.status,
        message: data.message,
        details: data.details as any,
        duration: data.duration,
        recordsProcessed: data.recordsProcessed || 0,
        recordsFailed: data.recordsFailed || 0,
        jobId: data.jobId,
      },
    })

    // Check if we need to send alerts
    if (data.status === 'failed') {
      await this.checkAndSendAlerts(data.jobId)
    }

    return event.id
  }

  /**
   * Get recent sync events
   */
  async getRecentEvents(limit: number = 100, eventType?: string) {
    return prisma.syncEvent.findMany({
      where: eventType ? { eventType } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })
  }

  /**
   * Get sync events for a specific job
   */
  async getJobEvents(jobId: string) {
    return prisma.syncEvent.findMany({
      where: { jobId },
      orderBy: { timestamp: 'asc' },
    })
  }

  /**
   * Get job monitoring dashboard data
   */
  async getDashboardData() {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Recent job executions
    const recentJobs = await prisma.jobHistory.findMany({
      where: { startedAt: { gte: last24Hours } },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    // Job statistics
    const jobStats = await this.getJobStatistics(last7Days)

    // Running jobs
    const runningJobs = await prisma.jobHistory.findMany({
      where: { status: 'running' },
      orderBy: { startedAt: 'desc' },
    })

    // Recent failures
    const recentFailures = await prisma.jobHistory.findMany({
      where: {
        status: { in: ['failed', 'timeout'] },
        startedAt: { gte: last24Hours },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    })

    // Slow jobs (longer than threshold)
    const slowJobs = await prisma.jobHistory.findMany({
      where: {
        status: 'completed',
        executionTimeMs: { gte: this.config.slowExecutionMs },
        startedAt: { gte: last7Days },
      },
      orderBy: { executionTimeMs: 'desc' },
      take: 10,
    })

    // Health status
    const healthStatus = this.calculateHealthStatus(jobStats)

    return {
      summary: {
        runningJobs: runningJobs.length,
        recentFailures: recentFailures.length,
        slowJobs: slowJobs.length,
        healthStatus,
      },
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        type: job.jobType,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        executionTimeMs: job.executionTimeMs,
        attempt: job.attempt,
        errorMessage: job.errorMessage,
      })),
      statistics: jobStats,
      runningJobs: runningJobs.map((job) => ({
        id: job.id,
        type: job.jobType,
        startedAt: job.startedAt,
        runtime: Date.now() - job.startedAt.getTime(),
      })),
      recentFailures: recentFailures.map((job) => ({
        id: job.id,
        type: job.jobType,
        startedAt: job.startedAt,
        errorMessage: job.errorMessage,
        attempt: job.attempt,
      })),
      slowJobs: slowJobs.map((job) => ({
        id: job.id,
        type: job.jobType,
        startedAt: job.startedAt,
        executionTimeMs: job.executionTimeMs,
      })),
    }
  }

  /**
   * Get job statistics for a time period
   */
  async getJobStatistics(since: Date) {
    const jobs = await prisma.jobHistory.findMany({
      where: { startedAt: { gte: since } },
    })

    const byType: Record<string, any> = {}

    for (const job of jobs) {
      if (!byType[job.jobType]) {
        byType[job.jobType] = {
          total: 0,
          completed: 0,
          failed: 0,
          timeout: 0,
          totalExecutionTime: 0,
          completedJobs: 0,
        }
      }

      byType[job.jobType].total++

      if (job.status === 'completed') {
        byType[job.jobType].completed++
        if (job.executionTimeMs) {
          byType[job.jobType].totalExecutionTime += job.executionTimeMs
          byType[job.jobType].completedJobs++
        }
      } else if (job.status === 'failed') {
        byType[job.jobType].failed++
      } else if (job.status === 'timeout') {
        byType[job.jobType].timeout++
      }
    }

    // Calculate averages and success rates
    const statistics = Object.entries(byType).map(([type, stats]) => ({
      jobType: type,
      total: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      timeout: stats.timeout,
      successRate: (stats.completed / stats.total) * 100,
      avgExecutionTimeMs:
        stats.completedJobs > 0
          ? Math.round(stats.totalExecutionTime / stats.completedJobs)
          : 0,
    }))

    return statistics
  }

  /**
   * Calculate overall health status
   */
  private calculateHealthStatus(statistics: any[]): 'healthy' | 'degraded' | 'critical' {
    if (statistics.length === 0) return 'healthy'

    const avgSuccessRate = statistics.reduce((sum, stat) => sum + stat.successRate, 0) / statistics.length
    const hasRecentFailures = statistics.some((stat) => stat.failed > 0)

    if (avgSuccessRate >= 95) return 'healthy'
    if (avgSuccessRate >= 80) return 'degraded'
    return 'critical'
  }

  /**
   * Check consecutive failures and send alerts if threshold reached
   */
  async checkAndSendAlerts(jobId?: string) {
    if (!this.config.enableEmailAlerts) return

    // Get recent job history
    const recentJobs = await prisma.jobHistory.findMany({
      orderBy: { startedAt: 'desc' },
      take: this.config.failureThreshold + 1,
    })

    // Count consecutive failures
    let consecutiveFailures = 0
    for (const job of recentJobs) {
      if (job.status === 'failed' || job.status === 'timeout') {
        consecutiveFailures++
      } else if (job.status === 'completed') {
        break
      }
    }

    // Send alert if threshold reached
    if (consecutiveFailures >= this.config.failureThreshold) {
      await this.sendAlert({
        type: 'consecutive_failures',
        message: `${consecutiveFailures} consecutive job failures detected`,
        jobs: recentJobs.slice(0, consecutiveFailures),
      })
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(alertData: any) {
    console.error('CRON JOB ALERT:', alertData)

    // Log alert to sync events
    await this.logSyncEvent({
      eventType: 'cron_alert',
      status: 'warning',
      message: alertData.message,
      details: alertData,
    })

    // TODO: Implement email notification
    // This would integrate with the email-reports module
  }

  /**
   * Get job health metrics for monitoring dashboard
   */
  async getHealthMetrics() {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [total, successful, failed, avgTime] = await Promise.all([
      prisma.jobHistory.count({
        where: { startedAt: { gte: last24Hours } },
      }),
      prisma.jobHistory.count({
        where: {
          startedAt: { gte: last24Hours },
          status: 'completed',
        },
      }),
      prisma.jobHistory.count({
        where: {
          startedAt: { gte: last24Hours },
          status: { in: ['failed', 'timeout'] },
        },
      }),
      prisma.jobHistory.aggregate({
        where: {
          startedAt: { gte: last24Hours },
          status: 'completed',
          executionTimeMs: { not: null },
        },
        _avg: { executionTimeMs: true },
      }),
    ])

    return {
      last24Hours: {
        total,
        successful,
        failed,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        avgExecutionTimeMs: avgTime._avg.executionTimeMs || 0,
      },
    }
  }

  /**
   * Clean up old sync events (keep last 10,000 records)
   */
  async cleanupSyncEvents(keepLast: number = 10000) {
    const cutoffEvent = await prisma.syncEvent.findMany({
      orderBy: { timestamp: 'desc' },
      skip: keepLast,
      take: 1,
      select: { timestamp: true },
    })

    if (cutoffEvent.length > 0) {
      const result = await prisma.syncEvent.deleteMany({
        where: {
          timestamp: { lt: cutoffEvent[0].timestamp },
        },
      })
      return result.count
    }

    return 0
  }
}

// Singleton instance
export const cronMonitor = new CronMonitor()

/**
 * Helper to track job execution with automatic logging
 */
export async function trackJobExecution<T>(
  jobId: string,
  jobType: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  // Log start
  await cronMonitor.logSyncEvent({
    eventType: jobType,
    status: 'started',
    message: `Job ${jobType} started`,
    jobId,
  })

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    // Log success
    await cronMonitor.logSyncEvent({
      eventType: jobType,
      status: 'success',
      message: `Job ${jobType} completed successfully`,
      duration,
      jobId,
    })

    return result
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Log failure
    await cronMonitor.logSyncEvent({
      eventType: jobType,
      status: 'failed',
      message: error.message || 'Job execution failed',
      details: { error: error.stack },
      duration,
      jobId,
    })

    throw error
  }
}
