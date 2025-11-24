/**
 * Utility functions for Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 */

import { prisma } from '@/lib/prisma'
import type { AuditContext } from './types'

/**
 * Calculate SLA hours based on bug severity
 */
export function calculateSlaHours(severity: 'critical' | 'high' | 'medium' | 'low'): number {
  const slaMap = {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168,
  }
  return slaMap[severity]
}

/**
 * Generate unique bug number
 */
export async function generateBugNumber(): Promise<string> {
  const latestBug = await prisma.bug.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { bugNumber: true },
  })

  if (!latestBug) {
    return 'BUG-0001'
  }

  const match = latestBug.bugNumber.match(/BUG-(\d+)/)
  if (!match) {
    return 'BUG-0001'
  }

  const nextNumber = parseInt(match[1], 10) + 1
  return `BUG-${String(nextNumber).padStart(4, '0')}`
}

/**
 * Log action to audit log
 */
export async function logAudit(
  action: string,
  context: AuditContext,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: context.userId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        details: details || null,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
      },
    })
  } catch (err) {
    console.error('Failed to log audit:', err)
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Log sync event to import logs
 */
export async function logSyncEvent(
  source: 'csv' | 'github' | 'manual',
  recordsImported: number,
  recordsFailed: number,
  errors: string[],
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.importLog.create({
      data: {
        source,
        recordsImported,
        recordsFailed,
        errors,
        metadata: metadata || null,
      },
    })
  } catch (err) {
    console.error('Failed to log sync event:', err)
  }
}

/**
 * Trigger metrics recalculation for a project
 */
export async function triggerMetricsRecalculation(projectId?: string) {
  // This is a placeholder for the metrics calculation trigger
  // In a real implementation, this might queue a background job
  console.log(`Triggering metrics recalculation${projectId ? ` for project ${projectId}` : ' for all projects'}`)

  // You could implement this as:
  // 1. A background job queue (Bull, BullMQ)
  // 2. A separate API endpoint that runs async
  // 3. An immediate calculation for small datasets

  // For now, we'll just log it
  await logSyncEvent('manual', 0, 0, [], {
    action: 'metrics_recalculation_triggered',
    projectId
  })
}

/**
 * Safe decimal conversion for Prisma
 */
export function toDecimal(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  return value
}

/**
 * Convert FormData to object
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {}

  formData.forEach((value, key) => {
    // Handle arrays (multiple values with same key)
    if (obj[key]) {
      if (Array.isArray(obj[key])) {
        (obj[key] as unknown[]).push(value)
      } else {
        obj[key] = [obj[key], value]
      }
    } else {
      obj[key] = value
    }
  })

  return obj
}

/**
 * Parse tags from FormData or string
 */
export function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((t) => typeof t === 'string' && t.trim())
  }
  if (typeof tags === 'string') {
    return tags.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return []
}
