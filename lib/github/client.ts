/**
 * GitHub API Client
 *
 * Octokit wrapper with authentication, rate limiting, retry logic,
 * and request caching for the CTO Dashboard.
 */

import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import type {
  GitHubClientConfig,
  RateLimitInfo,
  RateLimitStatus,
  CacheConfig,
  RetryConfig,
} from './types';

// Extend Octokit with plugins
const OctokitWithPlugins = Octokit.plugin(retry, throttling);

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

class RequestCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const ttlMs = this.config.ttl * 1000;

    if (age > ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, etag?: string): void {
    // Implement LRU-style eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  getEtag(key: string): string | undefined {
    return this.cache.get(key)?.etag;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// GitHub Client
// ============================================================================

export class GitHubClient {
  private octokit: InstanceType<typeof OctokitWithPlugins>;
  private cache: RequestCache;
  private retryConfig: RetryConfig;
  private rateLimitWarningThreshold = 100; // Warn when < 100 requests remaining

  constructor(config: GitHubClientConfig, cacheConfig?: CacheConfig, retryConfig?: RetryConfig) {
    // Default cache configuration
    const defaultCacheConfig: CacheConfig = {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 1000,
    };

    // Default retry configuration
    const defaultRetryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 60000,
      factor: 2,
    };

    this.cache = new RequestCache(cacheConfig || defaultCacheConfig);
    this.retryConfig = retryConfig || defaultRetryConfig;

    // Initialize Octokit with plugins
    this.octokit = new OctokitWithPlugins({
      auth: config.auth,
      userAgent: config.userAgent || 'CTO-Dashboard/2.0',
      baseUrl: config.baseUrl,
      previews: config.previews,
      timeZone: config.timeZone || 'America/New_York',
      throttle: {
        onRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
          console.warn(
            `Rate limit hit for ${options.method} ${options.url}. Retry after ${retryAfter}s. Attempt ${retryCount}`
          );

          // Retry up to 3 times
          if (retryCount < 3) {
            console.log(`Retrying after ${retryAfter} seconds...`);
            return true;
          }

          return false;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
          console.warn(
            `Secondary rate limit hit for ${options.method} ${options.url}. Retry after ${retryAfter}s.`
          );

          // Retry once for secondary rate limits
          if (retryCount < 1) {
            return true;
          }

          return false;
        },
      },
      request: {
        timeout: config.request?.timeout || 30000,
      },
    });
  }

  // ==========================================================================
  // Rate Limit Methods
  // ==========================================================================

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    const response = await this.octokit.rateLimit.get();
    const { data } = response;

    const mapRateLimit = (resource: any): RateLimitStatus => ({
      limit: resource.limit,
      remaining: resource.remaining,
      reset: new Date(resource.reset * 1000),
      used: resource.used,
      resource: resource.resource || 'unknown',
    });

    return {
      core: mapRateLimit(data.resources.core),
      search: mapRateLimit(data.resources.search),
      graphql: mapRateLimit(data.resources.graphql),
    };
  }

  /**
   * Check if we have enough rate limit remaining
   */
  async checkRateLimit(required: number = 1): Promise<boolean> {
    const rateLimit = await this.getRateLimit();

    if (rateLimit.core.remaining < required) {
      const resetTime = rateLimit.core.reset;
      const waitTime = resetTime.getTime() - Date.now();

      console.warn(
        `Rate limit too low (${rateLimit.core.remaining}/${rateLimit.core.limit}). ` +
        `Resets at ${resetTime.toISOString()} (in ${Math.ceil(waitTime / 1000)}s)`
      );

      return false;
    }

    // Warn if approaching limit
    if (rateLimit.core.remaining < this.rateLimitWarningThreshold) {
      console.warn(
        `Rate limit warning: ${rateLimit.core.remaining}/${rateLimit.core.limit} requests remaining`
      );
    }

    return true;
  }

  /**
   * Wait until rate limit resets
   */
  async waitForRateLimit(): Promise<void> {
    const rateLimit = await this.getRateLimit();
    const resetTime = rateLimit.core.reset;
    const waitTime = Math.max(0, resetTime.getTime() - Date.now());

    if (waitTime > 0) {
      console.log(`Waiting ${Math.ceil(waitTime / 1000)}s for rate limit reset...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1s buffer
    }
  }

  // ==========================================================================
  // Repository Methods
  // ==========================================================================

  /**
   * List all repositories for a user or organization
   */
  async listRepos(owner: string, type: 'all' | 'owner' | 'member' = 'all') {
    const cacheKey = `repos:${owner}:${type}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const repos = await this.octokit.paginate(
      this.octokit.repos.listForUser,
      {
        username: owner,
        type,
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      }
    );

    this.cache.set(cacheKey, repos);
    return repos;
  }

  /**
   * Get a single repository
   */
  async getRepo(owner: string, repo: string) {
    const cacheKey = `repo:${owner}/${repo}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    });

    this.cache.set(cacheKey, data);
    return data;
  }

  // ==========================================================================
  // Issue Methods
  // ==========================================================================

  /**
   * List issues for a repository
   */
  async listIssues(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      since?: Date;
      labels?: string[];
    } = {}
  ) {
    const cacheKey = `issues:${owner}/${repo}:${options.state || 'all'}:${options.since?.toISOString() || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const issues = await this.octokit.paginate(
      this.octokit.issues.listForRepo,
      {
        owner,
        repo,
        state: options.state || 'all',
        since: options.since?.toISOString(),
        labels: options.labels?.join(','),
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      }
    );

    // Filter out pull requests (GitHub API returns PRs as issues)
    const actualIssues = issues.filter((issue: any) => !issue.pull_request);

    this.cache.set(cacheKey, actualIssues);
    return actualIssues;
  }

  /**
   * Get a single issue
   */
  async getIssue(owner: string, repo: string, issueNumber: number) {
    const { data } = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return data;
  }

  // ==========================================================================
  // Pull Request Methods
  // ==========================================================================

  /**
   * List pull requests for a repository
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      since?: Date;
    } = {}
  ) {
    const cacheKey = `prs:${owner}/${repo}:${options.state || 'all'}:${options.since?.toISOString() || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const prs = await this.octokit.paginate(
      this.octokit.pulls.list,
      {
        owner,
        repo,
        state: options.state || 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      }
    );

    // Filter by date if provided
    let filteredPrs = prs;
    if (options.since) {
      filteredPrs = prs.filter((pr: any) => new Date(pr.updated_at) >= options.since!);
    }

    this.cache.set(cacheKey, filteredPrs);
    return filteredPrs;
  }

  /**
   * Get a single pull request
   */
  async getPullRequest(owner: string, repo: string, prNumber: number) {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return data;
  }

  // ==========================================================================
  // Commit Methods
  // ==========================================================================

  /**
   * List commits for a repository
   */
  async listCommits(
    owner: string,
    repo: string,
    options: {
      since?: Date;
      until?: Date;
      sha?: string;
      path?: string;
    } = {}
  ) {
    const cacheKey = `commits:${owner}/${repo}:${options.since?.toISOString() || 'all'}:${options.sha || 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const commits = await this.octokit.paginate(
      this.octokit.repos.listCommits,
      {
        owner,
        repo,
        since: options.since?.toISOString(),
        until: options.until?.toISOString(),
        sha: options.sha,
        path: options.path,
        per_page: 100,
      }
    );

    this.cache.set(cacheKey, commits);
    return commits;
  }

  /**
   * Get a single commit
   */
  async getCommit(owner: string, repo: string, ref: string) {
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref,
    });

    return data;
  }

  // ==========================================================================
  // Contributor Methods
  // ==========================================================================

  /**
   * List contributors for a repository
   */
  async listContributors(owner: string, repo: string) {
    const cacheKey = `contributors:${owner}/${repo}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const contributors = await this.octokit.paginate(
      this.octokit.repos.listContributors,
      {
        owner,
        repo,
        per_page: 100,
      }
    );

    this.cache.set(cacheKey, contributors);
    return contributors;
  }

  // ==========================================================================
  // Statistics Methods
  // ==========================================================================

  /**
   * Get repository statistics
   */
  async getRepoStats(owner: string, repo: string) {
    try {
      const { data: languages } = await this.octokit.repos.listLanguages({
        owner,
        repo,
      });

      return {
        languages,
        linesOfCode: Object.values(languages).reduce((sum: number, bytes: number) => sum + bytes, 0),
      };
    } catch (error) {
      console.error(`Error fetching stats for ${owner}/${repo}:`, error);
      return { languages: {}, linesOfCode: 0 };
    }
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Execute multiple requests with rate limit handling
   */
  async batchRequest<T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 5
  ): Promise<Array<T | Error>> {
    const results: Array<T | Error> = [];
    const chunks = [];

    // Split into chunks
    for (let i = 0; i < requests.length; i += concurrency) {
      chunks.push(requests.slice(i, i + concurrency));
    }

    // Process each chunk
    for (const chunk of chunks) {
      // Check rate limit before processing chunk
      await this.checkRateLimit(chunk.length);

      const chunkResults = await Promise.allSettled(
        chunk.map(request => request())
      );

      results.push(
        ...chunkResults.map(result =>
          result.status === 'fulfilled' ? result.value : new Error(result.reason)
        )
      );
    }

    return results;
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear the request cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  // ==========================================================================
  // Authentication Methods
  // ==========================================================================

  /**
   * Verify authentication and get authenticated user
   */
  async verifyAuth() {
    try {
      const { data } = await this.octokit.users.getAuthenticated();
      return {
        authenticated: true,
        user: data,
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // Raw Octokit Access
  // ==========================================================================

  /**
   * Get the underlying Octokit instance for advanced usage
   */
  getOctokit(): InstanceType<typeof OctokitWithPlugins> {
    return this.octokit;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a GitHub client instance
 */
export function createGitHubClient(
  token: string,
  options?: {
    cache?: CacheConfig;
    retry?: RetryConfig;
  }
): GitHubClient {
  const config: GitHubClientConfig = {
    auth: token,
    userAgent: 'CTO-Dashboard/2.0',
  };

  return new GitHubClient(config, options?.cache, options?.retry);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: GitHubClient | null = null;

/**
 * Get or create a singleton GitHub client instance
 */
export function getGitHubClient(): GitHubClient {
  if (!clientInstance) {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

    if (!token) {
      throw new Error(
        'GitHub token not found. Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN environment variable.'
      );
    }

    clientInstance = createGitHubClient(token);
  }

  return clientInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetGitHubClient(): void {
  clientInstance = null;
}
