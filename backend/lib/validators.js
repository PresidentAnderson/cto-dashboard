/**
 * Request Validators using Joi
 * CTO Dashboard v2.0
 */

const Joi = require('joi');

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0)
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const slugParamSchema = Joi.object({
  slug: Joi.string().min(1).max(100).required()
});

// ============================================================================
// PROJECTS VALIDATORS
// ============================================================================

const listProjectsSchema = Joi.object({
  status: Joi.string().valid('active', 'shipped', 'deferred', 'cancelled'),
  language: Joi.string().max(100),
  complexity_min: Joi.number().integer().min(1).max(10),
  complexity_max: Joi.number().integer().min(1).max(10),
  client_appeal_min: Joi.number().integer().min(1).max(10),
  client_appeal_max: Joi.number().integer().min(1).max(10),
  has_github: Joi.boolean(),
  search: Joi.string().max(255),
  sort_by: Joi.string().valid('name', 'roi_score', 'complexity', 'client_appeal', 'created_at', 'updated_at').default('roi_score'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(5000).allow(null, ''),
  github_url: Joi.string().uri().allow(null, ''),
  demo_url: Joi.string().uri().allow(null, ''),
  language: Joi.string().max(100).allow(null, ''),
  tags: Joi.array().items(Joi.string().max(50)),
  status: Joi.string().valid('active', 'shipped', 'deferred', 'cancelled').default('active'),
  complexity: Joi.number().integer().min(1).max(10),
  client_appeal: Joi.number().integer().min(1).max(10),
  current_milestone: Joi.number().integer().min(0).default(0),
  total_milestones: Joi.number().integer().min(0).default(0),
  arr: Joi.number().positive().allow(null),
  year1_revenue: Joi.number().positive().allow(null),
  year3_revenue: Joi.number().positive().allow(null),
  monthly_infra_cost: Joi.number().positive().allow(null)
});

const updateProjectSchema = createProjectSchema.fork(
  ['name'],
  (schema) => schema.optional()
);

// ============================================================================
// BUGS VALIDATORS
// ============================================================================

const listBugsSchema = Joi.object({
  severity: Joi.string().valid('critical', 'high', 'medium', 'low'),
  status: Joi.string().valid('pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred'),
  is_blocker: Joi.boolean(),
  assigned_to: Joi.string().uuid(),
  project_id: Joi.string().uuid(),
  sla_breached: Joi.boolean(),
  search: Joi.string().max(255),
  sort_by: Joi.string().valid('priority_score', 'created_at', 'severity', 'sla_hours').default('priority_score'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const createBugSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  description: Joi.string().max(10000).allow(null, ''),
  severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
  status: Joi.string().valid('pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred').default('pending'),
  assigned_to: Joi.string().uuid().allow(null),
  project_id: Joi.string().uuid().allow(null),
  business_impact: Joi.string().max(1000).allow(null, ''),
  revenue_impact_daily: Joi.number().allow(null),
  is_blocker: Joi.boolean().default(false),
  estimated_hours: Joi.number().positive().allow(null),
  created_by: Joi.string().uuid().allow(null)
});

const updateBugSchema = createBugSchema.fork(
  ['title', 'severity'],
  (schema) => schema.optional()
).keys({
  actual_hours: Joi.number().positive().allow(null),
  resolved_at: Joi.date().iso().allow(null)
});

// ============================================================================
// ANALYTICS VALIDATORS
// ============================================================================

const analyticsDateRangeSchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  granularity: Joi.string().valid('day', 'week', 'month').default('day')
});

const trendAnalysisSchema = Joi.object({
  metric: Joi.string().valid('bugs', 'revenue_impact', 'resolution_time', 'eng_hours').required(),
  period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  group_by: Joi.string().valid('day', 'week', 'month').default('day')
});

// ============================================================================
// CSV IMPORT VALIDATORS
// ============================================================================

const csvImportSchema = Joi.object({
  type: Joi.string().valid('projects', 'bugs').required(),
  overwrite: Joi.boolean().default(false),
  validate_only: Joi.boolean().default(false)
});

// ============================================================================
// GITHUB SYNC VALIDATORS
// ============================================================================

const githubSyncSchema = Joi.object({
  repository: Joi.string().pattern(/^[\w-]+\/[\w-]+$/).allow(null), // owner/repo format
  full_sync: Joi.boolean().default(false),
  force: Joi.boolean().default(false)
});

const syncStatusSchema = Joi.object({
  sync_id: Joi.string().uuid()
});

// ============================================================================
// METRICS VALIDATORS
// ============================================================================

const metricsRebuildSchema = Joi.object({
  metric_type: Joi.string().valid('monthly', 'portfolio', 'project', 'all').default('all'),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  force: Joi.boolean().default(false)
});

const dailyMetricsSchema = Joi.object({
  date: Joi.date().iso(),
  days: Joi.number().integer().min(1).max(90).default(30)
});

// ============================================================================
// WEBHOOKS VALIDATORS
// ============================================================================

const githubWebhookSchema = Joi.object({
  action: Joi.string().required(),
  repository: Joi.object({
    id: Joi.number().required(),
    name: Joi.string().required(),
    full_name: Joi.string().required(),
    html_url: Joi.string().uri().required()
  }).required(),
  sender: Joi.object({
    login: Joi.string().required(),
    id: Joi.number().required()
  }).required(),
  issue: Joi.object().optional(),
  pull_request: Joi.object().optional(),
  push: Joi.object().optional()
}).unknown(true); // Allow additional webhook fields

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Common
  paginationSchema,
  idParamSchema,
  slugParamSchema,

  // Projects
  listProjectsSchema,
  createProjectSchema,
  updateProjectSchema,

  // Bugs
  listBugsSchema,
  createBugSchema,
  updateBugSchema,

  // Analytics
  analyticsDateRangeSchema,
  trendAnalysisSchema,

  // CSV Import
  csvImportSchema,

  // GitHub Sync
  githubSyncSchema,
  syncStatusSchema,

  // Metrics
  metricsRebuildSchema,
  dailyMetricsSchema,

  // Webhooks
  githubWebhookSchema
};
