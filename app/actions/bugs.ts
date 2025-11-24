/**
 * Bug Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 *
 * Handles all bug-related operations with:
 * - Zod validation
 * - SLA calculation
 * - Bug history tracking
 * - Cache revalidation
 * - Audit logging
 */

'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { type ActionResponse, success, error } from './types'
import {
  createBugSchema,
  updateBugSchema,
  bugStatusSchema,
  bugSeveritySchema,
  validateSchema,
} from './validations'
import {
  logAudit,
  triggerMetricsRecalculation,
  generateBugNumber,
  calculateSlaHours,
  toDecimal,
} from './utils'
import type { Bug, BugStatus, BugSeverity } from '@prisma/client'

// ============================================================================
// CACHE TAGS
// ============================================================================

const CACHE_TAGS = {
  bugs: 'bugs',
  bugDetail: (id: string) => `bug-${id}`,
  projectBugs: (projectId: string) => `project-bugs-${projectId}`,
  dashboard: 'dashboard',
} as const

// ============================================================================
// CREATE BUG
// ============================================================================

export async function createBugAction(
  data: Omit<Bug, 'id' | 'bugNumber' | 'createdAt' | 'updatedAt' | 'resolvedAt' | 'slaHours'>
): Promise<ActionResponse<Bug>> {
  try {
    // Validate data with Zod
    const validation = validateSchema(createBugSchema, data)
    if (!validation.success) {
      return error(validation.error, 'VALIDATION_ERROR')
    }

    const validatedData = validation.data

    // Generate bug number
    const bugNumber = await generateBugNumber()

    // Calculate SLA hours
    const slaHours = calculateSlaHours(validatedData.severity)

    // Verify project exists if projectId is provided
    if (validatedData.projectId) {
      const projectExists = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      })
      if (!projectExists) {
        return error('Project not found', 'PROJECT_NOT_FOUND')
      }
    }

    // Verify assigned user exists if assignedToId is provided
    if (validatedData.assignedToId) {
      const userExists = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId },
      })
      if (!userExists) {
        return error('Assigned user not found', 'USER_NOT_FOUND')
      }
    }

    // Create bug
    const bug = await prisma.bug.create({
      data: {
        bugNumber,
        title: validatedData.title,
        description: validatedData.description,
        severity: validatedData.severity,
        status: validatedData.status,
        assignedToId: validatedData.assignedToId,
        projectId: validatedData.projectId,
        slaHours,
        businessImpact: validatedData.businessImpact,
        revenueImpact: toDecimal(validatedData.revenueImpact),
        isBlocker: validatedData.isBlocker,
        priorityScore: validatedData.priorityScore,
        estimatedHours: toDecimal(validatedData.estimatedHours),
        createdById: validatedData.createdById,
      },
      include: {
        project: true,
        assignedTo: true,
        createdBy: true,
      },
    })

    // Log to audit
    await logAudit('bug.created', {}, 'bug', bug.id, {
      bugNumber: bug.bugNumber,
      title: bug.title,
      severity: bug.severity,
      projectId: bug.projectId,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.bugs)
    revalidateTag(CACHE_TAGS.dashboard)
    if (bug.projectId) {
      revalidateTag(CACHE_TAGS.projectBugs(bug.projectId))
    }
    revalidatePath('/dashboard')
    revalidatePath('/bugs')

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(bug.projectId || undefined)

    return success(bug as Bug)
  } catch (err) {
    console.error('Error creating bug:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to create bug',
      'CREATE_ERROR'
    )
  }
}

// ============================================================================
// UPDATE BUG
// ============================================================================

export async function updateBugAction(
  id: string,
  data: Partial<Omit<Bug, 'id' | 'bugNumber' | 'createdAt' | 'updatedAt' | 'slaHours'>>
): Promise<ActionResponse<Bug>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid bug ID', 'INVALID_ID')
    }

    // Validate data with Zod
    const validation = validateSchema(updateBugSchema, data)
    if (!validation.success) {
      return error(validation.error, 'VALIDATION_ERROR')
    }

    const validatedData = validation.data

    // Get existing bug for history tracking
    const existingBug = await prisma.bug.findUnique({
      where: { id },
    })

    if (!existingBug) {
      return error('Bug not found', 'NOT_FOUND')
    }

    // Track changes for history
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = []

    // Prepare update data
    const updateData: Record<string, unknown> = { ...validatedData }

    // Recalculate SLA if severity changed
    if (validatedData.severity && validatedData.severity !== existingBug.severity) {
      updateData.slaHours = calculateSlaHours(validatedData.severity as BugSeverity)
      changes.push({
        field: 'severity',
        oldValue: existingBug.severity,
        newValue: validatedData.severity,
      })
    }

    // Set resolvedAt if status changed to closed/shipped
    if (
      validatedData.status &&
      (validatedData.status === 'closed' || validatedData.status === 'shipped') &&
      !existingBug.resolvedAt
    ) {
      updateData.resolvedAt = new Date()
    }

    // Track all other changes
    Object.keys(validatedData).forEach((key) => {
      if (key !== 'severity' && validatedData[key as keyof typeof validatedData] !== existingBug[key as keyof typeof existingBug]) {
        changes.push({
          field: key,
          oldValue: String(existingBug[key as keyof typeof existingBug] || ''),
          newValue: String(validatedData[key as keyof typeof validatedData] || ''),
        })
      }
    })

    // Convert decimals
    if (updateData.revenueImpact !== undefined) {
      updateData.revenueImpact = toDecimal(updateData.revenueImpact as number)
    }
    if (updateData.estimatedHours !== undefined) {
      updateData.estimatedHours = toDecimal(updateData.estimatedHours as number)
    }
    if (updateData.actualHours !== undefined) {
      updateData.actualHours = toDecimal(updateData.actualHours as number)
    }

    // Update bug and create history entries in a transaction
    const bug = await prisma.$transaction(async (tx) => {
      const updatedBug = await tx.bug.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
          assignedTo: true,
          createdBy: true,
        },
      })

      // Create history entries for each change
      if (changes.length > 0) {
        await tx.bugHistory.createMany({
          data: changes.map((change) => ({
            bugId: id,
            fieldChanged: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            changedById: validatedData.createdById || null,
          })),
        })
      }

      return updatedBug
    })

    // Log to audit
    await logAudit('bug.updated', {}, 'bug', bug.id, {
      bugNumber: bug.bugNumber,
      changes: changes.map((c) => c.field),
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.bugs)
    revalidateTag(CACHE_TAGS.bugDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    if (bug.projectId) {
      revalidateTag(CACHE_TAGS.projectBugs(bug.projectId))
    }
    revalidatePath('/dashboard')
    revalidatePath('/bugs')
    revalidatePath(`/bugs/${id}`)

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(bug.projectId || undefined)

    return success(bug as Bug)
  } catch (err) {
    console.error('Error updating bug:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to update bug',
      'UPDATE_ERROR'
    )
  }
}

// ============================================================================
// UPDATE BUG STATUS (Quick Action)
// ============================================================================

export async function updateBugStatusAction(
  id: string,
  status: BugStatus
): Promise<ActionResponse<Bug>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid bug ID', 'INVALID_ID')
    }

    // Validate status
    const statusValidation = validateSchema(bugStatusSchema, status)
    if (!statusValidation.success) {
      return error(statusValidation.error, 'VALIDATION_ERROR')
    }

    // Get existing bug
    const existingBug = await prisma.bug.findUnique({
      where: { id },
    })

    if (!existingBug) {
      return error('Bug not found', 'NOT_FOUND')
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { status }

    // Set resolvedAt if status is closed/shipped
    if ((status === 'closed' || status === 'shipped') && !existingBug.resolvedAt) {
      updateData.resolvedAt = new Date()
    }

    // Update bug and create history
    const bug = await prisma.$transaction(async (tx) => {
      const updatedBug = await tx.bug.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
          assignedTo: true,
        },
      })

      // Create history entry
      await tx.bugHistory.create({
        data: {
          bugId: id,
          fieldChanged: 'status',
          oldValue: existingBug.status,
          newValue: status,
        },
      })

      return updatedBug
    })

    // Log to audit
    await logAudit('bug.status_updated', {}, 'bug', bug.id, {
      bugNumber: bug.bugNumber,
      oldStatus: existingBug.status,
      newStatus: status,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.bugs)
    revalidateTag(CACHE_TAGS.bugDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    if (bug.projectId) {
      revalidateTag(CACHE_TAGS.projectBugs(bug.projectId))
    }
    revalidatePath('/dashboard')
    revalidatePath('/bugs')
    revalidatePath(`/bugs/${id}`)

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(bug.projectId || undefined)

    return success(bug as Bug)
  } catch (err) {
    console.error('Error updating bug status:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to update bug status',
      'UPDATE_ERROR'
    )
  }
}

// ============================================================================
// UPDATE BUG SEVERITY (Quick Action)
// ============================================================================

export async function updateBugSeverityAction(
  id: string,
  severity: BugSeverity
): Promise<ActionResponse<Bug>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid bug ID', 'INVALID_ID')
    }

    // Validate severity
    const severityValidation = validateSchema(bugSeveritySchema, severity)
    if (!severityValidation.success) {
      return error(severityValidation.error, 'VALIDATION_ERROR')
    }

    // Get existing bug
    const existingBug = await prisma.bug.findUnique({
      where: { id },
    })

    if (!existingBug) {
      return error('Bug not found', 'NOT_FOUND')
    }

    // Calculate new SLA
    const slaHours = calculateSlaHours(severity)

    // Update bug and create history
    const bug = await prisma.$transaction(async (tx) => {
      const updatedBug = await tx.bug.update({
        where: { id },
        data: {
          severity,
          slaHours,
        },
        include: {
          project: true,
          assignedTo: true,
        },
      })

      // Create history entry
      await tx.bugHistory.create({
        data: {
          bugId: id,
          fieldChanged: 'severity',
          oldValue: existingBug.severity,
          newValue: severity,
        },
      })

      return updatedBug
    })

    // Log to audit
    await logAudit('bug.severity_updated', {}, 'bug', bug.id, {
      bugNumber: bug.bugNumber,
      oldSeverity: existingBug.severity,
      newSeverity: severity,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.bugs)
    revalidateTag(CACHE_TAGS.bugDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    if (bug.projectId) {
      revalidateTag(CACHE_TAGS.projectBugs(bug.projectId))
    }
    revalidatePath('/dashboard')
    revalidatePath('/bugs')
    revalidatePath(`/bugs/${id}`)

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(bug.projectId || undefined)

    return success(bug as Bug)
  } catch (err) {
    console.error('Error updating bug severity:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to update bug severity',
      'UPDATE_ERROR'
    )
  }
}

// ============================================================================
// DELETE BUG
// ============================================================================

export async function deleteBugAction(
  id: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid bug ID', 'INVALID_ID')
    }

    // Get bug for audit log
    const existingBug = await prisma.bug.findUnique({
      where: { id },
    })

    if (!existingBug) {
      return error('Bug not found', 'NOT_FOUND')
    }

    // Delete bug (this will cascade delete history)
    await prisma.bug.delete({
      where: { id },
    })

    // Log to audit
    await logAudit('bug.deleted', {}, 'bug', id, {
      bugNumber: existingBug.bugNumber,
      title: existingBug.title,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.bugs)
    revalidateTag(CACHE_TAGS.bugDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    if (existingBug.projectId) {
      revalidateTag(CACHE_TAGS.projectBugs(existingBug.projectId))
    }
    revalidatePath('/dashboard')
    revalidatePath('/bugs')

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(existingBug.projectId || undefined)

    return success({ id })
  } catch (err) {
    console.error('Error deleting bug:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to delete bug',
      'DELETE_ERROR'
    )
  }
}

// ============================================================================
// GET BUG WITH HISTORY
// ============================================================================

export async function getBugAction(
  id: string
): Promise<ActionResponse<Bug & { history?: unknown[] }>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid bug ID', 'INVALID_ID')
    }

    const bug = await prisma.bug.findUnique({
      where: { id },
      include: {
        project: true,
        assignedTo: true,
        createdBy: true,
        history: {
          orderBy: { changedAt: 'desc' },
          include: { changedBy: true },
        },
      },
    })

    if (!bug) {
      return error('Bug not found', 'NOT_FOUND')
    }

    return success(bug as Bug & { history?: unknown[] })
  } catch (err) {
    console.error('Error fetching bug:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to fetch bug',
      'FETCH_ERROR'
    )
  }
}

// ============================================================================
// LIST BUGS (with filtering)
// ============================================================================

export async function listBugsAction(options?: {
  status?: BugStatus
  severity?: BugSeverity
  projectId?: string
  assignedToId?: string
  isBlocker?: boolean
  limit?: number
}): Promise<ActionResponse<Bug[]>> {
  try {
    const bugs = await prisma.bug.findMany({
      where: {
        ...(options?.status && { status: options.status }),
        ...(options?.severity && { severity: options.severity }),
        ...(options?.projectId && { projectId: options.projectId }),
        ...(options?.assignedToId && { assignedToId: options.assignedToId }),
        ...(options?.isBlocker !== undefined && { isBlocker: options.isBlocker }),
      },
      orderBy: [
        { isBlocker: 'desc' },
        { priorityScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options?.limit || 100,
      include: {
        project: true,
        assignedTo: true,
      },
    })

    return success(bugs as Bug[])
  } catch (err) {
    console.error('Error listing bugs:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to list bugs',
      'LIST_ERROR'
    )
  }
}
