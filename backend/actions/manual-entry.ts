/**
 * Manual Entry Server Actions
 *
 * Handles manual data entry for bugs, projects, and engineering hours.
 * Features:
 * - Input validation with Zod
 * - Auto-generated bug numbers
 * - Audit logging
 * - Transaction support
 */

import prisma from '../lib/prisma';
import { loggers } from '../lib/logger';
import {
  ManualBugEntrySchema,
  ManualProjectEntrySchema,
  ManualEngineeringHoursSchema,
  formatValidationErrors,
} from '../lib/validation-schemas';
import type {
  ManualBugEntry,
  ManualProjectEntry,
  ManualEngineeringHours,
} from '../lib/validation-schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: string[];
}

// ============================================================================
// BUG ENTRY
// ============================================================================

/**
 * Generate unique bug number
 */
async function generateBugNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Count bugs created this month
  const startOfMonth = new Date(year, date.getMonth(), 1);
  const endOfMonth = new Date(year, date.getMonth() + 1, 0, 23, 59, 59);

  const count = await prisma.bug.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `BUG-${year}${month}-${sequence}`;
}

/**
 * Create a new bug manually
 */
export async function createBug(
  input: ManualBugEntry,
  userId?: string
): Promise<ActionResult<{ id: string; bugNumber: string }>> {
  try {
    // Validate input
    const validation = ManualBugEntrySchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        validationErrors: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    const data = validation.data;

    // Generate bug number
    const bugNumber = await generateBugNumber();

    loggers.manualEntry(`Creating bug: ${bugNumber}`, { userId, data });

    // Create bug in transaction
    const bug = await prisma.$transaction(async (tx) => {
      const newBug = await tx.bug.create({
        data: {
          bugNumber,
          title: data.title,
          description: data.description,
          severity: data.severity,
          status: data.status,
          assignedToId: data.assignedToId,
          projectId: data.projectId,
          slaHours: data.slaHours,
          businessImpact: data.businessImpact,
          revenueImpact: data.revenueImpact,
          isBlocker: data.isBlocker,
          priorityScore: data.priorityScore,
          estimatedHours: data.estimatedHours,
          createdById: userId,
        },
      });

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'bug_created',
            entityType: 'bug',
            entityId: newBug.id,
            details: {
              bugNumber: newBug.bugNumber,
              title: newBug.title,
              severity: newBug.severity,
            },
          },
        });
      }

      // Create import log
      await tx.importLog.create({
        data: {
          source: 'manual',
          recordsImported: 1,
          recordsFailed: 0,
          errors: [],
          metadata: {
            type: 'bug',
            bugNumber: newBug.bugNumber,
            userId,
          },
        },
      });

      return newBug;
    });

    loggers.manualEntry(`Bug created successfully: ${bugNumber}`, { bugId: bug.id });

    return {
      success: true,
      data: {
        id: bug.id,
        bugNumber: bug.bugNumber,
      },
    };
  } catch (error) {
    loggers.error('Manual Entry', error as Error, { type: 'bug', userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Update an existing bug
 */
export async function updateBug(
  bugId: string,
  input: Partial<ManualBugEntry>,
  userId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    loggers.manualEntry(`Updating bug: ${bugId}`, { userId, data: input });

    // Get existing bug
    const existingBug = await prisma.bug.findUnique({
      where: { id: bugId },
    });

    if (!existingBug) {
      return {
        success: false,
        error: 'Bug not found',
      };
    }

    // Update bug in transaction
    const bug = await prisma.$transaction(async (tx) => {
      const updatedBug = await tx.bug.update({
        where: { id: bugId },
        data: input,
      });

      // Create bug history entries for changed fields
      for (const [field, newValue] of Object.entries(input)) {
        const oldValue = (existingBug as any)[field];
        if (oldValue !== newValue) {
          await tx.bugHistory.create({
            data: {
              bugId,
              fieldChanged: field,
              oldValue: String(oldValue),
              newValue: String(newValue),
              changedById: userId,
            },
          });
        }
      }

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'bug_updated',
            entityType: 'bug',
            entityId: bugId,
            details: {
              bugNumber: updatedBug.bugNumber,
              changes: input,
            },
          },
        });
      }

      return updatedBug;
    });

    loggers.manualEntry(`Bug updated successfully: ${existingBug.bugNumber}`, { bugId });

    return {
      success: true,
      data: { id: bug.id },
    };
  } catch (error) {
    loggers.error('Manual Entry', error as Error, { type: 'bug_update', bugId, userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============================================================================
// PROJECT ENTRY
// ============================================================================

/**
 * Create a new project manually
 */
export async function createProject(
  input: ManualProjectEntry,
  userId?: string
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    // Validate input
    const validation = ManualProjectEntrySchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        validationErrors: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    const data = validation.data;

    loggers.manualEntry(`Creating project: ${data.name}`, { userId });

    // Check for duplicates
    const existing = await prisma.project.findFirst({
      where: {
        OR: [
          { name: data.name },
          data.githubUrl ? { githubUrl: data.githubUrl } : {},
        ],
      },
    });

    if (existing) {
      return {
        success: false,
        error: 'Project with this name or GitHub URL already exists',
      };
    }

    // Create project in transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          githubUrl: data.githubUrl,
          demoUrl: data.demoUrl,
          language: data.language,
          tags: data.tags || [],
          status: data.status,
          complexity: data.complexity,
          clientAppeal: data.clientAppeal,
          totalMilestones: data.totalMilestones,
        },
      });

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'project_created',
            entityType: 'project',
            entityId: newProject.id,
            details: {
              name: newProject.name,
              githubUrl: newProject.githubUrl,
            },
          },
        });
      }

      // Create import log
      await tx.importLog.create({
        data: {
          source: 'manual',
          recordsImported: 1,
          recordsFailed: 0,
          errors: [],
          metadata: {
            type: 'project',
            projectName: newProject.name,
            userId,
          },
        },
      });

      return newProject;
    });

    loggers.manualEntry(`Project created successfully: ${data.name}`, { projectId: project.id });

    return {
      success: true,
      data: {
        id: project.id,
        name: project.name,
      },
    };
  } catch (error) {
    loggers.error('Manual Entry', error as Error, { type: 'project', userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  input: Partial<ManualProjectEntry>,
  userId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    loggers.manualEntry(`Updating project: ${projectId}`, { userId, data: input });

    // Update project in transaction
    const project = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: input,
      });

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'project_updated',
            entityType: 'project',
            entityId: projectId,
            details: {
              name: updatedProject.name,
              changes: input,
            },
          },
        });
      }

      return updatedProject;
    });

    loggers.manualEntry(`Project updated successfully: ${project.name}`, { projectId });

    return {
      success: true,
      data: { id: project.id },
    };
  } catch (error) {
    loggers.error('Manual Entry', error as Error, { type: 'project_update', projectId, userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============================================================================
// ENGINEERING HOURS ENTRY
// ============================================================================

/**
 * Log engineering hours for a bug
 */
export async function logEngineeringHours(
  input: ManualEngineeringHours,
  userId?: string
): Promise<ActionResult<{ bugId: string; hoursLogged: number }>> {
  try {
    // Validate input
    const validation = ManualEngineeringHoursSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        validationErrors: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    const data = validation.data;

    loggers.manualEntry(`Logging ${data.hours} hours for bug: ${data.bugId}`, { userId });

    // Update bug in transaction
    const bug = await prisma.$transaction(async (tx) => {
      // Get current bug
      const currentBug = await tx.bug.findUnique({
        where: { id: data.bugId },
      });

      if (!currentBug) {
        throw new Error('Bug not found');
      }

      // Update actual hours
      const newActualHours =
        (currentBug.actualHours ? parseFloat(currentBug.actualHours.toString()) : 0) + data.hours;

      const updatedBug = await tx.bug.update({
        where: { id: data.bugId },
        data: {
          actualHours: newActualHours,
        },
      });

      // Create bug history
      await tx.bugHistory.create({
        data: {
          bugId: data.bugId,
          fieldChanged: 'actualHours',
          oldValue: currentBug.actualHours?.toString() || '0',
          newValue: newActualHours.toString(),
          changedById: userId,
        },
      });

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'hours_logged',
            entityType: 'bug',
            entityId: data.bugId,
            details: {
              bugNumber: updatedBug.bugNumber,
              hoursAdded: data.hours,
              totalHours: newActualHours,
              notes: data.notes,
            },
          },
        });
      }

      return updatedBug;
    });

    loggers.manualEntry(`Hours logged successfully for bug: ${bug.bugNumber}`, {
      bugId: bug.id,
      hours: data.hours,
    });

    return {
      success: true,
      data: {
        bugId: bug.id,
        hoursLogged: data.hours,
      },
    };
  } catch (error) {
    loggers.error('Manual Entry', error as Error, { type: 'hours_logging', userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Create multiple bugs in batch
 */
export async function createBugsBatch(
  inputs: ManualBugEntry[],
  userId?: string
): Promise<ActionResult<{ created: number; failed: number; errors: string[] }>> {
  const results = {
    created: 0,
    failed: 0,
    errors: [] as string[],
  };

  loggers.manualEntry(`Creating ${inputs.length} bugs in batch`, { userId });

  for (const input of inputs) {
    const result = await createBug(input, userId);
    if (result.success) {
      results.created++;
    } else {
      results.failed++;
      results.errors.push(result.error || 'Unknown error');
    }
  }

  loggers.manualEntry(
    `Batch bug creation completed. Created: ${results.created}, Failed: ${results.failed}`,
    { userId }
  );

  return {
    success: results.failed === 0,
    data: results,
  };
}

/**
 * Delete a bug (soft delete by changing status)
 */
export async function deleteBug(
  bugId: string,
  userId?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    loggers.manualEntry(`Deleting bug: ${bugId}`, { userId });

    const bug = await prisma.$transaction(async (tx) => {
      const updatedBug = await tx.bug.update({
        where: { id: bugId },
        data: { status: 'closed' },
      });

      // Create audit log
      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'bug_deleted',
            entityType: 'bug',
            entityId: bugId,
            details: {
              bugNumber: updatedBug.bugNumber,
            },
          },
        });
      }

      return updatedBug;
    });

    loggers.manualEntry(`Bug deleted successfully: ${bug.bugNumber}`, { bugId });

    return {
      success: true,
      data: { id: bug.id },
    };
  } catch (error) {
    loggers.error('Manual Entry', error as Error, { type: 'bug_delete', bugId, userId });
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export default {
  createBug,
  updateBug,
  createProject,
  updateProject,
  logEngineeringHours,
  createBugsBatch,
  deleteBug,
};
