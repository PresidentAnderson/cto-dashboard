/**
 * GitHub Integration Types
 *
 * Type definitions for GitHub API integration, sync operations,
 * and webhook handling.
 */

import { Octokit } from '@octokit/rest';
import { ProjectStatus, BugSeverity, BugStatus } from '@prisma/client';

// ============================================================================
// GitHub API Types
// ============================================================================

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  pushed_at: string;
  created_at: string;
  updated_at: string;
  size: number;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  visibility: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  user: GitHubUser;
  repository_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  html_url: string;
  user: GitHubUser;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  draft: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: GitHubUser | null;
  committer: GitHubUser | null;
  html_url: string;
  parents: Array<{ sha: string }>;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubContributor {
  login: string;
  contributions: number;
  avatar_url: string;
  html_url: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncOptions {
  owner: string;
  repos?: string[]; // If not provided, sync all repos
  full?: boolean; // Full sync or incremental
  since?: Date; // For incremental sync
  concurrency?: number; // Number of parallel requests (default: 5)
}

export interface SyncResult {
  success: boolean;
  reposSynced: number;
  issuesSynced: number;
  prsSynced: number;
  commitsSynced: number;
  errors: SyncError[];
  duration: number; // milliseconds
  rateLimitRemaining: number;
}

export interface SyncError {
  repo?: string;
  operation: string;
  error: string;
  timestamp: Date;
}

export interface SyncProgress {
  totalRepos: number;
  processedRepos: number;
  currentRepo: string | null;
  stage: SyncStage;
  startTime: Date;
  estimatedCompletion?: Date;
}

export enum SyncStage {
  INITIALIZING = 'initializing',
  FETCHING_REPOS = 'fetching_repos',
  SYNCING_ISSUES = 'syncing_issues',
  SYNCING_PRS = 'syncing_prs',
  SYNCING_COMMITS = 'syncing_commits',
  SYNCING_CONTRIBUTORS = 'syncing_contributors',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
  resource: string;
}

export interface RateLimitInfo {
  core: RateLimitStatus;
  search: RateLimitStatus;
  graphql: RateLimitStatus;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookPayload {
  action: string;
  repository?: GitHubRepository;
  sender: GitHubUser;
  installation?: {
    id: number;
  };
}

export interface IssueWebhookPayload extends WebhookPayload {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | 'labeled' | 'unlabeled' | 'assigned' | 'unassigned';
  issue: GitHubIssue;
}

export interface PullRequestWebhookPayload extends WebhookPayload {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | 'synchronize' | 'ready_for_review';
  pull_request: GitHubPullRequest;
}

export interface PushWebhookPayload extends WebhookPayload {
  ref: string;
  before: string;
  after: string;
  commits: GitHubCommit[];
  head_commit: GitHubCommit;
}

export type GitHubWebhookPayload =
  | IssueWebhookPayload
  | PullRequestWebhookPayload
  | PushWebhookPayload
  | WebhookPayload;

// ============================================================================
// Database Mapping Types
// ============================================================================

export interface NormalizedProject {
  name: string;
  description: string | null;
  githubUrl: string;
  demoUrl: string | null;
  language: string | null;
  tags: string[];
  stars: number;
  forks: number;
  lastCommit: Date | null;
  status: ProjectStatus;
}

export interface NormalizedBug {
  bugNumber: string;
  title: string;
  description: string | null;
  severity: BugSeverity;
  status: BugStatus;
  projectId?: string;
  slaHours: number;
  businessImpact: string | null;
  isBlocker: boolean;
  priorityScore: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface NormalizedMetric {
  projectId: string;
  commitsCount: number;
  contributors: number;
  linesOfCode: number;
  techStack: string[];
  healthScore: number;
  date: Date;
}

// ============================================================================
// Client Configuration Types
// ============================================================================

export interface GitHubClientConfig {
  auth: string;
  userAgent?: string;
  baseUrl?: string;
  previews?: string[];
  timeZone?: string;
  request?: {
    timeout?: number;
    retries?: number;
  };
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // number of entries
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  factor: number; // exponential backoff factor
}

// ============================================================================
// Sync Event Types (for sync_events table)
// ============================================================================

export interface SyncEvent {
  id: string;
  syncType: 'full' | 'incremental' | 'webhook';
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  reposSynced: number;
  issuesSynced: number;
  prsSynced: number;
  commitsSynced: number;
  errors: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// Engineering Activity Types
// ============================================================================

export interface EngineeringActivity {
  projectId: string;
  activityType: 'commit' | 'pr_opened' | 'pr_merged' | 'issue_closed';
  author: string;
  message: string;
  url: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isIssueWebhook(payload: GitHubWebhookPayload): payload is IssueWebhookPayload {
  return 'issue' in payload;
}

export function isPullRequestWebhook(payload: GitHubWebhookPayload): payload is PullRequestWebhookPayload {
  return 'pull_request' in payload;
}

export function isPushWebhook(payload: GitHubWebhookPayload): payload is PushWebhookPayload {
  return 'commits' in payload;
}

// ============================================================================
// Export Octokit Type
// ============================================================================

export type { Octokit };
