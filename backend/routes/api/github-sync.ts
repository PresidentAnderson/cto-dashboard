/**
 * GitHub Sync API Routes
 *
 * Endpoints for triggering and managing GitHub synchronization.
 */

import { Router, Request, Response } from 'express';
import { createGitHubSync } from '../../lib/github-sync';
import { getPipelineOrchestrator } from '../../lib/pipeline-orchestrator';
import { loggers } from '../../lib/logger';

const router = Router();

/**
 * POST /api/github/sync
 * Trigger a GitHub sync
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const {
      token,
      owner,
      incremental = false,
      syncRepos = true,
      syncIssues = true,
      useQueue = true,
    } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'GitHub token is required',
      });
    }

    if (useQueue) {
      // Add to pipeline queue
      const orchestrator = getPipelineOrchestrator();
      const jobId = await orchestrator.addJob(
        'github_sync',
        { token, owner, options: { incremental, syncRepos, syncIssues } },
        {
          priority: 'high',
          source: 'github',
          metadata: {
            owner: owner || 'authenticated-user',
            incremental,
          },
        }
      );

      res.status(202).json({
        success: true,
        message: 'GitHub sync job queued',
        jobId,
      });
    } else {
      // Execute immediately
      const engine = createGitHubSync(token, owner);
      const result = await engine.fullSync({ incremental, syncRepos, syncIssues });

      res.json({
        success: result.success,
        result,
      });
    }
  } catch (error) {
    loggers.error('GitHub Sync API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/github/sync-repo
 * Sync a specific repository
 */
router.post('/sync-repo', async (req: Request, res: Response) => {
  try {
    const { token, owner, repo } = req.body;

    if (!token || !owner || !repo) {
      return res.status(400).json({
        success: false,
        error: 'Token, owner, and repo are required',
      });
    }

    const engine = createGitHubSync(token);
    const result = await engine.syncIssuesForRepo(owner, repo);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    loggers.error('GitHub Sync API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/github/rate-limit
 * Check GitHub API rate limit
 */
router.get('/rate-limit', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Authorization token is required',
      });
    }

    const engine = createGitHubSync(token);
    const rateLimit = await engine.getRateLimit();

    res.json({
      success: true,
      rateLimit,
    });
  } catch (error) {
    loggers.error('GitHub Sync API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/github/scheduled-sync
 * Set up scheduled sync (placeholder for cron job)
 */
router.post('/scheduled-sync', async (req: Request, res: Response) => {
  try {
    const { token, owner, schedule = 'daily' } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'GitHub token is required',
      });
    }

    // In production, this would integrate with a job scheduler like node-cron or bull
    // For now, we'll just add it to the pipeline with high priority

    const orchestrator = getPipelineOrchestrator();
    const jobId = await orchestrator.addJob(
      'github_sync',
      { token, owner, options: { incremental: true } },
      {
        priority: 'normal',
        source: 'github',
        metadata: {
          scheduled: true,
          schedule,
          owner: owner || 'authenticated-user',
        },
      }
    );

    res.json({
      success: true,
      message: `Scheduled ${schedule} sync job created`,
      jobId,
    });
  } catch (error) {
    loggers.error('GitHub Sync API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
