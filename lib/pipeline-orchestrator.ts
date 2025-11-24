/**
 * Pipeline Orchestrator
 *
 * Manages data ingestion pipelines with:
 * - Queue management using p-queue
 * - Job scheduling and prioritization
 * - Retry logic with exponential backoff
 * - Status tracking in database
 * - Concurrent job execution
 * - Dead letter queue for failed jobs
 */

import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';
import prisma from './prisma';
import { loggers } from './logger';
import { GitHubSyncEngine } from './github-sync';
import type { PipelineJob } from './validation-schemas';

// ============================================================================
// TYPES
// ============================================================================

export type JobType = 'csv_import' | 'github_sync' | 'manual_entry' | 'bulk_update';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export interface Job {
  id: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  source: 'csv' | 'github' | 'manual';
  payload: any;
  metadata: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  errors: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
}

export interface JobResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
  metadata?: Record<string, any>;
}

export interface PipelineStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgDuration: number;
  successRate: number;
}

// ============================================================================
// JOB HANDLERS
// ============================================================================

type JobHandler = (job: Job) => Promise<JobResult>;

const jobHandlers: Record<JobType, JobHandler> = {
  csv_import: async (job: Job): Promise<JobResult> => {
    // CSV import is handled by the CSV route handler
    // This is just a placeholder for tracking
    return {
      success: true,
      recordsProcessed: job.metadata.recordsProcessed || 0,
      recordsFailed: job.metadata.recordsFailed || 0,
      errors: [],
    };
  },

  github_sync: async (job: Job): Promise<JobResult> => {
    const { token, owner, options } = job.payload;

    if (!token) {
      throw new Error('GitHub token is required');
    }

    const engine = new GitHubSyncEngine(token, owner);
    const result = await engine.fullSync(options || {});

    return {
      success: result.success,
      recordsProcessed:
        result.repos.created +
        result.repos.updated +
        result.issues.created +
        result.issues.updated,
      recordsFailed: result.repos.failed + result.issues.failed,
      errors: result.errors,
      metadata: {
        repos: result.repos,
        issues: result.issues,
        duration: result.duration,
      },
    };
  },

  manual_entry: async (job: Job): Promise<JobResult> => {
    // Manual entry is handled by the manual-entry actions
    // This is just a placeholder for tracking
    return {
      success: true,
      recordsProcessed: 1,
      recordsFailed: 0,
      errors: [],
    };
  },

  bulk_update: async (job: Job): Promise<JobResult> => {
    const { updates } = job.payload;
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        // Execute bulk update based on entity type
        if (update.entityType === 'bug') {
          await prisma.bug.updateMany({
            where: update.where,
            data: update.data,
          });
        } else if (update.entityType === 'project') {
          await prisma.project.updateMany({
            where: update.where,
            data: update.data,
          });
        }
        processed++;
      } catch (error) {
        failed++;
        errors.push((error as Error).message);
      }
    }

    return {
      success: failed === 0,
      recordsProcessed: processed,
      recordsFailed: failed,
      errors,
    };
  },
};

// ============================================================================
// PIPELINE ORCHESTRATOR CLASS
// ============================================================================

export class PipelineOrchestrator {
  private queue: PQueue;
  private jobs: Map<string, Job>;
  private deadLetterQueue: Job[];

  constructor(concurrency = 3) {
    this.queue = new PQueue({
      concurrency,
      autoStart: true,
    });
    this.jobs = new Map();
    this.deadLetterQueue = [];

    loggers.pipelineOrchestrator(`Pipeline orchestrator initialized with concurrency: ${concurrency}`);
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    payload: any,
    options: {
      priority?: JobPriority;
      source?: 'csv' | 'github' | 'manual';
      maxRetries?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const job: Job = {
      id: uuidv4(),
      type,
      priority: options.priority || 'normal',
      status: 'queued',
      source: options.source || 'manual',
      payload,
      metadata: options.metadata || {},
      retryCount: 0,
      maxRetries: options.maxRetries || 3,
      errors: [],
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);

    loggers.pipelineOrchestrator(`Job added to queue: ${job.id}`, {
      type: job.type,
      priority: job.priority,
    });

    // Add to queue with priority
    const priorityValue = this.getPriorityValue(job.priority);
    this.queue.add(() => this.executeJob(job), { priority: priorityValue });

    // Persist to database
    await this.persistJobStatus(job);

    return job.id;
  }

  /**
   * Execute a job
   */
  private async executeJob(job: Job): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date();
      this.jobs.set(job.id, job);

      loggers.pipelineOrchestrator(`Executing job: ${job.id}`, { type: job.type });

      await this.persistJobStatus(job);

      // Get handler for job type
      const handler = jobHandlers[job.type];
      if (!handler) {
        throw new Error(`No handler found for job type: ${job.type}`);
      }

      // Execute job
      const result = await handler(job);

      // Update job with result
      job.status = 'completed';
      job.completedAt = new Date();
      job.metadata = {
        ...job.metadata,
        ...result.metadata,
        recordsProcessed: result.recordsProcessed,
        recordsFailed: result.recordsFailed,
      };

      if (!result.success) {
        job.errors.push(...result.errors);
      }

      this.jobs.set(job.id, job);

      loggers.pipelineOrchestrator(
        `Job completed: ${job.id}`,
        {
          type: job.type,
          duration: job.completedAt.getTime() - job.startedAt!.getTime(),
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
        }
      );

      // Update database
      await this.persistJobStatus(job);
      await this.updateImportLog(job, result);
    } catch (error) {
      const err = error as Error;
      job.errors.push(err.message);

      loggers.error('Pipeline Orchestrator', err, { jobId: job.id, type: job.type });

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        await this.retryJob(job);
      } else {
        // Move to dead letter queue
        job.status = 'failed';
        job.completedAt = new Date();
        this.jobs.set(job.id, job);
        this.deadLetterQueue.push(job);

        loggers.error(
          'Pipeline Orchestrator',
          new Error(`Job failed after ${job.maxRetries} retries`),
          { jobId: job.id, errors: job.errors }
        );

        await this.persistJobStatus(job);
      }
    }
  }

  /**
   * Retry a failed job with exponential backoff
   */
  private async retryJob(job: Job): Promise<void> {
    job.retryCount++;
    job.status = 'retrying';
    this.jobs.set(job.id, job);

    // Exponential backoff: 2^retryCount seconds
    const delayMs = Math.pow(2, job.retryCount) * 1000;

    loggers.pipelineOrchestrator(
      `Retrying job ${job.id} (attempt ${job.retryCount}/${job.maxRetries}) in ${delayMs}ms`
    );

    await this.persistJobStatus(job);

    setTimeout(() => {
      job.status = 'queued';
      this.jobs.set(job.id, job);
      const priorityValue = this.getPriorityValue(job.priority);
      this.queue.add(() => this.executeJob(job), { priority: priorityValue });
    }, delayMs);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs with optional filter
   */
  getJobs(filter?: { status?: JobStatus; type?: JobType }): Job[] {
    let jobs = Array.from(this.jobs.values());

    if (filter?.status) {
      jobs = jobs.filter((j) => j.status === filter.status);
    }

    if (filter?.type) {
      jobs = jobs.filter((j) => j.type === filter.type);
    }

    return jobs;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): PipelineStats {
    const jobs = Array.from(this.jobs.values());

    const completed = jobs.filter((j) => j.status === 'completed');
    const durations = completed
      .filter((j) => j.startedAt && j.completedAt)
      .map((j) => j.completedAt!.getTime() - j.startedAt!.getTime());

    return {
      totalJobs: jobs.length,
      queuedJobs: jobs.filter((j) => j.status === 'queued').length,
      processingJobs: jobs.filter((j) => j.status === 'processing').length,
      completedJobs: completed.length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      successRate: jobs.length > 0 ? (completed.length / jobs.length) * 100 : 0,
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): Job[] {
    return this.deadLetterQueue;
  }

  /**
   * Retry all jobs in dead letter queue
   */
  async retryDeadLetterQueue(): Promise<void> {
    loggers.pipelineOrchestrator(
      `Retrying ${this.deadLetterQueue.length} jobs from dead letter queue`
    );

    const jobs = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    for (const job of jobs) {
      job.status = 'queued';
      job.retryCount = 0;
      job.errors = [];
      this.jobs.set(job.id, job);

      const priorityValue = this.getPriorityValue(job.priority);
      this.queue.add(() => this.executeJob(job), { priority: priorityValue });
    }
  }

  /**
   * Clear completed jobs older than specified days
   */
  async cleanupOldJobs(daysOld = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let removed = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (
        job.status === 'completed' &&
        job.completedAt &&
        job.completedAt < cutoffDate
      ) {
        this.jobs.delete(id);
        removed++;
      }
    }

    loggers.pipelineOrchestrator(`Cleaned up ${removed} old jobs`);

    return removed;
  }

  /**
   * Pause the pipeline
   */
  pause(): void {
    this.queue.pause();
    loggers.pipelineOrchestrator('Pipeline paused');
  }

  /**
   * Resume the pipeline
   */
  resume(): void {
    this.queue.start();
    loggers.pipelineOrchestrator('Pipeline resumed');
  }

  /**
   * Clear all pending jobs
   */
  clear(): void {
    this.queue.clear();
    loggers.pipelineOrchestrator('Pipeline cleared');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Convert priority to numeric value for p-queue
   */
  private getPriorityValue(priority: JobPriority): number {
    const priorityMap: Record<JobPriority, number> = {
      critical: 10,
      high: 5,
      normal: 0,
      low: -5,
    };
    return priorityMap[priority];
  }

  /**
   * Persist job status to database
   */
  private async persistJobStatus(job: Job): Promise<void> {
    try {
      // Store in import_logs table for tracking
      const existingLog = await prisma.importLog.findFirst({
        where: {
          metadata: {
            path: ['jobId'],
            equals: job.id,
          },
        },
      });

      if (existingLog) {
        await prisma.importLog.update({
          where: { id: existingLog.id },
          data: {
            metadata: {
              ...job.metadata,
              jobId: job.id,
              type: job.type,
              status: job.status,
              retryCount: job.retryCount,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
            },
          },
        });
      } else {
        await prisma.importLog.create({
          data: {
            source: job.source,
            recordsImported: 0,
            recordsFailed: 0,
            errors: job.errors,
            metadata: {
              jobId: job.id,
              type: job.type,
              status: job.status,
              priority: job.priority,
              retryCount: job.retryCount,
              maxRetries: job.maxRetries,
              createdAt: job.createdAt,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
            },
          },
        });
      }
    } catch (error) {
      loggers.error('Pipeline Orchestrator', error as Error, { jobId: job.id });
    }
  }

  /**
   * Update import log with job results
   */
  private async updateImportLog(job: Job, result: JobResult): Promise<void> {
    try {
      await prisma.importLog.updateMany({
        where: {
          metadata: {
            path: ['jobId'],
            equals: job.id,
          },
        },
        data: {
          recordsImported: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          errors: result.errors,
          metadata: {
            ...job.metadata,
            jobId: job.id,
            type: job.type,
            status: job.status,
            completedAt: job.completedAt,
            duration: job.completedAt
              ? job.completedAt.getTime() - job.startedAt!.getTime()
              : null,
          },
        },
      });
    } catch (error) {
      loggers.error('Pipeline Orchestrator', error as Error, { jobId: job.id });
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let orchestrator: PipelineOrchestrator | null = null;

/**
 * Get singleton pipeline orchestrator instance
 */
export function getPipelineOrchestrator(concurrency = 3): PipelineOrchestrator {
  if (!orchestrator) {
    orchestrator = new PipelineOrchestrator(concurrency);
  }
  return orchestrator;
}

/**
 * Reset pipeline orchestrator (for testing)
 */
export function resetPipelineOrchestrator(): void {
  if (orchestrator) {
    orchestrator.clear();
    orchestrator = null;
  }
}

export default PipelineOrchestrator;
