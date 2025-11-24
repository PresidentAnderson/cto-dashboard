/**
 * GitHub Data Normalizer
 *
 * Transforms GitHub API responses to database schema format.
 * Handles metadata extraction, missing fields, and deduplication.
 */

import { ProjectStatus, BugSeverity, BugStatus } from '@prisma/client';
import type {
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubContributor,
  NormalizedProject,
  NormalizedBug,
  NormalizedMetric,
  EngineeringActivity,
} from './types';

// ============================================================================
// Project Normalization
// ============================================================================

/**
 * Normalize GitHub repository to Project schema
 */
export function normalizeRepository(repo: GitHubRepository): NormalizedProject {
  // Determine project status based on repository state
  let status: ProjectStatus = ProjectStatus.active;
  if (repo.archived) {
    status = ProjectStatus.shipped;
  } else if (repo.disabled) {
    status = ProjectStatus.cancelled;
  }

  // Extract topics/tags
  const tags = repo.topics || [];

  // Parse last commit date
  const lastCommit = repo.pushed_at ? new Date(repo.pushed_at) : null;

  return {
    name: repo.name,
    description: repo.description,
    githubUrl: repo.html_url,
    demoUrl: repo.homepage,
    language: repo.language,
    tags,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    lastCommit,
    status,
  };
}

/**
 * Batch normalize repositories
 */
export function normalizeRepositories(repos: GitHubRepository[]): NormalizedProject[] {
  return repos.map(normalizeRepository);
}

// ============================================================================
// Bug/Issue Normalization
// ============================================================================

/**
 * Extract severity from GitHub issue labels
 */
function extractSeverity(labels: Array<{ name: string }>): BugSeverity {
  const labelNames = labels.map(l => l.name.toLowerCase());

  if (labelNames.includes('critical') || labelNames.includes('severity: critical')) {
    return BugSeverity.critical;
  }
  if (labelNames.includes('high') || labelNames.includes('severity: high') || labelNames.includes('urgent')) {
    return BugSeverity.high;
  }
  if (labelNames.includes('medium') || labelNames.includes('severity: medium')) {
    return BugSeverity.medium;
  }
  if (labelNames.includes('low') || labelNames.includes('severity: low') || labelNames.includes('minor')) {
    return BugSeverity.low;
  }

  // Default to medium if no severity label
  return BugSeverity.medium;
}

/**
 * Extract bug status from GitHub issue state and labels
 */
function extractBugStatus(issue: GitHubIssue): BugStatus {
  const labelNames = issue.labels.map(l => l.name.toLowerCase());

  // Check labels first for more specific status
  if (labelNames.includes('in progress') || labelNames.includes('in-progress')) {
    return BugStatus.in_progress;
  }
  if (labelNames.includes('verified') || labelNames.includes('qa')) {
    return BugStatus.verified;
  }
  if (labelNames.includes('shipped') || labelNames.includes('deployed')) {
    return BugStatus.shipped;
  }
  if (labelNames.includes('deferred') || labelNames.includes('backlog')) {
    return BugStatus.deferred;
  }

  // Fall back to GitHub state
  if (issue.state === 'closed') {
    return issue.closed_at ? BugStatus.closed : BugStatus.verified;
  }

  return BugStatus.pending;
}

/**
 * Check if issue is a blocker
 */
function isBlocker(labels: Array<{ name: string }>): boolean {
  const labelNames = labels.map(l => l.name.toLowerCase());
  return (
    labelNames.includes('blocker') ||
    labelNames.includes('blocking') ||
    labelNames.includes('priority: critical')
  );
}

/**
 * Calculate priority score based on severity, labels, and age
 */
function calculatePriorityScore(issue: GitHubIssue, severity: BugSeverity, isBlocker: boolean): number {
  let score = 50; // Base score

  // Severity contribution (0-40 points)
  const severityScores = {
    [BugSeverity.critical]: 40,
    [BugSeverity.high]: 30,
    [BugSeverity.medium]: 20,
    [BugSeverity.low]: 10,
  };
  score += severityScores[severity];

  // Blocker bonus
  if (isBlocker) {
    score += 30;
  }

  // Age contribution (older issues get higher priority)
  const ageInDays = (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.min(20, Math.floor(ageInDays / 7)); // +1 per week, max 20

  // Label-based adjustments
  const labelNames = issue.labels.map(l => l.name.toLowerCase());
  if (labelNames.includes('good first issue')) score -= 20;
  if (labelNames.includes('enhancement')) score -= 10;
  if (labelNames.includes('documentation')) score -= 15;
  if (labelNames.includes('security')) score += 25;
  if (labelNames.includes('regression')) score += 20;

  return Math.max(0, Math.min(100, score)); // Clamp to 0-100
}

/**
 * Calculate SLA hours based on severity
 */
function calculateSlaHours(severity: BugSeverity): number {
  const slaMapping = {
    [BugSeverity.critical]: 4,   // 4 hours
    [BugSeverity.high]: 24,      // 1 day
    [BugSeverity.medium]: 72,    // 3 days
    [BugSeverity.low]: 168,      // 1 week
  };

  return slaMapping[severity];
}

/**
 * Extract business impact from issue body or labels
 */
function extractBusinessImpact(issue: GitHubIssue): string | null {
  const body = issue.body || '';
  const labelNames = issue.labels.map(l => l.name.toLowerCase());

  // Look for business impact in body
  const impactMatch = body.match(/business impact[:\s]+(.+?)(\n|$)/i);
  if (impactMatch) {
    return impactMatch[1].trim();
  }

  // Derive from labels
  if (labelNames.includes('revenue-impact') || labelNames.includes('customer-facing')) {
    return 'Impacts customer experience and potential revenue';
  }
  if (labelNames.includes('internal-tools')) {
    return 'Affects internal team productivity';
  }

  return null;
}

/**
 * Normalize GitHub issue to Bug schema
 */
export function normalizeIssue(issue: GitHubIssue, projectId?: string): NormalizedBug {
  const severity = extractSeverity(issue.labels);
  const status = extractBugStatus(issue);
  const isIssueBlocker = isBlocker(issue.labels);
  const priorityScore = calculatePriorityScore(issue, severity, isIssueBlocker);
  const slaHours = calculateSlaHours(severity);
  const businessImpact = extractBusinessImpact(issue);

  return {
    bugNumber: `GH-${issue.number}`,
    title: issue.title,
    description: issue.body,
    severity,
    status,
    projectId,
    slaHours,
    businessImpact,
    isBlocker: isIssueBlocker,
    priorityScore,
    createdAt: new Date(issue.created_at),
    updatedAt: new Date(issue.updated_at),
    resolvedAt: issue.closed_at ? new Date(issue.closed_at) : null,
  };
}

/**
 * Batch normalize issues
 */
export function normalizeIssues(issues: GitHubIssue[], projectId?: string): NormalizedBug[] {
  return issues.map(issue => normalizeIssue(issue, projectId));
}

// ============================================================================
// Metrics Normalization
// ============================================================================

/**
 * Calculate health score based on repository metrics
 */
function calculateHealthScore(data: {
  hasRecentCommits: boolean;
  openIssuesCount: number;
  starsCount: number;
  contributorsCount: number;
  hasCI?: boolean;
  hasTests?: boolean;
}): number {
  let score = 50; // Base score

  // Recent activity
  if (data.hasRecentCommits) score += 20;

  // Issue management (fewer open issues = better)
  if (data.openIssuesCount === 0) score += 15;
  else if (data.openIssuesCount < 5) score += 10;
  else if (data.openIssuesCount < 10) score += 5;
  else if (data.openIssuesCount > 50) score -= 15;

  // Community engagement
  if (data.starsCount > 100) score += 10;
  else if (data.starsCount > 50) score += 5;

  // Team size
  if (data.contributorsCount > 10) score += 10;
  else if (data.contributorsCount > 5) score += 5;

  // Best practices
  if (data.hasCI) score += 10;
  if (data.hasTests) score += 10;

  return Math.max(0, Math.min(100, score)); // Clamp to 0-100
}

/**
 * Extract tech stack from repository data
 */
function extractTechStack(
  language: string | null,
  topics: string[],
  languages?: Record<string, number>
): string[] {
  const techStack = new Set<string>();

  // Add primary language
  if (language) {
    techStack.add(language);
  }

  // Add technologies from topics
  const techTopics = topics.filter(topic => {
    const lower = topic.toLowerCase();
    return (
      lower.includes('framework') ||
      lower.includes('library') ||
      !lower.includes('-') // Simple tech names like "react", "node", "python"
    );
  });
  techTopics.forEach(topic => techStack.add(topic));

  // Add languages from language breakdown
  if (languages) {
    const mainLanguages = Object.keys(languages)
      .sort((a, b) => languages[b] - languages[a])
      .slice(0, 3); // Top 3 languages
    mainLanguages.forEach(lang => techStack.add(lang));
  }

  return Array.from(techStack).slice(0, 10); // Max 10 items
}

/**
 * Normalize repository metrics
 */
export function normalizeMetrics(
  repo: GitHubRepository,
  projectId: string,
  additionalData?: {
    commitsCount?: number;
    contributors?: GitHubContributor[];
    languages?: Record<string, number>;
  }
): NormalizedMetric {
  const commitsCount = additionalData?.commitsCount || 0;
  const contributors = additionalData?.contributors?.length || 0;
  const languages = additionalData?.languages || {};

  // Calculate lines of code from language bytes (rough estimate)
  const linesOfCode = Object.values(languages).reduce((sum, bytes) => sum + Math.floor(bytes / 50), 0);

  // Extract tech stack
  const techStack = extractTechStack(repo.language, repo.topics, languages);

  // Check for recent commits (within last 30 days)
  const lastPushDate = repo.pushed_at ? new Date(repo.pushed_at) : new Date(0);
  const daysSinceLastPush = (Date.now() - lastPushDate.getTime()) / (1000 * 60 * 60 * 24);
  const hasRecentCommits = daysSinceLastPush < 30;

  // Calculate health score
  const healthScore = calculateHealthScore({
    hasRecentCommits,
    openIssuesCount: repo.open_issues_count,
    starsCount: repo.stargazers_count,
    contributorsCount: contributors,
  });

  return {
    projectId,
    commitsCount,
    contributors,
    linesOfCode,
    techStack,
    healthScore,
    date: new Date(),
  };
}

// ============================================================================
// Engineering Activity Normalization
// ============================================================================

/**
 * Normalize commit to engineering activity
 */
export function normalizeCommitActivity(
  commit: GitHubCommit,
  projectId: string,
  repoName: string
): EngineeringActivity {
  return {
    projectId,
    activityType: 'commit',
    author: commit.author?.login || commit.commit.author.name,
    message: commit.commit.message.split('\n')[0], // First line only
    url: commit.html_url,
    timestamp: new Date(commit.commit.author.date),
    metadata: {
      sha: commit.sha,
      repository: repoName,
    },
  };
}

/**
 * Normalize PR to engineering activity
 */
export function normalizePRActivity(
  pr: GitHubPullRequest,
  projectId: string,
  repoName: string,
  activityType: 'pr_opened' | 'pr_merged'
): EngineeringActivity {
  const timestamp = activityType === 'pr_opened'
    ? new Date(pr.created_at)
    : new Date(pr.merged_at || pr.closed_at || pr.updated_at);

  return {
    projectId,
    activityType,
    author: pr.user.login,
    message: pr.title,
    url: pr.html_url,
    timestamp,
    metadata: {
      prNumber: pr.number,
      repository: repoName,
      branch: pr.head.ref,
    },
  };
}

/**
 * Normalize issue closure to engineering activity
 */
export function normalizeIssueActivity(
  issue: GitHubIssue,
  projectId: string,
  repoName: string
): EngineeringActivity {
  return {
    projectId,
    activityType: 'issue_closed',
    author: issue.user.login,
    message: issue.title,
    url: issue.html_url,
    timestamp: new Date(issue.closed_at || issue.updated_at),
    metadata: {
      issueNumber: issue.number,
      repository: repoName,
      labels: issue.labels.map(l => l.name),
    },
  };
}

// ============================================================================
// Deduplication Utilities
// ============================================================================

/**
 * Deduplicate array by key
 */
export function deduplicateByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate normalized bugs by bug number
 */
export function deduplicateBugs(bugs: NormalizedBug[]): NormalizedBug[] {
  return deduplicateByKey(bugs, bug => bug.bugNumber);
}

/**
 * Deduplicate normalized projects by GitHub URL
 */
export function deduplicateProjects(projects: NormalizedProject[]): NormalizedProject[] {
  return deduplicateByKey(projects, project => project.githubUrl);
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate normalized project
 */
export function validateProject(project: NormalizedProject): boolean {
  return !!(
    project.name &&
    project.githubUrl &&
    project.name.length <= 255
  );
}

/**
 * Validate normalized bug
 */
export function validateBug(bug: NormalizedBug): boolean {
  return !!(
    bug.bugNumber &&
    bug.title &&
    bug.severity &&
    bug.status &&
    bug.slaHours > 0 &&
    bug.title.length <= 500
  );
}

/**
 * Filter valid items from array
 */
export function filterValid<T>(
  items: T[],
  validator: (item: T) => boolean
): { valid: T[]; invalid: T[] } {
  const valid: T[] = [];
  const invalid: T[] = [];

  items.forEach(item => {
    if (validator(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  });

  return { valid, invalid };
}
