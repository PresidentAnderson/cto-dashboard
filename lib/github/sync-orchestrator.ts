/**
 * GitHub Sync Orchestrator
 *
 * Coordinates full and incremental sync of repositories, issues, PRs, and commits.
 * Handles parallel processing, progress tracking, and error recovery.
 */

import { prisma } from '../prisma';
import { GitHubClient, getGitHubClient } from './client';
import {
  normalizeRepository,
  normalizeIssue,
  normalizeMetrics,
  normalizeCommitActivity,
  normalizePRActivity,
  normalizeIssueActivity,
  deduplicateProjects,
  deduplicateBugs,
  validateProject,
  validateBug,
  filterValid,
} from './normalizer';
import type {
  SyncOptions,
  SyncResult,
  SyncProgress,
  SyncStage,
  SyncError,
  GitHubRepository,
} from './types';
import { ImportSource } from '@prisma/client';

// ============================================================================
// Sync Orchestrator Class
// ============================================================================

export class SyncOrchestrator {
  private client: GitHubClient;
  private progress: SyncProgress;
  private errors: SyncError[] = [];
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];

  constructor(client?: GitHubClient) {
    this.client = client || getGitHubClient();
    this.progress = {
      totalRepos: 0,
      processedRepos: 0,
      currentRepo: null,
      stage: 'initializing' as SyncStage,
      startTime: new Date(),
    };
  }

  // ==========================================================================
  // Progress Tracking
  // ==========================================================================

  /**
   * Update sync progress and notify listeners
   */
  private updateProgress(updates: Partial<SyncProgress>): void {
    this.progress = { ...this.progress, ...updates };

    // Calculate estimated completion
    if (this.progress.processedRepos > 0 && this.progress.totalRepos > 0) {
      const elapsed = Date.now() - this.progress.startTime.getTime();
      const avgTimePerRepo = elapsed / this.progress.processedRepos;
      const remainingRepos = this.progress.totalRepos - this.progress.processedRepos;
      const estimatedMs = remainingRepos * avgTimePerRepo;
      this.progress.estimatedCompletion = new Date(Date.now() + estimatedMs);
    }

    // Notify listeners
    this.progressCallbacks.forEach(callback => callback(this.progress));
  }

  /**
   * Subscribe to progress updates
   */
  public onProgress(callback: (progress: SyncProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Get current progress
   */
  public getProgress(): SyncProgress {
    return { ...this.progress };
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Record a sync error
   */
  private recordError(operation: string, error: Error, repo?: string): void {
    const syncError: SyncError = {
      repo,
      operation,
      error: error.message,
      timestamp: new Date(),
    };
    this.errors.push(syncError);
    console.error(`[Sync Error] ${operation}${repo ? ` (${repo})` : ''}:`, error.message);
  }

  // ==========================================================================
  // Full Sync Operations
  // ==========================================================================

  /**
   * Sync all repositories and their data
   */
  async syncAllRepos(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    this.errors = [];

    try {
      console.log(`Starting full sync for owner: ${options.owner}`);
      this.updateProgress({ stage: 'fetching_repos' as SyncStage });

      // Fetch all repositories
      const repos = await this.client.listRepos(options.owner);
      const reposToSync = options.repos
        ? repos.filter(r => options.repos!.includes(r.name))
        : repos;

      console.log(`Found ${reposToSync.length} repositories to sync`);
      this.updateProgress({
        totalRepos: reposToSync.length,
        stage: 'syncing_issues' as SyncStage,
      });

      // Sync repositories in parallel with controlled concurrency
      const concurrency = options.concurrency || 5;
      let reposSynced = 0;
      let issuesSynced = 0;
      let prsSynced = 0;
      let commitsSynced = 0;

      // Process repos in chunks
      for (let i = 0; i < reposToSync.length; i += concurrency) {
        const chunk = reposToSync.slice(i, i + concurrency);

        const results = await Promise.allSettled(
          chunk.map(async repo => {
            this.updateProgress({ currentRepo: repo.name });
            return this.syncRepo(repo, options);
          })
        );

        // Aggregate results
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            reposSynced++;
            issuesSynced += result.value.issuesSynced;
            prsSynced += result.value.prsSynced;
            commitsSynced += result.value.commitsSynced;
          } else {
            this.recordError('syncRepo', result.reason, chunk[idx].name);
          }
        });

        this.updateProgress({ processedRepos: i + chunk.length });

        // Check rate limit after each chunk
        const hasLimit = await this.client.checkRateLimit(concurrency);
        if (!hasLimit) {
          console.log('Rate limit low, waiting...');
          await this.client.waitForRateLimit();
        }
      }

      // Get final rate limit status
      const rateLimit = await this.client.getRateLimit();

      // Update completion status
      this.updateProgress({
        stage: 'completed' as SyncStage,
        currentRepo: null,
      });

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: this.errors.length === 0,
        reposSynced,
        issuesSynced,
        prsSynced,
        commitsSynced,
        errors: this.errors,
        duration,
        rateLimitRemaining: rateLimit.core.remaining,
      };

      // Log import to database
      await this.logImport(result);

      console.log(`Sync completed: ${reposSynced} repos, ${issuesSynced} issues, ${prsSynced} PRs, ${commitsSynced} commits`);
      console.log(`Duration: ${Math.round(duration / 1000)}s, Rate limit: ${rateLimit.core.remaining}/${rateLimit.core.limit}`);

      return result;

    } catch (error) {
      this.updateProgress({ stage: 'failed' as SyncStage });
      this.recordError('syncAllRepos', error as Error);
      throw error;
    }
  }

  /**
   * Sync a single repository
   */
  async syncRepo(repo: GitHubRepository | string, options: SyncOptions): Promise<{
    issuesSynced: number;
    prsSynced: number;
    commitsSynced: number;
  }> {
    try {
      // Fetch repo if only name provided
      const repoData = typeof repo === 'string'
        ? await this.client.getRepo(options.owner, repo)
        : repo;

      const repoName = repoData.name;
      console.log(`Syncing repository: ${repoName}`);

      // Normalize and save project
      const normalized = normalizeRepository(repoData);
      const { valid, invalid } = filterValid([normalized], validateProject);

      if (invalid.length > 0) {
        throw new Error(`Invalid project data for ${repoName}`);
      }

      // Upsert project
      const project = await prisma.project.upsert({
        where: { githubUrl: normalized.githubUrl },
        create: normalized,
        update: normalized,
      });

      console.log(`Project saved: ${project.name} (${project.id})`);

      // Sync issues, PRs, and commits in parallel
      const [issuesSynced, prsSynced, commitsSynced] = await Promise.all([
        this.syncIssues(options.owner, repoName, project.id, options.since),
        this.syncPRs(options.owner, repoName, project.id, options.since),
        this.syncCommits(options.owner, repoName, project.id, options.since),
      ]);

      // Sync metrics
      await this.syncMetrics(options.owner, repoName, project.id);

      return { issuesSynced, prsSynced, commitsSynced };

    } catch (error) {
      this.recordError('syncRepo', error as Error, typeof repo === 'string' ? repo : repo.name);
      throw error;
    }
  }

  /**
   * Sync issues for a repository
   */
  async syncIssues(owner: string, repoName: string, projectId: string, since?: Date): Promise<number> {
    try {
      console.log(`Syncing issues for ${repoName}...`);

      const issues = await this.client.listIssues(owner, repoName, {
        state: 'all',
        since,
      });

      if (issues.length === 0) {
        console.log(`No issues found for ${repoName}`);
        return 0;
      }

      // Normalize issues
      const normalizedIssues = issues.map(issue => normalizeIssue(issue, projectId));
      const { valid, invalid } = filterValid(normalizedIssues, validateBug);

      if (invalid.length > 0) {
        console.warn(`${invalid.length} invalid issues skipped for ${repoName}`);
      }

      // Deduplicate
      const uniqueIssues = deduplicateBugs(valid);

      // Upsert issues in transaction
      await prisma.$transaction(
        uniqueIssues.map(bug =>
          prisma.bug.upsert({
            where: { bugNumber: bug.bugNumber },
            create: bug,
            update: bug,
          })
        )
      );

      console.log(`Synced ${uniqueIssues.length} issues for ${repoName}`);
      return uniqueIssues.length;

    } catch (error) {
      this.recordError('syncIssues', error as Error, repoName);
      return 0;
    }
  }

  /**
   * Sync pull requests for a repository
   */
  async syncPRs(owner: string, repoName: string, projectId: string, since?: Date): Promise<number> {
    try {
      console.log(`Syncing PRs for ${repoName}...`);

      const prs = await this.client.listPullRequests(owner, repoName, {
        state: 'all',
        since,
      });

      if (prs.length === 0) {
        console.log(`No PRs found for ${repoName}`);
        return 0;
      }

      // Track PR activities
      // Note: We're not storing PRs as bugs, but we could track them in engineering_activity
      // For now, just log them
      console.log(`Found ${prs.length} PRs for ${repoName}`);

      // TODO: Store PR activities in engineering_activity table if needed

      return prs.length;

    } catch (error) {
      this.recordError('syncPRs', error as Error, repoName);
      return 0;
    }
  }

  /**
   * Sync commits for a repository
   */
  async syncCommits(owner: string, repoName: string, projectId: string, since?: Date): Promise<number> {
    try {
      console.log(`Syncing commits for ${repoName}...`);

      // Limit to last 100 commits for initial sync
      const commits = await this.client.listCommits(owner, repoName, {
        since,
      });

      if (commits.length === 0) {
        console.log(`No commits found for ${repoName}`);
        return 0;
      }

      console.log(`Found ${commits.length} commits for ${repoName}`);

      // TODO: Store commit activities in engineering_activity table if needed

      return commits.length;

    } catch (error) {
      this.recordError('syncCommits', error as Error, repoName);
      return 0;
    }
  }

  /**
   * Sync metrics for a repository
   */
  async syncMetrics(owner: string, repoName: string, projectId: string): Promise<void> {
    try {
      console.log(`Syncing metrics for ${repoName}...`);

      // Fetch repo data
      const repo = await this.client.getRepo(owner, repoName);

      // Fetch additional data
      const [contributors, stats] = await Promise.all([
        this.client.listContributors(owner, repoName),
        this.client.getRepoStats(owner, repoName),
      ]);

      // Get recent commits count (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentCommits = await this.client.listCommits(owner, repoName, {
        since: thirtyDaysAgo,
      });

      // Normalize metrics
      const metrics = normalizeMetrics(repo, projectId, {
        commitsCount: recentCommits.length,
        contributors,
        languages: stats.languages,
      });

      // Upsert metrics
      await prisma.projectMetric.upsert({
        where: {
          projectId_date: {
            projectId,
            date: metrics.date,
          },
        },
        create: metrics,
        update: metrics,
      });

      console.log(`Metrics synced for ${repoName}`);

    } catch (error) {
      this.recordError('syncMetrics', error as Error, repoName);
    }
  }

  // ==========================================================================
  // Incremental Sync
  // ==========================================================================

  /**
   * Perform incremental sync since last sync
   */
  async incrementalSync(options: Omit<SyncOptions, 'since'>): Promise<SyncResult> {
    // Get last sync time from database
    const lastSync = await prisma.importLog.findFirst({
      where: { source: ImportSource.github },
      orderBy: { timestamp: 'desc' },
    });

    const since = lastSync?.timestamp || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

    console.log(`Starting incremental sync since ${since.toISOString()}`);

    return this.syncAllRepos({
      ...options,
      since,
      full: false,
    });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Log import operation to database
   */
  private async logImport(result: SyncResult): Promise<void> {
    try {
      await prisma.importLog.create({
        data: {
          source: ImportSource.github,
          recordsImported: result.reposSynced + result.issuesSynced + result.prsSynced + result.commitsSynced,
          recordsFailed: result.errors.length,
          errors: result.errors.map(e => e.error),
          metadata: {
            duration: result.duration,
            reposSynced: result.reposSynced,
            issuesSynced: result.issuesSynced,
            prsSynced: result.prsSynced,
            commitsSynced: result.commitsSynced,
            rateLimitRemaining: result.rateLimitRemaining,
          },
        },
      });
    } catch (error) {
      console.error('Failed to log import:', error);
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 10) {
    return prisma.importLog.findMany({
      where: { source: ImportSource.github },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get all errors
   */
  getErrors(): SyncError[] {
    return [...this.errors];
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new sync orchestrator instance
 */
export function createSyncOrchestrator(client?: GitHubClient): SyncOrchestrator {
  return new SyncOrchestrator(client);
}

/**
 * Quick sync all repos for an owner
 */
export async function quickSyncAll(owner: string, repos?: string[]): Promise<SyncResult> {
  const orchestrator = createSyncOrchestrator();
  return orchestrator.syncAllRepos({ owner, repos });
}

/**
 * Quick incremental sync
 */
export async function quickIncrementalSync(owner: string): Promise<SyncResult> {
  const orchestrator = createSyncOrchestrator();
  return orchestrator.incrementalSync({ owner });
}
