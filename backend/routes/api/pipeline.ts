/**
 * Pipeline API Routes
 *
 * Endpoints for managing the data ingestion pipeline orchestrator.
 */

import { Router, Request, Response } from 'express';
import { getPipelineOrchestrator } from '../../lib/pipeline-orchestrator';
import { loggers } from '../../lib/logger';

const router = Router();

/**
 * GET /api/pipeline/stats
 * Get pipeline statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const orchestrator = getPipelineOrchestrator();
    const stats = orchestrator.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/pipeline/jobs
 * Get all jobs with optional filtering
 */
router.get('/jobs', (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const orchestrator = getPipelineOrchestrator();

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const jobs = orchestrator.getJobs(filter);

    res.json({
      success: true,
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/pipeline/jobs/:jobId
 * Get specific job status
 */
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const orchestrator = getPipelineOrchestrator();
    const job = orchestrator.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/pipeline/jobs
 * Add a new job to the pipeline
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { type, payload, priority, source, maxRetries, metadata } = req.body;

    if (!type || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Type and payload are required',
      });
    }

    const orchestrator = getPipelineOrchestrator();
    const jobId = await orchestrator.addJob(type, payload, {
      priority,
      source,
      maxRetries,
      metadata,
    });

    res.status(202).json({
      success: true,
      jobId,
      message: 'Job added to pipeline',
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/pipeline/dlq
 * Get dead letter queue
 */
router.get('/dlq', (req: Request, res: Response) => {
  try {
    const orchestrator = getPipelineOrchestrator();
    const dlq = orchestrator.getDeadLetterQueue();

    res.json({
      success: true,
      jobs: dlq,
      total: dlq.length,
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/pipeline/dlq/retry
 * Retry all jobs in dead letter queue
 */
router.post('/dlq/retry', async (req: Request, res: Response) => {
  try {
    const orchestrator = getPipelineOrchestrator();
    await orchestrator.retryDeadLetterQueue();

    res.json({
      success: true,
      message: 'Dead letter queue jobs requeued',
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/pipeline/pause
 * Pause the pipeline
 */
router.post('/pause', (req: Request, res: Response) => {
  try {
    const orchestrator = getPipelineOrchestrator();
    orchestrator.pause();

    res.json({
      success: true,
      message: 'Pipeline paused',
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/pipeline/resume
 * Resume the pipeline
 */
router.post('/resume', (req: Request, res: Response) => {
  try {
    const orchestrator = getPipelineOrchestrator();
    orchestrator.resume();

    res.json({
      success: true,
      message: 'Pipeline resumed',
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/pipeline/cleanup
 * Clean up old completed jobs
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { daysOld = 7 } = req.body;
    const orchestrator = getPipelineOrchestrator();
    const removed = await orchestrator.cleanupOldJobs(daysOld);

    res.json({
      success: true,
      message: `Removed ${removed} old jobs`,
      removed,
    });
  } catch (error) {
    loggers.error('Pipeline API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
