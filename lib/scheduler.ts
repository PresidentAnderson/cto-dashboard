/**
 * Job Scheduler for CTO Dashboard v2.0
 *
 * Manages cron job execution with:
 * - Job queue management
 * - Job status tracking
 * - Failure retry logic (3 attempts)
 * - Job history in database
 * - Concurrent job limits
 * - Idempotent execution
 */

import { prisma } from './prisma'
import { JobType, JobStatus } from '@prisma/client'

export interface JobResult {
  success: boolean
  message?: string
  data?: any
  recordsProcessed?: number
  recordsFailed?: number
  errors?: string[]
}

export interface JobContext {
  jobId: string
  jobType: JobType
  attempt: number
  startTime: number
  isRetry: boolean
}

export type JobFunction = (context: JobContext) => Promise<JobResult>

const MAX_CONCURRENT_JOBS = 5
const JOB_TIMEOUT_MS = 9 * 60 * 1000 // 9 minutes (Vercel limit is 10)
const RETRY_DELAY_MS = 5000 // 5 seconds between retries

/**
 * Job Scheduler class for managing cron job execution
 */
export class JobScheduler {
  private runningJobs: Map<string, { timeout: NodeJS.Timeout; startTime: number }> = new Map()

  /**
   * Execute a job with retry logic and monitoring
   */
  async executeJob(
    jobType: JobType,
    jobFunction: JobFunction,
    triggeredBy: string = 'cron',
    metadata?: any
  ): Promise<JobResult> {
    // Check concurrent job limit
    if (this.runningJobs.size >= MAX_CONCURRENT_JOBS) {
      throw new Error(`Concurrent job limit reached (${MAX_CONCURRENT_JOBS})`)
    }

    // Check if same job type is already running
    const existingJob = await prisma.jobHistory.findFirst({
      where: {
        jobType,
        status: 'running',
      },
      orderBy: { startedAt: 'desc' },
    })

    if (existingJob) {
      // Check if it's stuck (running for more than timeout)
      const runtime = Date.now() - existingJob.startedAt.getTime()
      if (runtime < JOB_TIMEOUT_MS) {
        throw new Error(`Job ${jobType} is already running (started ${Math.round(runtime / 1000)}s ago)`)
      } else {
        // Mark stuck job as timeout
        await prisma.jobHistory.update({
          where: { id: existingJob.id },
          data: {
            status: 'timeout',
            completedAt: new Date(),
            executionTimeMs: runtime,
            errorMessage: 'Job exceeded maximum execution time',
          },
        })
      }
    }

    // Create job history record
    const jobRecord = await prisma.jobHistory.create({
      data: {
        jobType,
        status: 'pending',
        triggeredBy,
        metadata,
        attempt: 1,
        maxAttempts: 3,
      },
    })

    const context: JobContext = {
      jobId: jobRecord.id,
      jobType,
      attempt: 1,
      startTime: Date.now(),
      isRetry: false,
    }

    // Execute job with retry logic
    return this.executeWithRetry(jobRecord.id, jobFunction, context)
  }

  /**
   * Execute job with automatic retry on failure
   */
  private async executeWithRetry(
    jobId: string,
    jobFunction: JobFunction,
    context: JobContext
  ): Promise<JobResult> {
    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      context.attempt = attempt
      context.isRetry = attempt > 1
      context.startTime = Date.now()

      try {
        // Update status to running
        await prisma.jobHistory.update({
          where: { id: jobId },
          data: {
            status: 'running',
            attempt,
          },
        })

        // Execute job with timeout
        const result = await this.executeWithTimeout(jobFunction, context)

        // Update job record with success
        const executionTime = Date.now() - context.startTime
        await prisma.jobHistory.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            executionTimeMs: executionTime,
            result: result as any,
          },
        })

        return result
      } catch (error: any) {
        const executionTime = Date.now() - context.startTime
        const isLastAttempt = attempt === maxAttempts
        const isTimeout = error.message?.includes('timeout')

        console.error(`Job ${context.jobType} failed (attempt ${attempt}/${maxAttempts}):`, error)

        if (isLastAttempt) {
          // Final attempt failed - mark as failed
          await prisma.jobHistory.update({
            where: { id: jobId },
            data: {
              status: isTimeout ? 'timeout' : 'failed',
              completedAt: new Date(),
              executionTimeMs: executionTime,
              errorMessage: error.message || 'Unknown error',
              errorStack: error.stack,
            },
          })

          return {
            success: false,
            message: `Job failed after ${maxAttempts} attempts: ${error.message}`,
          }
        } else {
          // Wait before retry
          await this.delay(RETRY_DELAY_MS * attempt) // Exponential backoff
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    return {
      success: false,
      message: 'Job execution failed unexpectedly',
    }
  }

  /**
   * Execute job function with timeout protection
   */
  private async executeWithTimeout(
    jobFunction: JobFunction,
    context: JobContext
  ): Promise<JobResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.runningJobs.delete(context.jobId)
        reject(new Error(`Job execution timeout after ${JOB_TIMEOUT_MS / 1000}s`))
      }, JOB_TIMEOUT_MS)

      this.runningJobs.set(context.jobId, {
        timeout: timeoutId,
        startTime: context.startTime,
      })

      jobFunction(context)
        .then((result) => {
          clearTimeout(timeoutId)
          this.runningJobs.delete(context.jobId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          this.runningJobs.delete(context.jobId)
          reject(error)
        })
    })
  }

  /**
   * Get job execution history
   */
  async getJobHistory(jobType?: JobType, limit: number = 50) {
    return prisma.jobHistory.findMany({
      where: jobType ? { jobType } : undefined,
      orderBy: { startedAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Get currently running jobs
   */
  async getRunningJobs() {
    return prisma.jobHistory.findMany({
      where: { status: 'running' },
      orderBy: { startedAt: 'desc' },
    })
  }

  /**
   * Get job statistics
   */
  async getJobStats(since?: Date) {
    const where = since ? { startedAt: { gte: since } } : {}

    const [total, completed, failed, avgExecutionTime] = await Promise.all([
      prisma.jobHistory.count({ where }),
      prisma.jobHistory.count({ where: { ...where, status: 'completed' } }),
      prisma.jobHistory.count({ where: { ...where, status: 'failed' } }),
      prisma.jobHistory.aggregate({
        where: { ...where, status: 'completed', executionTimeMs: { not: null } },
        _avg: { executionTimeMs: true },
      }),
    ])

    return {
      total,
      completed,
      failed,
      timeout: await prisma.jobHistory.count({ where: { ...where, status: 'timeout' } }),
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgExecutionTimeMs: avgExecutionTime._avg.executionTimeMs || 0,
    }
  }

  /**
   * Clean up old job history (keep last 1000 records)
   */
  async cleanupJobHistory(keepLast: number = 1000) {
    const cutoffJob = await prisma.jobHistory.findMany({
      orderBy: { startedAt: 'desc' },
      skip: keepLast,
      take: 1,
      select: { startedAt: true },
    })

    if (cutoffJob.length > 0) {
      const result = await prisma.jobHistory.deleteMany({
        where: {
          startedAt: { lt: cutoffJob[0].startedAt },
        },
      })
      return result.count
    }

    return 0
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler()

/**
 * Helper function to verify cron secret
 */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

/**
 * Helper function to create standardized cron response
 */
export function createCronResponse(
  success: boolean,
  data?: any,
  status?: number
): Response {
  return Response.json(
    {
      success,
      timestamp: new Date().toISOString(),
      ...data,
    },
    { status: status || (success ? 200 : 500) }
  )
}
