# GitHub Integration System

Comprehensive GitHub synchronization system for CTO Dashboard v2.0. Real-time sync of 180+ repositories, issues, pull requests, and commits.

## Features

- **Full & Incremental Sync**: Initial full sync + incremental updates
- **Rate Limit Management**: Automatic rate limit handling with exponential backoff
- **Parallel Processing**: Concurrent API requests (default: 5)
- **Request Caching**: LRU cache with configurable TTL
- **Webhook Support**: Real-time updates via GitHub webhooks
- **Progress Tracking**: SSE-based real-time progress updates
- **Error Recovery**: Transaction support with rollback
- **Type Safety**: Full TypeScript support

## Architecture

```
lib/github/
├── client.ts              # GitHub API client (Octokit wrapper)
├── sync-orchestrator.ts   # Sync coordination & parallel processing
├── normalizer.ts          # Data transformation (GitHub → DB schema)
├── webhook-handler.ts     # Webhook processing & signature verification
├── sync-status.ts         # Progress tracking & SSE
├── types.ts              # TypeScript definitions
├── index.ts              # Main exports
└── README.md             # This file
```

## Quick Start

### 1. Environment Setup

Add to `.env.local`:

```bash
# GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_token_here

# GitHub Webhook Secret (for webhook verification)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# GitHub Organization/User
GITHUB_OWNER=your-github-username
```

### 2. Install Dependencies

```bash
npm install @octokit/rest @octokit/plugin-retry @octokit/plugin-throttling
```

### 3. Basic Usage

```typescript
import { quickSyncAll, getSyncStatusTracker } from '@/lib/github';

// Perform full sync
const result = await quickSyncAll('your-github-username');

console.log(`Synced ${result.reposSynced} repos, ${result.issuesSynced} issues`);
```

## API Reference

### GitHubClient

Octokit wrapper with rate limiting, caching, and retry logic.

```typescript
import { createGitHubClient, getGitHubClient } from '@/lib/github';

// Create client
const client = createGitHubClient('ghp_token');

// Or get singleton
const client = getGitHubClient();

// List repositories
const repos = await client.listRepos('owner');

// List issues
const issues = await client.listIssues('owner', 'repo', {
  state: 'all',
  since: new Date('2024-01-01'),
});

// Check rate limit
const rateLimit = await client.getRateLimit();
console.log(`${rateLimit.core.remaining}/${rateLimit.core.limit} requests remaining`);

// Batch requests
const results = await client.batchRequest([
  () => client.getRepo('owner', 'repo1'),
  () => client.getRepo('owner', 'repo2'),
], 5); // 5 concurrent requests
```

### SyncOrchestrator

Coordinates full and incremental syncs with parallel processing.

```typescript
import { createSyncOrchestrator } from '@/lib/github';

const orchestrator = createSyncOrchestrator();

// Subscribe to progress updates
orchestrator.onProgress((progress) => {
  console.log(`[${progress.processedRepos}/${progress.totalRepos}] ${progress.stage}`);
});

// Full sync
const result = await orchestrator.syncAllRepos({
  owner: 'your-username',
  concurrency: 5,
});

// Incremental sync (since last sync)
const result = await orchestrator.incrementalSync({
  owner: 'your-username',
});

// Sync specific repos
const result = await orchestrator.syncAllRepos({
  owner: 'your-username',
  repos: ['repo1', 'repo2', 'repo3'],
});

// Sync single repo
const result = await orchestrator.syncRepo('repo-name', {
  owner: 'your-username',
});
```

### Data Normalizer

Transforms GitHub API responses to database schema.

```typescript
import { normalizeRepository, normalizeIssue, normalizeMetrics } from '@/lib/github';

// Normalize repository
const project = normalizeRepository(githubRepo);

// Normalize issue → bug
const bug = normalizeIssue(githubIssue, projectId);

// Normalize metrics
const metrics = normalizeMetrics(githubRepo, projectId, {
  commitsCount: 150,
  contributors: contributorsArray,
  languages: { TypeScript: 50000, JavaScript: 30000 },
});
```

### WebhookHandler

Process GitHub webhooks with signature verification.

```typescript
import { createWebhookMiddleware, getWebhookHandler } from '@/lib/github';

// Express middleware
app.post('/api/webhooks/github', createWebhookMiddleware());

// Custom handler
const handler = getWebhookHandler();

handler.registerHandler('push', async (payload) => {
  console.log(`Push to ${payload.repository.name}`);
  // Custom logic
});

await handler.processWebhook('push', payload);
```

### SyncStatusTracker

Track sync progress with real-time updates via SSE.

```typescript
import { getSyncStatusTracker, getSyncSSEManager } from '@/lib/github';

const tracker = getSyncStatusTracker();

// Start sync
const syncId = await tracker.startSync('full', {
  totalRepos: 180,
  processedRepos: 0,
  currentRepo: null,
  stage: 'initializing',
  startTime: new Date(),
});

// Update progress
await tracker.updateProgress({
  processedRepos: 50,
  currentRepo: 'my-repo',
  stage: 'syncing_issues',
});

// Complete sync
await tracker.completeSync(result);

// Get history
const history = await tracker.getSyncHistory(10);

// Get stats
const stats = await tracker.getSyncStats();
```

### SSE (Server-Sent Events)

Real-time progress updates for frontend.

```typescript
// Backend (Express)
import { getSyncSSEManager } from '@/lib/github';

const sseManager = getSyncSSEManager();

app.get('/api/sync/stream', sseManager.createSSEHandler());

// Frontend (React)
useEffect(() => {
  const eventSource = new EventSource('/api/sync/stream');

  eventSource.addEventListener('message', (event) => {
    const { type, data } = JSON.parse(event.data);

    if (type === 'sync:progress') {
      console.log(`Progress: ${data.progress.processedRepos}/${data.progress.totalRepos}`);
    }
  });

  return () => eventSource.close();
}, []);
```

## Sync Strategies

### Initial Full Sync

Sync all repositories and their data. Can take 30+ minutes for 180+ repos.

```typescript
import { quickSyncAll } from '@/lib/github';

const result = await quickSyncAll('your-username');
```

### Incremental Sync

Only sync changes since last sync.

```typescript
import { quickIncrementalSync } from '@/lib/github';

const result = await quickIncrementalSync('your-username');
```

### Webhook-Driven Updates

Real-time updates via GitHub webhooks.

```typescript
// 1. Setup webhook endpoint
app.post('/api/webhooks/github', createWebhookMiddleware());

// 2. Configure webhook in GitHub:
//    URL: https://your-domain.com/api/webhooks/github
//    Secret: your_webhook_secret
//    Events: Push, Issues, Pull requests, Repository
```

### Scheduled Sync

Daily sync at 2am via cron job.

```typescript
import cron from 'node-cron';
import { quickIncrementalSync } from '@/lib/github';

// Run daily at 2am
cron.schedule('0 2 * * *', async () => {
  console.log('Starting scheduled sync...');
  await quickIncrementalSync('your-username');
});
```

## Rate Limiting

GitHub API limits:
- **Authenticated**: 5,000 requests/hour
- **Search**: 30 requests/minute
- **GraphQL**: 5,000 points/hour

The client automatically:
1. Checks rate limit before batches
2. Waits when limit is reached
3. Retries on rate limit errors (3x)
4. Uses exponential backoff

```typescript
// Check before operation
const hasLimit = await client.checkRateLimit(10);
if (!hasLimit) {
  await client.waitForRateLimit();
}

// Get current status
const rateLimit = await client.getRateLimit();
console.log(`Resets at: ${rateLimit.core.reset}`);
```

## Error Handling

All operations include comprehensive error handling:

```typescript
try {
  const result = await orchestrator.syncAllRepos({ owner: 'username' });

  if (!result.success) {
    console.error('Sync completed with errors:', result.errors);
  }
} catch (error) {
  console.error('Sync failed:', error);
}

// Get errors from orchestrator
const errors = orchestrator.getErrors();
errors.forEach(err => {
  console.error(`[${err.repo}] ${err.operation}: ${err.error}`);
});
```

## Database Schema Mapping

### GitHub Repository → Project

```typescript
{
  name: repo.name,
  description: repo.description,
  githubUrl: repo.html_url,
  language: repo.language,
  tags: repo.topics,
  stars: repo.stargazers_count,
  forks: repo.forks_count,
  lastCommit: repo.pushed_at,
  status: repo.archived ? 'shipped' : 'active'
}
```

### GitHub Issue → Bug

```typescript
{
  bugNumber: `GH-${issue.number}`,
  title: issue.title,
  description: issue.body,
  severity: extractSeverity(issue.labels), // critical/high/medium/low
  status: extractBugStatus(issue), // pending/in_progress/verified/shipped/closed
  slaHours: calculateSlaHours(severity),
  priorityScore: calculatePriorityScore(issue),
  isBlocker: hasBlockerLabel(issue.labels),
  createdAt: issue.created_at,
  resolvedAt: issue.closed_at
}
```

### Repository Metrics → ProjectMetric

```typescript
{
  projectId: project.id,
  commitsCount: recentCommits.length,
  contributors: contributors.length,
  linesOfCode: calculateLOC(languages),
  techStack: extractTechStack(repo),
  healthScore: calculateHealthScore(metrics),
  date: new Date()
}
```

## Caching

Request cache with LRU eviction:

```typescript
const client = createGitHubClient('token', {
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000, // 1000 entries
  },
});

// Clear cache manually
client.clearCache();

// Check cache size
const size = client.getCacheSize();
```

## Testing

```bash
# Set test token
export GITHUB_TOKEN=ghp_test_token

# Run sync
npm run sync:test

# Run with specific repos
npm run sync:test -- --repos repo1,repo2,repo3
```

## Monitoring

```typescript
import { getSyncStatusTracker } from '@/lib/github';

const tracker = getSyncStatusTracker();

// Get stats
const stats = await tracker.getSyncStats();
console.log(`
  Total Syncs: ${stats.totalSyncs}
  Success Rate: ${(stats.successfulSyncs / stats.totalSyncs * 100).toFixed(1)}%
  Avg Duration: ${(stats.avgDuration / 1000).toFixed(1)}s
  Last Sync: ${stats.lastSyncAt}
`);

// Get history
const history = await tracker.getSyncHistory(20);
history.forEach(sync => {
  console.log(`${sync.id}: ${sync.status} (${sync.syncType})`);
});
```

## Troubleshooting

### Rate Limit Exceeded

```typescript
// Check current status
const rateLimit = await client.getRateLimit();
console.log(`Resets at: ${rateLimit.core.reset}`);

// Wait for reset
await client.waitForRateLimit();
```

### Authentication Failed

```bash
# Verify token
curl -H "Authorization: token ghp_your_token" https://api.github.com/user

# Check token scopes (need: repo, read:org)
```

### Webhook Signature Failed

```typescript
// Verify secret matches GitHub webhook configuration
console.log('Expected secret:', process.env.GITHUB_WEBHOOK_SECRET);

// Test signature verification
const isValid = verifyWebhookSignature(payload, signature, secret);
```

### Sync Timeout

```typescript
// Reduce concurrency
const result = await orchestrator.syncAllRepos({
  owner: 'username',
  concurrency: 2, // Lower concurrency
});

// Sync specific repos
const result = await orchestrator.syncAllRepos({
  owner: 'username',
  repos: ['high-priority-repo'],
});
```

## Performance

Expected sync times (180 repos):

- **Initial Full Sync**: 25-35 minutes
- **Incremental Sync**: 2-5 minutes
- **Single Repo**: 5-15 seconds
- **Webhook Update**: < 1 second

Optimization tips:

1. Use incremental sync after initial full sync
2. Adjust concurrency based on rate limits
3. Enable caching for frequently accessed data
4. Use webhooks for real-time updates
5. Schedule full syncs during off-peak hours

## Security

- **Token Storage**: Store GitHub token in environment variables only
- **Webhook Secret**: Use strong secret for signature verification
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: All webhook payloads validated
- **SQL Injection**: Using Prisma ORM prevents SQL injection

## License

MIT
