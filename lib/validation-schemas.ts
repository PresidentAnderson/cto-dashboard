/**
 * Validation Schemas using Zod
 *
 * Centralized validation for CSV imports, manual entries,
 * and GitHub sync data.
 */

import { z } from 'zod';

// ============================================================================
// PROJECT VALIDATION
// ============================================================================

export const ProjectCSVSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  demoUrl: z.string().url().optional().nullable(),
  language: z.string().max(100).optional().nullable(),
  tags: z.union([
    z.array(z.string()),
    z.string().transform((val) => val.split(',').map((t) => t.trim())),
  ]).optional(),
  stars: z.coerce.number().int().min(0).optional().nullable(),
  forks: z.coerce.number().int().min(0).optional().nullable(),
  lastCommit: z.coerce.date().optional().nullable(),
  status: z.enum(['active', 'shipped', 'deferred', 'cancelled']).default('active'),
  complexity: z.coerce.number().int().min(1).max(10).optional().nullable(),
  clientAppeal: z.coerce.number().int().min(1).max(10).optional().nullable(),
  currentMilestone: z.coerce.number().int().min(0).default(0),
  totalMilestones: z.coerce.number().int().min(0).default(0),
  arr: z.coerce.number().optional().nullable(),
  year1Revenue: z.coerce.number().optional().nullable(),
  year3Revenue: z.coerce.number().optional().nullable(),
  roiScore: z.coerce.number().optional().nullable(),
  tam: z.coerce.number().optional().nullable(),
  sam: z.coerce.number().optional().nullable(),
  somYear3: z.coerce.number().optional().nullable(),
  tractionMrr: z.coerce.number().optional().nullable(),
  marginPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  dcfValuation: z.coerce.number().optional().nullable(),
  monthlyInfraCost: z.coerce.number().min(0).optional().nullable(),
});

export type ProjectCSVInput = z.infer<typeof ProjectCSVSchema>;

// ============================================================================
// BUG VALIDATION
// ============================================================================

export const BugCSVSchema = z.object({
  bugNumber: z.string().min(1).max(20),
  title: z.string().min(1, 'Bug title is required').max(500),
  description: z.string().optional().nullable(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred']).default('pending'),
  assignedTo: z.string().email().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  projectName: z.string().optional().nullable(), // For lookup if projectId not provided
  slaHours: z.coerce.number().int().min(1),
  businessImpact: z.string().optional().nullable(),
  revenueImpact: z.coerce.number().min(0).optional().nullable(),
  isBlocker: z.coerce.boolean().default(false),
  priorityScore: z.coerce.number().int().min(0).max(100).default(50),
  estimatedHours: z.coerce.number().min(0).optional().nullable(),
  actualHours: z.coerce.number().min(0).optional().nullable(),
  createdAt: z.coerce.date().optional(),
  resolvedAt: z.coerce.date().optional().nullable(),
});

export type BugCSVInput = z.infer<typeof BugCSVSchema>;

// ============================================================================
// MANUAL ENTRY VALIDATION
// ============================================================================

export const ManualBugEntrySchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional().nullable(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred']).default('pending'),
  assignedToId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  slaHours: z.number().int().min(1),
  businessImpact: z.string().optional().nullable(),
  revenueImpact: z.number().min(0).optional().nullable(),
  isBlocker: z.boolean().default(false),
  priorityScore: z.number().int().min(0).max(100).default(50),
  estimatedHours: z.number().min(0).optional().nullable(),
});

export type ManualBugEntry = z.infer<typeof ManualBugEntrySchema>;

export const ManualProjectEntrySchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  demoUrl: z.string().url().optional().nullable(),
  language: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'shipped', 'deferred', 'cancelled']).default('active'),
  complexity: z.number().int().min(1).max(10).optional().nullable(),
  clientAppeal: z.number().int().min(1).max(10).optional().nullable(),
  totalMilestones: z.number().int().min(0).default(0),
});

export type ManualProjectEntry = z.infer<typeof ManualProjectEntrySchema>;

export const ManualEngineeringHoursSchema = z.object({
  bugId: z.string().uuid(),
  hours: z.number().min(0.1).max(1000),
  notes: z.string().optional().nullable(),
});

export type ManualEngineeringHours = z.infer<typeof ManualEngineeringHoursSchema>;

// ============================================================================
// GITHUB SYNC VALIDATION
// ============================================================================

export const GitHubRepoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string().url(),
  language: z.string().nullable(),
  stargazers_count: z.number().int(),
  forks_count: z.number().int(),
  updated_at: z.string(),
  topics: z.array(z.string()).optional(),
});

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

export const GitHubIssueSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  labels: z.array(z.object({
    name: z.string(),
  })),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  assignee: z.object({
    login: z.string(),
    email: z.string().nullable().optional(),
  }).nullable(),
});

export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

// ============================================================================
// PIPELINE JOB VALIDATION
// ============================================================================

export const PipelineJobSchema = z.object({
  jobId: z.string().uuid(),
  type: z.enum(['csv_import', 'github_sync', 'manual_entry']),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  source: z.enum(['csv', 'github', 'manual']),
  metadata: z.record(z.any()).optional(),
  recordsProcessed: z.number().int().min(0).default(0),
  recordsFailed: z.number().int().min(0).default(0),
  errors: z.array(z.string()).default([]),
  startedAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
});

export type PipelineJob = z.infer<typeof PipelineJobSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates and parses CSV data in batches
 */
export function validateBatch<T>(
  data: unknown[],
  schema: z.ZodSchema<T>
): { valid: T[]; invalid: Array<{ row: unknown; errors: string[] }> } {
  const valid: T[] = [];
  const invalid: Array<{ row: unknown; errors: string[] }> = [];

  for (const row of data) {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        row,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
    }
  }

  return { valid, invalid };
}

/**
 * Creates a human-readable error message from Zod validation errors
 */
export function formatValidationErrors(error: z.ZodError): string {
  return error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
}
