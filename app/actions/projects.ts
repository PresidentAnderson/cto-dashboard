/**
 * Project Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 *
 * Handles all project-related CRUD operations with:
 * - Zod validation
 * - Cache revalidation
 * - Audit logging
 * - Typed responses
 */

'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { type ActionResponse, success, error } from './types'
import {
  createProjectSchema,
  updateProjectSchema,
  projectStatusSchema,
  validateSchema,
} from './validations'
import { logAudit, triggerMetricsRecalculation, parseTags, toDecimal } from './utils'
import type { Project, ProjectStatus } from '@prisma/client'

// ============================================================================
// CACHE TAGS
// ============================================================================

const CACHE_TAGS = {
  projects: 'projects',
  projectDetail: (id: string) => `project-${id}`,
  projectMetrics: 'project-metrics',
  dashboard: 'dashboard',
} as const

// ============================================================================
// CREATE PROJECT
// ============================================================================

export async function addProjectAction(
  formData: FormData
): Promise<ActionResponse<Project>> {
  try {
    // Convert FormData to object
    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || null,
      githubUrl: formData.get('githubUrl') || null,
      demoUrl: formData.get('demoUrl') || null,
      language: formData.get('language') || null,
      tags: parseTags(formData.get('tags')),
      stars: formData.get('stars') ? Number(formData.get('stars')) : null,
      forks: formData.get('forks') ? Number(formData.get('forks')) : null,
      status: formData.get('status') || 'active',
      complexity: formData.get('complexity') ? Number(formData.get('complexity')) : null,
      clientAppeal: formData.get('clientAppeal') ? Number(formData.get('clientAppeal')) : null,
      currentMilestone: formData.get('currentMilestone') ? Number(formData.get('currentMilestone')) : 0,
      totalMilestones: formData.get('totalMilestones') ? Number(formData.get('totalMilestones')) : 0,
      arr: formData.get('arr') ? Number(formData.get('arr')) : null,
      year1Revenue: formData.get('year1Revenue') ? Number(formData.get('year1Revenue')) : null,
      year3Revenue: formData.get('year3Revenue') ? Number(formData.get('year3Revenue')) : null,
      roiScore: formData.get('roiScore') ? Number(formData.get('roiScore')) : null,
      tam: formData.get('tam') ? Number(formData.get('tam')) : null,
      sam: formData.get('sam') ? Number(formData.get('sam')) : null,
      somYear3: formData.get('somYear3') ? Number(formData.get('somYear3')) : null,
      tractionMrr: formData.get('tractionMrr') ? Number(formData.get('tractionMrr')) : null,
      marginPercent: formData.get('marginPercent') ? Number(formData.get('marginPercent')) : null,
      dcfValuation: formData.get('dcfValuation') ? Number(formData.get('dcfValuation')) : null,
      monthlyInfraCost: formData.get('monthlyInfraCost') ? Number(formData.get('monthlyInfraCost')) : null,
    }

    // Validate with Zod
    const validation = validateSchema(createProjectSchema, rawData)
    if (!validation.success) {
      return error(validation.error, 'VALIDATION_ERROR')
    }

    const data = validation.data

    // Create project
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        githubUrl: data.githubUrl,
        demoUrl: data.demoUrl,
        language: data.language,
        tags: data.tags,
        stars: data.stars,
        forks: data.forks,
        lastCommit: data.lastCommit,
        status: data.status as ProjectStatus,
        complexity: data.complexity,
        clientAppeal: data.clientAppeal,
        currentMilestone: data.currentMilestone,
        totalMilestones: data.totalMilestones,
        arr: toDecimal(data.arr),
        year1Revenue: toDecimal(data.year1Revenue),
        year3Revenue: toDecimal(data.year3Revenue),
        roiScore: toDecimal(data.roiScore),
        tam: toDecimal(data.tam),
        sam: toDecimal(data.sam),
        somYear3: toDecimal(data.somYear3),
        tractionMrr: toDecimal(data.tractionMrr),
        marginPercent: toDecimal(data.marginPercent),
        dcfValuation: toDecimal(data.dcfValuation),
        monthlyInfraCost: toDecimal(data.monthlyInfraCost),
      },
    })

    // Log to audit
    await logAudit('project.created', {}, 'project', project.id, {
      name: project.name,
      status: project.status,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.projects)
    revalidateTag(CACHE_TAGS.dashboard)
    revalidatePath('/dashboard')
    revalidatePath('/projects')

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(project.id)

    return success(project)
  } catch (err) {
    console.error('Error creating project:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to create project',
      'CREATE_ERROR'
    )
  }
}

// ============================================================================
// UPDATE PROJECT
// ============================================================================

export async function updateProjectAction(
  id: string,
  data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ActionResponse<Project>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid project ID', 'INVALID_ID')
    }

    // Validate data with Zod
    const validation = validateSchema(updateProjectSchema, data)
    if (!validation.success) {
      return error(validation.error, 'VALIDATION_ERROR')
    }

    const validatedData = validation.data

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return error('Project not found', 'NOT_FOUND')
    }

    // Update project
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...validatedData,
        arr: toDecimal(validatedData.arr),
        year1Revenue: toDecimal(validatedData.year1Revenue),
        year3Revenue: toDecimal(validatedData.year3Revenue),
        roiScore: toDecimal(validatedData.roiScore),
        tam: toDecimal(validatedData.tam),
        sam: toDecimal(validatedData.sam),
        somYear3: toDecimal(validatedData.somYear3),
        tractionMrr: toDecimal(validatedData.tractionMrr),
        marginPercent: toDecimal(validatedData.marginPercent),
        dcfValuation: toDecimal(validatedData.dcfValuation),
        monthlyInfraCost: toDecimal(validatedData.monthlyInfraCost),
      },
    })

    // Log to audit
    await logAudit('project.updated', {}, 'project', project.id, {
      changes: Object.keys(validatedData),
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.projects)
    revalidateTag(CACHE_TAGS.projectDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    revalidatePath('/dashboard')
    revalidatePath('/projects')
    revalidatePath(`/projects/${id}`)

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(project.id)

    return success(project)
  } catch (err) {
    console.error('Error updating project:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to update project',
      'UPDATE_ERROR'
    )
  }
}

// ============================================================================
// DELETE PROJECT (SOFT DELETE)
// ============================================================================

export async function deleteProjectAction(
  id: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid project ID', 'INVALID_ID')
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        bugs: { where: { status: { notIn: ['closed', 'shipped'] } } },
      },
    })

    if (!existingProject) {
      return error('Project not found', 'NOT_FOUND')
    }

    // Check for active bugs
    if (existingProject.bugs.length > 0) {
      return error(
        `Cannot delete project with ${existingProject.bugs.length} active bug(s)`,
        'HAS_ACTIVE_BUGS'
      )
    }

    // Soft delete by setting status to cancelled
    await prisma.project.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    // Log to audit
    await logAudit('project.deleted', {}, 'project', id, {
      name: existingProject.name,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.projects)
    revalidateTag(CACHE_TAGS.projectDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    revalidatePath('/dashboard')
    revalidatePath('/projects')

    // Trigger metrics recalculation
    await triggerMetricsRecalculation()

    return success({ id })
  } catch (err) {
    console.error('Error deleting project:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to delete project',
      'DELETE_ERROR'
    )
  }
}

// ============================================================================
// TOGGLE PROJECT STATUS
// ============================================================================

export async function toggleProjectStatusAction(
  id: string
): Promise<ActionResponse<Project>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid project ID', 'INVALID_ID')
    }

    // Get current project
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return error('Project not found', 'NOT_FOUND')
    }

    // Toggle logic: active <-> shipped, others stay the same
    let newStatus: ProjectStatus
    if (existingProject.status === 'active') {
      newStatus = 'shipped'
    } else if (existingProject.status === 'shipped') {
      newStatus = 'active'
    } else {
      // For deferred/cancelled, activate
      newStatus = 'active'
    }

    // Update status
    const project = await prisma.project.update({
      where: { id },
      data: { status: newStatus },
    })

    // Log to audit
    await logAudit('project.status_toggled', {}, 'project', id, {
      oldStatus: existingProject.status,
      newStatus,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.projects)
    revalidateTag(CACHE_TAGS.projectDetail(id))
    revalidateTag(CACHE_TAGS.dashboard)
    revalidatePath('/dashboard')
    revalidatePath('/projects')
    revalidatePath(`/projects/${id}`)

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(project.id)

    return success(project)
  } catch (err) {
    console.error('Error toggling project status:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to toggle project status',
      'TOGGLE_ERROR'
    )
  }
}

// ============================================================================
// GET SINGLE PROJECT (with cache)
// ============================================================================

export async function getProjectAction(
  id: string
): Promise<ActionResponse<Project>> {
  try {
    // Validate ID
    if (!id || typeof id !== 'string') {
      return error('Invalid project ID', 'INVALID_ID')
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        bugs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    })

    if (!project) {
      return error('Project not found', 'NOT_FOUND')
    }

    return success(project as Project)
  } catch (err) {
    console.error('Error fetching project:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to fetch project',
      'FETCH_ERROR'
    )
  }
}

// ============================================================================
// LIST PROJECTS (with filtering)
// ============================================================================

export async function listProjectsAction(options?: {
  status?: ProjectStatus
  language?: string
  limit?: number
}): Promise<ActionResponse<Project[]>> {
  try {
    const projects = await prisma.project.findMany({
      where: {
        ...(options?.status && { status: options.status }),
        ...(options?.language && { language: options.language }),
      },
      orderBy: [
        { status: 'asc' },
        { roiScore: 'desc' },
        { name: 'asc' },
      ],
      take: options?.limit || 100,
      include: {
        _count: {
          select: { bugs: true },
        },
      },
    })

    return success(projects as Project[])
  } catch (err) {
    console.error('Error listing projects:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to list projects',
      'LIST_ERROR'
    )
  }
}
