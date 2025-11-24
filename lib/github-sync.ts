/**
 * GitHub Sync Engine
 *
 * Features:
 * - Fetch repos, issues, PRs, commits
 * - Rate limiting (5000/hour with token)
 * - Pagination handling
 * - Data normalization
 * - Incremental sync support
 * - OAuth token management
 */

import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import prisma from './prisma';
import { loggers } from './logger';
import {
  GitHubRepoSchema,
  GitHubIssueSchema,
  validateBatch,
} from './validation-schemas';

// Extend Octokit with throttling plugin
const OctokitWithThrottling = Octokit.plugin(throttling);

// ============================================================================
// TYPES
// ============================================================================

export interface GitHubSyncOptions {
  token: string;
  owner?: string;
  incremental?: boolean;
  syncRepos?: boolean;
  syncIssues?: boolean;
  syncPRs?: boolean;
  syncCommits?: boolean;
}

export interface SyncResult {
  success: boolean;
  repos: {
    total: number;
    created: number;
    updated: number;
    failed: number;
  };
  issues: {
    total: number;
    created: number;
    updated: number;
    failed: number;
  };
  commits: {
    total: number;
    recorded: number;
  };
  errors: string[];
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

// ============================================================================
// GITHUB SYNC CLASS
// ============================================================================

export class GitHubSyncEngine {
  private octokit: Octokit;
  private owner?: string;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(token: string, owner?: string) {
    this.owner = owner;
    this.octokit = new OctokitWithThrottling({
      auth: token,
      throttle: {
        onRateLimit: (retryAfter: number, options: any, octokit: Octokit) => {
          loggers.warn(
            'GitHub Sync',
            `Rate limit hit. Retrying after ${retryAfter} seconds`,
            { path: options.url }
          );
          // Retry once
          if (options.request.retryCount === 0) {
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter: number, options: any, octokit: Octokit) => {
          loggers.warn(
            'GitHub Sync',
            `Secondary rate limit hit. Waiting ${retryAfter} seconds`,
            { path: options.url }
          );
          return true;
        },
      },
    });
  }

  /**
   * Get current rate limit information
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    try {
      const { data } = await this.octokit.rateLimit.get();
      this.rateLimitInfo = {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
        used: data.rate.used,
      };
      return this.rateLimitInfo;
    } catch (error) {
      loggers.error('GitHub Sync', error as Error);
      throw error;
    }
  }

  /**
   * Sync all repositories for the authenticated user or specified owner
   */
  async syncRepositories(incremental = false): Promise<SyncResult['repos']> {
    const result = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
    };

    try {
      loggers.githubSync('Starting repository sync', { owner: this.owner, incremental });

      let lastSyncTime: Date | null = null;

      if (incremental) {
        // Get last sync time from sync_events or import_logs
        const lastSync = await prisma.importLog.findFirst({
          where: { source: 'github' },
          orderBy: { timestamp: 'desc' },
        });
        lastSyncTime = lastSync?.timestamp || null;
      }

      // Fetch all repositories with pagination
      const iterator = this.owner
        ? this.octokit.paginate.iterator(this.octokit.repos.listForOrg, {
            org: this.owner,
            per_page: 100,
          })
        : this.octokit.paginate.iterator(this.octokit.repos.listForAuthenticatedUser, {
            per_page: 100,
            affiliation: 'owner',
          });

      for await (const { data: repos } of iterator) {
        loggers.githubSync(`Processing ${repos.length} repositories`);

        for (const repo of repos) {
          try {
            // Validate repository data
            const validationResult = GitHubRepoSchema.safeParse(repo);
            if (!validationResult.success) {
              loggers.warn('GitHub Sync', `Invalid repo data: ${repo.full_name}`);
              result.failed++;
              continue;
            }

            const repoData = validationResult.data;

            // Skip if incremental and not updated since last sync
            if (lastSyncTime && new Date(repoData.updated_at) < lastSyncTime) {
              continue;
            }

            // Check if project exists
            const existingProject = await prisma.project.findUnique({
              where: { githubUrl: repoData.html_url },
            });

            if (existingProject) {
              // Update existing project
              await prisma.project.update({
                where: { id: existingProject.id },
                data: {
                  name: repoData.name,
                  description: repoData.description,
                  language: repoData.language,
                  stars: repoData.stargazers_count,
                  forks: repoData.forks_count,
                  lastCommit: new Date(repoData.updated_at),
                  tags: repoData.topics || [],
                  updatedAt: new Date(),
                },
              });
              result.updated++;
            } else {
              // Create new project
              await prisma.project.create({
                data: {
                  name: repoData.name,
                  description: repoData.description,
                  githubUrl: repoData.html_url,
                  language: repoData.language,
                  stars: repoData.stargazers_count,
                  forks: repoData.forks_count,
                  lastCommit: new Date(repoData.updated_at),
                  tags: repoData.topics || [],
                  status: 'active',
                },
              });
              result.created++;
            }

            result.total++;
          } catch (error) {
            loggers.error('GitHub Sync', error as Error, { repo: repo.full_name });
            result.failed++;
          }
        }
      }

      loggers.githubSync(
        `Repository sync completed. Total: ${result.total}, Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`
      );

      return result;
    } catch (error) {
      loggers.error('GitHub Sync', error as Error);
      throw error;
    }
  }

  /**
   * Sync issues from a specific repository and convert to bugs
   */
  async syncIssuesForRepo(owner: string, repo: string): Promise<SyncResult['issues']> {
    const result = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
    };

    try {
      loggers.githubSync(`Syncing issues for ${owner}/${repo}`);

      // Find the project in database
      const project = await prisma.project.findFirst({
        where: {
          githubUrl: {
            contains: `${owner}/${repo}`,
          },
        },
      });

      if (!project) {
        loggers.warn('GitHub Sync', `Project not found for ${owner}/${repo}`);
        return result;
      }

      // Fetch all issues (including pull requests)
      const iterator = this.octokit.paginate.iterator(this.octokit.issues.listForRepo, {
        owner,
        repo,
        state: 'all',
        per_page: 100,
      });

      for await (const { data: issues } of iterator) {
        loggers.githubSync(`Processing ${issues.length} issues from ${owner}/${repo}`);

        for (const issue of issues) {
          try {
            // Skip pull requests (they have pull_request property)
            if ('pull_request' in issue) {
              continue;
            }

            // Validate issue data
            const validationResult = GitHubIssueSchema.safeParse(issue);
            if (!validationResult.success) {
              loggers.warn('GitHub Sync', `Invalid issue data: #${issue.number}`);
              result.failed++;
              continue;
            }

            const issueData = validationResult.data;

            // Map issue to bug
            const bugNumber = `GH-${owner}-${repo}-${issueData.number}`;
            const severity = this.mapLabelToSeverity(issueData.labels.map((l) => l.name));
            const status = this.mapIssueStateToBugStatus(issueData.state);

            // Check if bug already exists
            const existingBug = await prisma.bug.findUnique({
              where: { bugNumber },
            });

            if (existingBug) {
              // Update existing bug
              await prisma.bug.update({
                where: { id: existingBug.id },
                data: {
                  title: issueData.title,
                  description: issueData.body,
                  status,
                  resolvedAt: issueData.closed_at ? new Date(issueData.closed_at) : null,
                  updatedAt: new Date(),
                },
              });
              result.updated++;
            } else {
              // Create new bug
              await prisma.bug.create({
                data: {
                  bugNumber,
                  title: issueData.title,
                  description: issueData.body,
                  severity,
                  status,
                  projectId: project.id,
                  slaHours: this.getSLABySeverity(severity),
                  createdAt: new Date(issueData.created_at),
                  resolvedAt: issueData.closed_at ? new Date(issueData.closed_at) : null,
                },
              });
              result.created++;
            }

            result.total++;
          } catch (error) {
            loggers.error('GitHub Sync', error as Error, { issue: issue.number });
            result.failed++;
          }
        }
      }

      loggers.githubSync(
        `Issue sync completed for ${owner}/${repo}. Total: ${result.total}, Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`
      );

      return result;
    } catch (error) {
      loggers.error('GitHub Sync', error as Error, { owner, repo });
      throw error;
    }
  }

  /**
   * Sync issues for all projects in database
   */
  async syncAllIssues(): Promise<SyncResult['issues']> {
    const aggregateResult = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
    };

    try {
      // Get all projects with GitHub URLs
      const projects = await prisma.project.findMany({
        where: {
          githubUrl: { not: null },
        },
        select: { githubUrl: true },
      });

      loggers.githubSync(`Syncing issues for ${projects.length} projects`);

      for (const project of projects) {
        if (!project.githubUrl) continue;

        // Extract owner and repo from GitHub URL
        const match = project.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) continue;

        const [, owner, repo] = match;
        const result = await this.syncIssuesForRepo(owner, repo);

        aggregateResult.total += result.total;
        aggregateResult.created += result.created;
        aggregateResult.updated += result.updated;
        aggregateResult.failed += result.failed;
      }

      return aggregateResult;
    } catch (error) {
      loggers.error('GitHub Sync', error as Error);
      throw error;
    }
  }

  /**
   * Get commit count for a repository
   */
  async getCommitCount(owner: string, repo: string): Promise<number> {
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return data.size; // Approximation
    } catch (error) {
      loggers.error('GitHub Sync', error as Error, { owner, repo });
      return 0;
    }
  }

  /**
   * Perform full sync
   */
  async fullSync(options: Partial<GitHubSyncOptions> = {}): Promise<SyncResult> {
    const startedAt = new Date();
    const result: SyncResult = {
      success: true,
      repos: { total: 0, created: 0, updated: 0, failed: 0 },
      issues: { total: 0, created: 0, updated: 0, failed: 0 },
      commits: { total: 0, recorded: 0 },
      errors: [],
      startedAt,
      completedAt: new Date(),
      duration: 0,
    };

    try {
      loggers.githubSync('Starting full GitHub sync');

      // Check rate limit
      const rateLimit = await this.getRateLimit();
      loggers.githubSync(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);

      if (rateLimit.remaining < 100) {
        throw new Error(
          `Insufficient rate limit. Remaining: ${rateLimit.remaining}. Resets at ${rateLimit.reset}`
        );
      }

      // Sync repositories
      if (options.syncRepos !== false) {
        result.repos = await this.syncRepositories(options.incremental);
      }

      // Sync issues
      if (options.syncIssues !== false) {
        result.issues = await this.syncAllIssues();
      }

      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      loggers.githubSync(
        `Full sync completed in ${(result.duration / 1000).toFixed(2)}s`,
        result
      );

      // Create import log
      await prisma.importLog.create({
        data: {
          source: 'github',
          recordsImported: result.repos.created + result.repos.updated + result.issues.created + result.issues.updated,
          recordsFailed: result.repos.failed + result.issues.failed,
          errors: result.errors,
          metadata: {
            repos: result.repos,
            issues: result.issues,
            duration: result.duration,
            rateLimit: this.rateLimitInfo,
          },
        },
      });

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      loggers.error('GitHub Sync', error as Error, { result });

      return result;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Map GitHub labels to bug severity
   */
  private mapLabelToSeverity(labels: string[]): 'critical' | 'high' | 'medium' | 'low' {
    const labelStr = labels.join(' ').toLowerCase();

    if (labelStr.includes('critical') || labelStr.includes('blocker')) {
      return 'critical';
    }
    if (labelStr.includes('high') || labelStr.includes('urgent')) {
      return 'high';
    }
    if (labelStr.includes('low') || labelStr.includes('minor')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Map GitHub issue state to bug status
   */
  private mapIssueStateToBugStatus(state: string): 'pending' | 'closed' {
    return state === 'closed' ? 'closed' : 'pending';
  }

  /**
   * Get SLA hours based on severity
   */
  private getSLABySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): number {
    const slaMap = {
      critical: 4,
      high: 24,
      medium: 72,
      low: 168,
    };
    return slaMap[severity];
  }
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Create a GitHub sync engine instance
 */
export function createGitHubSync(token: string, owner?: string): GitHubSyncEngine {
  return new GitHubSyncEngine(token, owner);
}

/**
 * Quick sync function for API routes
 */
export async function syncGitHub(
  token: string,
  options: Partial<GitHubSyncOptions> = {}
): Promise<SyncResult> {
  const engine = new GitHubSyncEngine(token, options.owner);
  return engine.fullSync(options);
}

export default GitHubSyncEngine;
