/**
 * GitHub Integration - Main Entry Point
 *
 * Exports all GitHub sync functionality for the CTO Dashboard.
 */

// Client
export {
  GitHubClient,
  createGitHubClient,
  getGitHubClient,
  resetGitHubClient,
} from './client';

// Sync Orchestrator
export {
  SyncOrchestrator,
  createSyncOrchestrator,
  quickSyncAll,
  quickIncrementalSync,
} from './sync-orchestrator';

// Data Normalizer
export {
  normalizeRepository,
  normalizeRepositories,
  normalizeIssue,
  normalizeIssues,
  normalizeMetrics,
  normalizeCommitActivity,
  normalizePRActivity,
  normalizeIssueActivity,
  deduplicateByKey,
  deduplicateBugs,
  deduplicateProjects,
  validateProject,
  validateBug,
  filterValid,
} from './normalizer';

// Webhook Handler
export {
  WebhookHandler,
  getWebhookHandler,
  resetWebhookHandler,
  createWebhookMiddleware,
  verifyWebhookSignature,
  verifyWebhookRequest,
  getEventType,
  type WebhookEventType,
} from './webhook-handler';

// Sync Status
export {
  SyncStatusTracker,
  SyncSSEManager,
  getSyncStatusTracker,
  getSyncSSEManager,
  resetSyncStatus,
  type SyncEventData,
} from './sync-status';

// Types
export type {
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubUser,
  GitHubLabel,
  GitHubContributor,
  SyncOptions,
  SyncResult,
  SyncProgress,
  SyncStage,
  SyncError,
  RateLimitInfo,
  RateLimitStatus,
  GitHubWebhookPayload,
  IssueWebhookPayload,
  PullRequestWebhookPayload,
  PushWebhookPayload,
  NormalizedProject,
  NormalizedBug,
  NormalizedMetric,
  EngineeringActivity,
  GitHubClientConfig,
  CacheConfig,
  RetryConfig,
  Octokit,
} from './types';

export {
  isIssueWebhook,
  isPullRequestWebhook,
  isPushWebhook,
} from './types';
