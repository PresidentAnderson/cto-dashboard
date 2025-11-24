/**
 * Zod Validation Schemas for Server Actions
 * CTO Dashboard v2.0 - Next.js 14
 */

import { z } from 'zod'

// ============================================================================
// PROJECT VALIDATIONS
// ============================================================================

export const projectStatusSchema = z.enum(['active', 'shipped', 'deferred', 'cancelled'])

export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters'),
  description: z.string().max(5000).optional().nullable(),
  githubUrl: z.string().url('Invalid GitHub URL').optional().nullable(),
  demoUrl: z.string().url('Invalid demo URL').optional().nullable(),
  language: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).default([]),
  stars: z.number().int().min(0).optional().nullable(),
  forks: z.number().int().min(0).optional().nullable(),
  lastCommit: z.date().optional().nullable(),
  status: projectStatusSchema.default('active'),
  complexity: z.number().int().min(1).max(10).optional().nullable(),
  clientAppeal: z.number().int().min(1).max(10).optional().nullable(),
  currentMilestone: z.number().int().min(0).default(0),
  totalMilestones: z.number().int().min(0).default(0),
  arr: z.number().positive().optional().nullable(),
  year1Revenue: z.number().optional().nullable(),
  year3Revenue: z.number().optional().nullable(),
  roiScore: z.number().optional().nullable(),
  tam: z.number().positive().optional().nullable(),
  sam: z.number().positive().optional().nullable(),
  somYear3: z.number().optional().nullable(),
  tractionMrr: z.number().optional().nullable(),
  marginPercent: z.number().min(0).max(100).optional().nullable(),
  dcfValuation: z.number().optional().nullable(),
  monthlyInfraCost: z.number().min(0).optional().nullable(),
})

export const updateProjectSchema = createProjectSchema.partial()

// ============================================================================
// BUG VALIDATIONS
// ============================================================================

export const bugSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export const bugStatusSchema = z.enum(['pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred'])

export const createBugSchema = z.object({
  title: z.string()
    .min(1, 'Bug title is required')
    .max(500, 'Bug title must be less than 500 characters'),
  description: z.string().max(10000).optional().nullable(),
  severity: bugSeveritySchema,
  status: bugStatusSchema.default('pending'),
  assignedToId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  businessImpact: z.string().max(5000).optional().nullable(),
  revenueImpact: z.number().min(0).optional().nullable(),
  isBlocker: z.boolean().default(false),
  priorityScore: z.number().int().min(0).max(100).default(50),
  estimatedHours: z.number().positive().optional().nullable(),
  createdById: z.string().uuid().optional().nullable(),
})

export const updateBugSchema = createBugSchema.partial().extend({
  actualHours: z.number().positive().optional().nullable(),
  resolvedAt: z.date().optional().nullable(),
})

// ============================================================================
// SYNC VALIDATIONS
// ============================================================================

export const syncGitHubSchema = z.object({
  projectId: z.string().uuid().optional(),
  force: z.boolean().default(false),
})

export const importCSVSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['projects', 'bugs']),
  skipErrors: z.boolean().default(false),
})

// ============================================================================
// METRICS VALIDATIONS
// ============================================================================

export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
})

export const generateMetricsSchema = z.object({
  projectId: z.string().uuid().optional(),
  dateRange: dateRangeSchema.optional(),
})

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: errors }
    }
    return { success: false, error: 'Validation failed' }
  }
}
