/**
 * Sync Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 *
 * Handles synchronization operations:
 * - GitHub repository sync
 * - CSV import processing
 * - Sync status tracking
 * - Import logging
 */

'use server'

import { revalidateTag, revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { type ActionResponse, success, error } from './types'
import { validateSchema, syncGitHubSchema, importCSVSchema } from './validations'
import { logAudit, logSyncEvent, triggerMetricsRecalculation } from './utils'

// ============================================================================
// TYPES
// ============================================================================

type SyncStatus = {
  isRunning: boolean
  lastSync?: Date
  status?: 'idle' | 'syncing' | 'error'
  message?: string
  progress?: {
    current: number
    total: number
  }
}

type ImportResult = {
  recordsImported: number
  recordsFailed: number
  errors: string[]
  details?: Record<string, unknown>
}

// ============================================================================
// CACHE TAGS
// ============================================================================

const CACHE_TAGS = {
  projects: 'projects',
  bugs: 'bugs',
  sync: 'sync',
  dashboard: 'dashboard',
} as const

// ============================================================================
// GITHUB SYNC
// ============================================================================

export async function syncGitHubNowAction(
  projectId?: string
): Promise<ActionResponse<ImportResult>> {
  try {
    // Validate input
    const validation = validateSchema(syncGitHubSchema, { projectId })
    if (!validation.success) {
      return error(validation.error, 'VALIDATION_ERROR')
    }

    const startTime = Date.now()
    let recordsImported = 0
    let recordsFailed = 0
    const errors: string[] = []

    // If projectId is provided, sync single project
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        return error('Project not found', 'PROJECT_NOT_FOUND')
      }

      if (!project.githubUrl) {
        return error('Project does not have a GitHub URL', 'NO_GITHUB_URL')
      }

      try {
        // Sync single project from GitHub
        const result = await syncSingleProject(project)
        if (result.success) {
          recordsImported++
        } else {
          recordsFailed++
          errors.push(`${project.name}: ${result.error}`)
        }
      } catch (err) {
        recordsFailed++
        errors.push(`${project.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    } else {
      // Sync all projects with GitHub URLs
      const projects = await prisma.project.findMany({
        where: {
          githubUrl: { not: null },
          status: { in: ['active', 'shipped'] },
        },
      })

      for (const project of projects) {
        try {
          const result = await syncSingleProject(project)
          if (result.success) {
            recordsImported++
          } else {
            recordsFailed++
            errors.push(`${project.name}: ${result.error}`)
          }
        } catch (err) {
          recordsFailed++
          errors.push(`${project.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    }

    const duration = Date.now() - startTime

    // Log sync event
    await logSyncEvent('github', recordsImported, recordsFailed, errors, {
      duration,
      projectId: projectId || 'all',
    })

    // Log to audit
    await logAudit('sync.github', {}, 'sync', projectId || 'all', {
      recordsImported,
      recordsFailed,
      duration,
    })

    // Revalidate cache
    revalidateTag(CACHE_TAGS.projects)
    revalidateTag(CACHE_TAGS.sync)
    revalidateTag(CACHE_TAGS.dashboard)
    revalidatePath('/dashboard')
    revalidatePath('/projects')

    // Trigger metrics recalculation
    await triggerMetricsRecalculation(projectId)

    return success({
      recordsImported,
      recordsFailed,
      errors,
      details: {
        duration,
        totalProjects: recordsImported + recordsFailed,
      },
    })
  } catch (err) {
    console.error('Error syncing GitHub:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to sync GitHub',
      'SYNC_ERROR'
    )
  }
}

/**
 * Sync a single project from GitHub
 * This is a placeholder - implement actual GitHub API integration
 */
async function syncSingleProject(project: {
  id: string
  name: string
  githubUrl: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!project.githubUrl) {
      return { success: false, error: 'No GitHub URL' }
    }

    // Parse GitHub URL to extract owner and repo
    const urlMatch = project.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!urlMatch) {
      return { success: false, error: 'Invalid GitHub URL format' }
    }

    const [, owner, repo] = urlMatch
    const repoName = repo.replace('.git', '')

    // TODO: Implement actual GitHub API integration
    // For now, this is a placeholder that simulates a sync

    // Example implementation:
    // 1. Fetch repository data from GitHub API
    // const repoData = await fetch(`https://api.github.com/repos/${owner}/${repoName}`)
    // 2. Update project with latest data
    // 3. Fetch recent commits
    // 4. Update lastCommit timestamp
    // 5. Update stars, forks, etc.

    await prisma.project.update({
      where: { id: project.id },
      data: {
        lastCommit: new Date(),
        // Update other fields from GitHub API response
      },
    })

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// CSV IMPORT
// ============================================================================

export async function importCSVAction(
  formData: FormData
): Promise<ActionResponse<ImportResult>> {
  try {
    const file = formData.get('file') as File | null
    const type = formData.get('type') as 'projects' | 'bugs'
    const skipErrors = formData.get('skipErrors') === 'true'

    if (!file) {
      return error('No file provided', 'NO_FILE')
    }

    if (!type || !['projects', 'bugs'].includes(type)) {
      return error('Invalid import type', 'INVALID_TYPE')
    }

    const startTime = Date.now()
    let recordsImported = 0
    let recordsFailed = 0
    const errors: string[] = []

    // Read CSV file
    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length === 0) {
      return error('CSV file is empty', 'EMPTY_FILE')
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map((h) => h.trim())

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = parseCSVLine(line)

      if (values.length !== headers.length) {
        const errorMsg = `Line ${i + 1}: Column count mismatch`
        errors.push(errorMsg)
        recordsFailed++
        if (!skipErrors) break
        continue
      }

      // Create object from headers and values
      const record = headers.reduce((obj, header, index) => {
        obj[header] = values[index]
        return obj
      }, {} as Record<string, string>)

      try {
        if (type === 'projects') {
          await importProjectRecord(record)
        } else if (type === 'bugs') {
          await importBugRecord(record)
        }
        recordsImported++
      } catch (err) {
        const errorMsg = `Line ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`
        errors.push(errorMsg)
        recordsFailed++
        if (!skipErrors) break
      }
    }

    const duration = Date.now() - startTime

    // Log import event
    await logSyncEvent('csv', recordsImported, recordsFailed, errors, {
      duration,
      type,
      filename: file.name,
      fileSize: file.size,
    })

    // Log to audit
    await logAudit('import.csv', {}, 'import', type, {
      recordsImported,
      recordsFailed,
      filename: file.name,
      duration,
    })

    // Revalidate cache
    if (type === 'projects') {
      revalidateTag(CACHE_TAGS.projects)
    } else {
      revalidateTag(CACHE_TAGS.bugs)
    }
    revalidateTag(CACHE_TAGS.dashboard)
    revalidatePath('/dashboard')
    revalidatePath(`/${type}`)

    // Trigger metrics recalculation
    await triggerMetricsRecalculation()

    return success({
      recordsImported,
      recordsFailed,
      errors,
      details: {
        duration,
        totalRecords: recordsImported + recordsFailed,
        filename: file.name,
      },
    })
  } catch (err) {
    console.error('Error importing CSV:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to import CSV',
      'IMPORT_ERROR'
    )
  }
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

/**
 * Import a single project record from CSV
 */
async function importProjectRecord(record: Record<string, string>): Promise<void> {
  const data = {
    name: record.name || record.Name,
    description: record.description || record.Description || null,
    githubUrl: record.githubUrl || record['GitHub URL'] || null,
    demoUrl: record.demoUrl || record['Demo URL'] || null,
    language: record.language || record.Language || null,
    tags: record.tags ? record.tags.split(';').map((t) => t.trim()) : [],
    stars: record.stars ? parseInt(record.stars, 10) : null,
    forks: record.forks ? parseInt(record.forks, 10) : null,
    status: (record.status || record.Status || 'active') as 'active' | 'shipped' | 'deferred' | 'cancelled',
    complexity: record.complexity ? parseInt(record.complexity, 10) : null,
    clientAppeal: record.clientAppeal || record['Client Appeal'] ? parseInt(record.clientAppeal || record['Client Appeal'], 10) : null,
  }

  // Check if project already exists by name or GitHub URL
  const existing = await prisma.project.findFirst({
    where: {
      OR: [
        { name: data.name },
        ...(data.githubUrl ? [{ githubUrl: data.githubUrl }] : []),
      ],
    },
  })

  if (existing) {
    // Update existing project
    await prisma.project.update({
      where: { id: existing.id },
      data,
    })
  } else {
    // Create new project
    await prisma.project.create({
      data,
    })
  }
}

/**
 * Import a single bug record from CSV
 */
async function importBugRecord(record: Record<string, string>): Promise<void> {
  const data = {
    title: record.title || record.Title,
    description: record.description || record.Description || null,
    severity: (record.severity || record.Severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
    status: (record.status || record.Status || 'pending') as 'pending' | 'in_progress' | 'verified' | 'shipped' | 'closed' | 'deferred',
    businessImpact: record.businessImpact || record['Business Impact'] || null,
    isBlocker: record.isBlocker === 'true' || record['Is Blocker'] === 'true',
    priorityScore: record.priorityScore ? parseInt(record.priorityScore, 10) : 50,
  }

  // Calculate SLA hours
  const slaHours = {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168,
  }[data.severity]

  // Generate bug number
  const latestBug = await prisma.bug.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { bugNumber: true },
  })

  let nextNumber = 1
  if (latestBug) {
    const match = latestBug.bugNumber.match(/BUG-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  const bugNumber = `BUG-${String(nextNumber).padStart(4, '0')}`

  // Create bug
  await prisma.bug.create({
    data: {
      ...data,
      bugNumber,
      slaHours,
    },
  })
}

// ============================================================================
// GET SYNC STATUS
// ============================================================================

export async function getSyncStatusAction(): Promise<ActionResponse<SyncStatus>> {
  try {
    // Get the most recent import log
    const lastImport = await prisma.importLog.findFirst({
      orderBy: { timestamp: 'desc' },
    })

    // In a real implementation, you would check if a sync is currently running
    // This could be stored in Redis, a database flag, or checked via a job queue

    const status: SyncStatus = {
      isRunning: false,
      lastSync: lastImport?.timestamp,
      status: 'idle',
      message: lastImport
        ? `Last sync: ${lastImport.recordsImported} imported, ${lastImport.recordsFailed} failed`
        : 'No syncs yet',
    }

    return success(status)
  } catch (err) {
    console.error('Error getting sync status:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to get sync status',
      'STATUS_ERROR'
    )
  }
}

// ============================================================================
// GET IMPORT HISTORY
// ============================================================================

export async function getImportHistoryAction(
  limit = 20
): Promise<ActionResponse<Array<{
  id: string
  source: string
  recordsImported: number
  recordsFailed: number
  errors: string[]
  timestamp: Date
}>>> {
  try {
    const logs = await prisma.importLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        source: true,
        recordsImported: true,
        recordsFailed: true,
        errors: true,
        timestamp: true,
      },
    })

    return success(logs)
  } catch (err) {
    console.error('Error getting import history:', err)
    return error(
      err instanceof Error ? err.message : 'Failed to get import history',
      'HISTORY_ERROR'
    )
  }
}
