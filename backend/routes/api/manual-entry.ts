/**
 * Manual Entry API Routes
 *
 * Endpoints for manual data entry (bugs, projects, hours).
 */

import { Router, Request, Response } from 'express';
import {
  createBug,
  updateBug,
  createProject,
  updateProject,
  logEngineeringHours,
  createBugsBatch,
  deleteBug,
} from '../../actions/manual-entry';
import { loggers } from '../../lib/logger';

const router = Router();

// ============================================================================
// BUG ROUTES
// ============================================================================

/**
 * POST /api/manual/bugs
 * Create a new bug manually
 */
router.post('/bugs', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const result = await createBug(req.body, userId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PUT /api/manual/bugs/:bugId
 * Update an existing bug
 */
router.put('/bugs/:bugId', async (req: Request, res: Response) => {
  try {
    const { bugId } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    const result = await updateBug(bugId, req.body, userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/manual/bugs/:bugId
 * Delete a bug (soft delete)
 */
router.delete('/bugs/:bugId', async (req: Request, res: Response) => {
  try {
    const { bugId } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    const result = await deleteBug(bugId, userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/manual/bugs/batch
 * Create multiple bugs in batch
 */
router.post('/bugs/batch', async (req: Request, res: Response) => {
  try {
    const { bugs } = req.body;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!Array.isArray(bugs)) {
      return res.status(400).json({
        success: false,
        error: 'bugs must be an array',
      });
    }

    const result = await createBugsBatch(bugs, userId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// ============================================================================
// PROJECT ROUTES
// ============================================================================

/**
 * POST /api/manual/projects
 * Create a new project manually
 */
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const result = await createProject(req.body, userId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * PUT /api/manual/projects/:projectId
 * Update an existing project
 */
router.put('/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.headers['x-user-id'] as string | undefined;
    const result = await updateProject(projectId, req.body, userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// ============================================================================
// ENGINEERING HOURS ROUTES
// ============================================================================

/**
 * POST /api/manual/hours
 * Log engineering hours for a bug
 */
router.post('/hours', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const result = await logEngineeringHours(req.body, userId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    loggers.error('Manual Entry API', error as Error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
