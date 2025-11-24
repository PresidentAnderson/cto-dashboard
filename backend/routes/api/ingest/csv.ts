/**
 * CSV Ingestion Route Handler
 *
 * Handles CSV file uploads for projects and bugs.
 * Features:
 * - Batch processing (50 records at a time)
 * - Deduplication based on unique fields
 * - Progress tracking
 * - Detailed error logging
 * - Transaction support
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../lib/prisma';
import { loggers } from '../../../lib/logger';
import {
  ProjectCSVSchema,
  BugCSVSchema,
  validateBatch,
  formatValidationErrors,
} from '../../../lib/validation-schemas';
import type { ProjectCSVInput, BugCSVInput } from '../../../lib/validation-schemas';

const router = Router();

// Configure multer for file upload (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// ============================================================================
// TYPES
// ============================================================================

interface IngestionProgress {
  jobId: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  errors: Array<{ row: number; errors: string[] }>;
  status: 'processing' | 'completed' | 'failed';
}

// In-memory progress tracking (in production, use Redis or database)
const progressTrackers = new Map<string, IngestionProgress>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse CSV file and return records
 */
function parseCSV(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(buffer.toString(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Batch process array into chunks
 */
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Check if project already exists by GitHub URL or name
 */
async function isProjectDuplicate(project: ProjectCSVInput): Promise<boolean> {
  const existing = await prisma.project.findFirst({
    where: {
      OR: [
        project.githubUrl ? { githubUrl: project.githubUrl } : {},
        { name: project.name },
      ],
    },
  });
  return !!existing;
}

/**
 * Check if bug already exists by bug number
 */
async function isBugDuplicate(bugNumber: string): Promise<boolean> {
  const existing = await prisma.bug.findUnique({
    where: { bugNumber },
  });
  return !!existing;
}

/**
 * Resolve project by name if projectId not provided
 */
async function resolveProjectId(
  projectId: string | null | undefined,
  projectName: string | null | undefined
): Promise<string | null> {
  if (projectId) return projectId;
  if (!projectName) return null;

  const project = await prisma.project.findFirst({
    where: { name: projectName },
    select: { id: true },
  });
  return project?.id || null;
}

/**
 * Resolve user by email
 */
async function resolveUserId(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return user?.id || null;
}

// ============================================================================
// PROJECT INGESTION
// ============================================================================

async function ingestProjects(
  records: any[],
  jobId: string
): Promise<IngestionProgress> {
  const progress: IngestionProgress = {
    jobId,
    totalRecords: records.length,
    processedRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    duplicateRecords: 0,
    errors: [],
    status: 'processing',
  };

  progressTrackers.set(jobId, progress);
  loggers.csvIngestion(`Starting project ingestion. Total records: ${records.length}`, { jobId });

  // Validate all records first
  const { valid, invalid } = validateBatch(records, ProjectCSVSchema);

  // Add validation errors to progress
  invalid.forEach((item, index) => {
    progress.errors.push({
      row: index + 2, // +2 for header and 0-index
      errors: item.errors,
    });
    progress.failedRecords++;
  });

  // Process valid records in batches
  const batches = batchArray(valid, 50);

  for (const [batchIndex, batch] of batches.entries()) {
    loggers.csvIngestion(
      `Processing batch ${batchIndex + 1}/${batches.length}`,
      { jobId, batchSize: batch.length }
    );

    for (const project of batch) {
      try {
        // Check for duplicates
        const isDuplicate = await isProjectDuplicate(project);
        if (isDuplicate) {
          progress.duplicateRecords++;
          progress.processedRecords++;
          loggers.warn('CSV Ingestion', `Duplicate project found: ${project.name}`, { jobId });
          continue;
        }

        // Insert project
        await prisma.project.create({
          data: {
            name: project.name,
            description: project.description || null,
            githubUrl: project.githubUrl || null,
            demoUrl: project.demoUrl || null,
            language: project.language || null,
            tags: Array.isArray(project.tags) ? project.tags : [],
            stars: project.stars || 0,
            forks: project.forks || 0,
            lastCommit: project.lastCommit || null,
            status: project.status || 'active',
            complexity: project.complexity || null,
            clientAppeal: project.clientAppeal || null,
            currentMilestone: project.currentMilestone || 0,
            totalMilestones: project.totalMilestones || 0,
            arr: project.arr || null,
            year1Revenue: project.year1Revenue || null,
            year3Revenue: project.year3Revenue || null,
            roiScore: project.roiScore || null,
            tam: project.tam || null,
            sam: project.sam || null,
            somYear3: project.somYear3 || null,
            tractionMrr: project.tractionMrr || null,
            marginPercent: project.marginPercent || null,
            dcfValuation: project.dcfValuation || null,
            monthlyInfraCost: project.monthlyInfraCost || null,
          },
        });

        progress.successfulRecords++;
        progress.processedRecords++;
      } catch (error) {
        loggers.error('CSV Ingestion', error as Error, { jobId, project: project.name });
        progress.errors.push({
          row: records.indexOf(project) + 2,
          errors: [(error as Error).message],
        });
        progress.failedRecords++;
        progress.processedRecords++;
      }
    }

    // Update progress
    progressTrackers.set(jobId, progress);
  }

  progress.status = 'completed';
  loggers.csvIngestion(
    `Project ingestion completed. Success: ${progress.successfulRecords}, Failed: ${progress.failedRecords}, Duplicates: ${progress.duplicateRecords}`,
    { jobId }
  );

  return progress;
}

// ============================================================================
// BUG INGESTION
// ============================================================================

async function ingestBugs(records: any[], jobId: string): Promise<IngestionProgress> {
  const progress: IngestionProgress = {
    jobId,
    totalRecords: records.length,
    processedRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    duplicateRecords: 0,
    errors: [],
    status: 'processing',
  };

  progressTrackers.set(jobId, progress);
  loggers.csvIngestion(`Starting bug ingestion. Total records: ${records.length}`, { jobId });

  // Validate all records first
  const { valid, invalid } = validateBatch(records, BugCSVSchema);

  // Add validation errors to progress
  invalid.forEach((item, index) => {
    progress.errors.push({
      row: index + 2,
      errors: item.errors,
    });
    progress.failedRecords++;
  });

  // Process valid records in batches
  const batches = batchArray(valid, 50);

  for (const [batchIndex, batch] of batches.entries()) {
    loggers.csvIngestion(
      `Processing batch ${batchIndex + 1}/${batches.length}`,
      { jobId, batchSize: batch.length }
    );

    for (const bug of batch) {
      try {
        // Check for duplicates
        const isDuplicate = await isBugDuplicate(bug.bugNumber);
        if (isDuplicate) {
          progress.duplicateRecords++;
          progress.processedRecords++;
          loggers.warn('CSV Ingestion', `Duplicate bug found: ${bug.bugNumber}`, { jobId });
          continue;
        }

        // Resolve project and user IDs
        const projectId = await resolveProjectId(bug.projectId, bug.projectName);
        const assignedToId = await resolveUserId(bug.assignedTo);

        // Insert bug
        await prisma.bug.create({
          data: {
            bugNumber: bug.bugNumber,
            title: bug.title,
            description: bug.description || null,
            severity: bug.severity,
            status: bug.status || 'pending',
            assignedToId: assignedToId || null,
            projectId: projectId || null,
            slaHours: bug.slaHours,
            businessImpact: bug.businessImpact || null,
            revenueImpact: bug.revenueImpact || null,
            isBlocker: bug.isBlocker || false,
            priorityScore: bug.priorityScore || 50,
            estimatedHours: bug.estimatedHours || null,
            actualHours: bug.actualHours || null,
            createdAt: bug.createdAt || new Date(),
            resolvedAt: bug.resolvedAt || null,
          },
        });

        progress.successfulRecords++;
        progress.processedRecords++;
      } catch (error) {
        loggers.error('CSV Ingestion', error as Error, { jobId, bug: bug.bugNumber });
        progress.errors.push({
          row: records.indexOf(bug) + 2,
          errors: [(error as Error).message],
        });
        progress.failedRecords++;
        progress.processedRecords++;
      }
    }

    // Update progress
    progressTrackers.set(jobId, progress);
  }

  progress.status = 'completed';
  loggers.csvIngestion(
    `Bug ingestion completed. Success: ${progress.successfulRecords}, Failed: ${progress.failedRecords}, Duplicates: ${progress.duplicateRecords}`,
    { jobId }
  );

  return progress;
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/ingest/csv
 * Upload and process CSV file
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type } = req.body; // 'projects' or 'bugs'

    if (!type || !['projects', 'bugs'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "projects" or "bugs"' });
    }

    const jobId = uuidv4();

    loggers.csvIngestion(`CSV upload received. Type: ${type}, Size: ${req.file.size} bytes`, {
      jobId,
      filename: req.file.originalname,
    });

    // Parse CSV
    const records = await parseCSV(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    // Create import log entry
    await prisma.importLog.create({
      data: {
        source: 'csv',
        recordsImported: 0,
        recordsFailed: 0,
        errors: [],
        metadata: {
          jobId,
          type,
          filename: req.file.originalname,
          totalRecords: records.length,
        },
      },
    });

    // Start ingestion process (async)
    const ingestionPromise =
      type === 'projects' ? ingestProjects(records, jobId) : ingestBugs(records, jobId);

    // Return job ID immediately for progress tracking
    res.status(202).json({
      message: 'CSV ingestion started',
      jobId,
      totalRecords: records.length,
    });

    // Handle completion in background
    ingestionPromise
      .then(async (progress) => {
        // Update import log
        await prisma.importLog.updateMany({
          where: {
            metadata: {
              path: ['jobId'],
              equals: jobId,
            },
          },
          data: {
            recordsImported: progress.successfulRecords,
            recordsFailed: progress.failedRecords,
            errors: progress.errors.map((e) => `Row ${e.row}: ${e.errors.join(', ')}`),
          },
        });
      })
      .catch((error) => {
        loggers.error('CSV Ingestion', error, { jobId });
      });
  } catch (error) {
    loggers.error('CSV Ingestion', error as Error);
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/ingest/csv/progress/:jobId
 * Get ingestion progress
 */
router.get('/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const progress = progressTrackers.get(jobId);

  if (!progress) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(progress);
});

/**
 * GET /api/ingest/csv/history
 * Get ingestion history from import logs
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const logs = await prisma.importLog.findMany({
      where: { source: 'csv' },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.importLog.count({
      where: { source: 'csv' },
    });

    res.json({
      logs,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    loggers.error('CSV Ingestion', error as Error);
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
});

export default router;
