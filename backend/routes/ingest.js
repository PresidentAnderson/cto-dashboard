/**
 * Ingestion API Routes - CSV Upload & GitHub Sync
 * CTO Dashboard v2.0
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const {
  asyncHandler,
  authenticateApiKey,
  strictLimiter,
  validateRequest
} = require('../lib/middleware');

const {
  csvImportSchema,
  githubSyncSchema,
  syncStatusSchema
} = require('../lib/validators');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Store active sync operations
const activeSyncs = new Map();

// ============================================================================
// POST /api/ingest/csv - CSV upload endpoint
// ============================================================================

router.post('/csv',
  authenticateApiKey,
  strictLimiter,
  upload.single('file'),
  validateRequest(csvImportSchema, 'body'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.error('No file uploaded', 'FILE_REQUIRED', 400);
    }

    const { type, overwrite, validate_only } = req.body;
    const fileBuffer = req.file.buffer;

    // Parse CSV
    const records = [];
    const errors = [];

    const stream = Readable.from(fileBuffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          records.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (records.length === 0) {
      return res.error('CSV file is empty', 'EMPTY_FILE', 400);
    }

    // Validate records based on type
    const validRecords = [];
    let lineNumber = 1;

    for (const record of records) {
      lineNumber++;

      try {
        if (type === 'projects') {
          validateProjectRecord(record);
        } else if (type === 'bugs') {
          validateBugRecord(record);
        }
        validRecords.push(record);
      } catch (err) {
        errors.push({
          line: lineNumber,
          error: err.message,
          record
        });
      }
    }

    // If validate_only, return validation results
    if (validate_only) {
      return res.success({
        valid: validRecords.length,
        invalid: errors.length,
        total: records.length,
        errors: errors.slice(0, 20), // Limit error output
        message: errors.length === 0 ? 'All records are valid' : 'Validation errors found'
      });
    }

    // Import records
    let imported = 0;
    let failed = 0;
    const importErrors = [];

    for (const record of validRecords) {
      try {
        if (type === 'projects') {
          await importProject(record, overwrite);
        } else if (type === 'bugs') {
          await importBug(record, overwrite);
        }
        imported++;
      } catch (err) {
        failed++;
        importErrors.push({
          record,
          error: err.message
        });
      }
    }

    // Log import
    await prisma.importLog.create({
      data: {
        source: 'csv',
        recordsImported: imported,
        recordsFailed: failed + errors.length,
        errors: [...errors.map(e => e.error), ...importErrors.map(e => e.error)],
        metadata: {
          type,
          filename: req.file.originalname,
          filesize: req.file.size,
          overwrite
        }
      }
    });

    return res.success({
      imported,
      failed: failed + errors.length,
      total: records.length,
      errors: importErrors.length > 0 ? importErrors.slice(0, 10) : undefined
    });
  })
);

// ============================================================================
// POST /api/sync/github - Trigger GitHub sync
// ============================================================================

router.post('/github',
  authenticateApiKey,
  strictLimiter,
  validateRequest(githubSyncSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { repository, full_sync, force } = req.body;

    // Create sync ID
    const syncId = crypto.randomUUID();

    // Check for active syncs
    if (!force && activeSyncs.size > 0) {
      return res.error(
        'Another sync is already in progress. Use force=true to override.',
        'SYNC_IN_PROGRESS',
        409
      );
    }

    // Start sync in background
    const syncOperation = {
      id: syncId,
      repository: repository || 'all',
      full_sync,
      status: 'running',
      started_at: new Date(),
      progress: {
        repositories_processed: 0,
        repositories_total: 0,
        issues_synced: 0,
        errors: []
      }
    };

    activeSyncs.set(syncId, syncOperation);

    // Run sync asynchronously
    runGithubSync(syncId, repository, full_sync).catch(err => {
      console.error('GitHub sync error:', err);
      const sync = activeSyncs.get(syncId);
      if (sync) {
        sync.status = 'failed';
        sync.error = err.message;
        sync.completed_at = new Date();
      }
    });

    return res.success({
      sync_id: syncId,
      status: 'started',
      message: 'GitHub sync initiated. Use GET /api/sync/status to check progress.',
      repository: repository || 'all repositories'
    });
  })
);

// ============================================================================
// GET /api/sync/status - Get sync progress
// ============================================================================

router.get('/status',
  authenticateApiKey,
  asyncHandler(async (req, res) => {
    const { sync_id } = req.query;

    if (sync_id) {
      const sync = activeSyncs.get(sync_id);

      if (!sync) {
        return res.error('Sync operation not found', 'SYNC_NOT_FOUND', 404);
      }

      return res.success(sync);
    }

    // Return all active syncs
    const syncs = Array.from(activeSyncs.values());

    return res.success({
      active_syncs: syncs.length,
      syncs
    });
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate project CSV record
 */
function validateProjectRecord(record) {
  if (!record.name || record.name.trim() === '') {
    throw new Error('Project name is required');
  }

  if (record.complexity && (parseInt(record.complexity) < 1 || parseInt(record.complexity) > 10)) {
    throw new Error('Complexity must be between 1 and 10');
  }

  if (record.client_appeal && (parseInt(record.client_appeal) < 1 || parseInt(record.client_appeal) > 10)) {
    throw new Error('Client appeal must be between 1 and 10');
  }

  if (record.status && !['active', 'shipped', 'deferred', 'cancelled'].includes(record.status)) {
    throw new Error('Invalid status value');
  }
}

/**
 * Validate bug CSV record
 */
function validateBugRecord(record) {
  if (!record.title || record.title.trim() === '') {
    throw new Error('Bug title is required');
  }

  if (!record.severity || !['critical', 'high', 'medium', 'low'].includes(record.severity)) {
    throw new Error('Invalid or missing severity');
  }

  if (record.status && !['pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred'].includes(record.status)) {
    throw new Error('Invalid status value');
  }
}

/**
 * Import project from CSV record
 */
async function importProject(record, overwrite) {
  const projectData = {
    name: record.name,
    description: record.description || null,
    githubUrl: record.github_url || null,
    demoUrl: record.demo_url || null,
    language: record.language || null,
    tags: record.tags ? record.tags.split(',').map(t => t.trim()) : [],
    status: record.status || 'active',
    complexity: record.complexity ? parseInt(record.complexity) : null,
    clientAppeal: record.client_appeal ? parseInt(record.client_appeal) : null,
    currentMilestone: record.current_milestone ? parseInt(record.current_milestone) : 0,
    totalMilestones: record.total_milestones ? parseInt(record.total_milestones) : 0,
    arr: record.arr ? parseFloat(record.arr) : null,
    year1Revenue: record.year1_revenue ? parseFloat(record.year1_revenue) : null,
    year3Revenue: record.year3_revenue ? parseFloat(record.year3_revenue) : null,
    monthlyInfraCost: record.monthly_infra_cost ? parseFloat(record.monthly_infra_cost) : null
  };

  if (overwrite && record.id) {
    await prisma.project.upsert({
      where: { id: record.id },
      update: projectData,
      create: projectData
    });
  } else {
    await prisma.project.create({
      data: projectData
    });
  }
}

/**
 * Import bug from CSV record
 */
async function importBug(record, overwrite) {
  // Generate bug number if not provided
  let bugNumber = record.bug_number;
  if (!bugNumber) {
    const count = await prisma.bug.count();
    bugNumber = `BUG-${(count + 1).toString().padStart(5, '0')}`;
  }

  // Calculate SLA hours based on severity
  const slaHours = {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168
  }[record.severity];

  // Calculate priority score
  const severityScore = { critical: 100, high: 75, medium: 50, low: 25 }[record.severity];
  const blockerBonus = record.is_blocker === 'true' ? 50 : 0;
  const priorityScore = severityScore + blockerBonus;

  const bugData = {
    bugNumber,
    title: record.title,
    description: record.description || null,
    severity: record.severity,
    status: record.status || 'pending',
    slaHours,
    businessImpact: record.business_impact || null,
    revenueImpact: record.revenue_impact_daily ? parseFloat(record.revenue_impact_daily) : null,
    isBlocker: record.is_blocker === 'true',
    priorityScore,
    estimatedHours: record.estimated_hours ? parseFloat(record.estimated_hours) : null,
    actualHours: record.actual_hours ? parseFloat(record.actual_hours) : null
  };

  // Link to project if project_id provided
  if (record.project_id) {
    bugData.projectId = record.project_id;
  }

  if (overwrite && record.id) {
    await prisma.bug.upsert({
      where: { id: record.id },
      update: bugData,
      create: bugData
    });
  } else {
    await prisma.bug.create({
      data: bugData
    });
  }
}

/**
 * Run GitHub sync operation
 */
async function runGithubSync(syncId, repository, fullSync) {
  const sync = activeSyncs.get(syncId);

  try {
    // Get repositories to sync
    let repositories;

    if (repository) {
      // Sync specific repository
      repositories = await prisma.project.findMany({
        where: {
          githubUrl: { contains: repository }
        }
      });
      sync.progress.repositories_total = repositories.length;
    } else {
      // Sync all repositories with GitHub URLs
      repositories = await prisma.project.findMany({
        where: {
          githubUrl: { not: null }
        }
      });
      sync.progress.repositories_total = repositories.length;
    }

    if (repositories.length === 0) {
      throw new Error('No repositories found to sync');
    }

    // Sync each repository (placeholder - implement actual GitHub API calls)
    for (const repo of repositories) {
      try {
        // TODO: Implement actual GitHub API sync logic
        // This would fetch issues, pull requests, commits, etc.

        sync.progress.repositories_processed++;
        sync.progress.issues_synced += 0; // Placeholder
      } catch (err) {
        sync.progress.errors.push({
          repository: repo.name,
          error: err.message
        });
      }
    }

    // Log sync completion
    await prisma.importLog.create({
      data: {
        source: 'github',
        recordsImported: sync.progress.issues_synced,
        recordsFailed: sync.progress.errors.length,
        errors: sync.progress.errors.map(e => e.error),
        metadata: {
          sync_id: syncId,
          repository: repository || 'all',
          full_sync: fullSync,
          repositories_synced: sync.progress.repositories_processed
        }
      }
    });

    sync.status = 'completed';
    sync.completed_at = new Date();

    // Clean up after 1 hour
    setTimeout(() => {
      activeSyncs.delete(syncId);
    }, 60 * 60 * 1000);

  } catch (err) {
    sync.status = 'failed';
    sync.error = err.message;
    sync.completed_at = new Date();
    throw err;
  }
}

module.exports = router;
