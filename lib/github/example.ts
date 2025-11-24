/**
 * GitHub Integration - Example Usage
 *
 * Demonstrates how to use the GitHub sync system.
 */

import {
  getGitHubClient,
  createSyncOrchestrator,
  getSyncStatusTracker,
  quickSyncAll,
  quickIncrementalSync,
} from './index';

// ============================================================================
// Example 1: Basic Authentication Test
// ============================================================================

async function exampleAuth() {
  console.log('=== Example 1: Authentication ===\n');

  const client = getGitHubClient();

  // Verify authentication
  const auth = await client.verifyAuth();

  if (auth.authenticated) {
    console.log('✓ Authenticated as:', auth.user.login);
    console.log('  Name:', auth.user.name);
    console.log('  Email:', auth.user.email);
  } else {
    console.error('✗ Authentication failed:', auth.error);
  }

  // Check rate limit
  const rateLimit = await client.getRateLimit();
  console.log('\nRate Limits:');
  console.log(`  Core: ${rateLimit.core.remaining}/${rateLimit.core.limit}`);
  console.log(`  Search: ${rateLimit.search.remaining}/${rateLimit.search.limit}`);
  console.log(`  Reset: ${rateLimit.core.reset.toLocaleString()}`);
}

// ============================================================================
// Example 2: List Repositories
// ============================================================================

async function exampleListRepos() {
  console.log('\n=== Example 2: List Repositories ===\n');

  const client = getGitHubClient();
  const owner = process.env.GITHUB_OWNER || 'octocat';

  const repos = await client.listRepos(owner);

  console.log(`Found ${repos.length} repositories for ${owner}:\n`);

  repos.slice(0, 10).forEach((repo, i) => {
    console.log(`${i + 1}. ${repo.name}`);
    console.log(`   ⭐ ${repo.stargazers_count} stars`);
    console.log(`   🍴 ${repo.forks_count} forks`);
    console.log(`   📝 ${repo.language || 'N/A'}`);
    console.log(`   🔗 ${repo.html_url}`);
    console.log('');
  });
}

// ============================================================================
// Example 3: List Issues
// ============================================================================

async function exampleListIssues() {
  console.log('\n=== Example 3: List Issues ===\n');

  const client = getGitHubClient();
  const owner = process.env.GITHUB_OWNER || 'octocat';
  const repo = 'Hello-World'; // Change to your repo

  try {
    const issues = await client.listIssues(owner, repo, {
      state: 'all',
    });

    console.log(`Found ${issues.length} issues in ${owner}/${repo}:\n`);

    issues.slice(0, 5).forEach((issue, i) => {
      console.log(`${i + 1}. #${issue.number}: ${issue.title}`);
      console.log(`   State: ${issue.state}`);
      console.log(`   Labels: ${issue.labels.map(l => l.name).join(', ') || 'None'}`);
      console.log(`   Created: ${new Date(issue.created_at).toLocaleDateString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error fetching issues:', error.message);
  }
}

// ============================================================================
// Example 4: Full Sync with Progress Tracking
// ============================================================================

async function exampleFullSync() {
  console.log('\n=== Example 4: Full Sync with Progress ===\n');

  const owner = process.env.GITHUB_OWNER;
  if (!owner) {
    console.error('GITHUB_OWNER environment variable not set');
    return;
  }

  const orchestrator = createSyncOrchestrator();

  // Subscribe to progress updates
  orchestrator.onProgress((progress) => {
    const percent = progress.totalRepos > 0
      ? ((progress.processedRepos / progress.totalRepos) * 100).toFixed(1)
      : '0.0';

    console.log(
      `Progress: [${progress.processedRepos}/${progress.totalRepos}] ${percent}% ` +
      `| Stage: ${progress.stage} ` +
      `| Current: ${progress.currentRepo || 'N/A'}`
    );
  });

  // Start sync
  console.log(`Starting full sync for ${owner}...\n`);

  const result = await orchestrator.syncAllRepos({
    owner,
    concurrency: 3, // Lower concurrency for testing
  });

  // Display results
  console.log('\n=== Sync Results ===\n');
  console.log(`Success: ${result.success ? '✓' : '✗'}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`Repositories synced: ${result.reposSynced}`);
  console.log(`Issues synced: ${result.issuesSynced}`);
  console.log(`PRs synced: ${result.prsSynced}`);
  console.log(`Commits synced: ${result.commitsSynced}`);
  console.log(`Rate limit remaining: ${result.rateLimitRemaining}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.slice(0, 5).forEach(err => {
      console.log(`  - [${err.repo}] ${err.operation}: ${err.error}`);
    });
  }
}

// ============================================================================
// Example 5: Incremental Sync
// ============================================================================

async function exampleIncrementalSync() {
  console.log('\n=== Example 5: Incremental Sync ===\n');

  const owner = process.env.GITHUB_OWNER;
  if (!owner) {
    console.error('GITHUB_OWNER environment variable not set');
    return;
  }

  console.log('Starting incremental sync (changes since last sync)...\n');

  const result = await quickIncrementalSync(owner);

  console.log('=== Results ===\n');
  console.log(`Repositories: ${result.reposSynced}`);
  console.log(`Issues: ${result.issuesSynced}`);
  console.log(`PRs: ${result.prsSynced}`);
  console.log(`Commits: ${result.commitsSynced}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
}

// ============================================================================
// Example 6: Sync Specific Repositories
// ============================================================================

async function exampleSyncSpecificRepos() {
  console.log('\n=== Example 6: Sync Specific Repositories ===\n');

  const owner = process.env.GITHUB_OWNER;
  if (!owner) {
    console.error('GITHUB_OWNER environment variable not set');
    return;
  }

  const repos = ['repo1', 'repo2', 'repo3']; // Change to your repos

  console.log(`Syncing specific repos: ${repos.join(', ')}\n`);

  const result = await quickSyncAll(owner, repos);

  console.log('=== Results ===\n');
  console.log(`Repositories: ${result.reposSynced}`);
  console.log(`Issues: ${result.issuesSynced}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
}

// ============================================================================
// Example 7: Sync Status and History
// ============================================================================

async function exampleSyncStatus() {
  console.log('\n=== Example 7: Sync Status ===\n');

  const tracker = getSyncStatusTracker();

  // Current sync
  const current = tracker.getCurrentSync();
  if (current) {
    console.log('Current Sync:');
    console.log(`  ID: ${current.id}`);
    console.log(`  Type: ${current.syncType}`);
    console.log(`  Status: ${current.status}`);
    console.log(`  Progress: ${current.progress.processedRepos}/${current.progress.totalRepos}`);
  } else {
    console.log('No sync currently running');
  }

  // Statistics
  const stats = await tracker.getSyncStats();
  console.log('\n=== Sync Statistics ===\n');
  console.log(`Total syncs: ${stats.totalSyncs}`);
  console.log(`Successful: ${stats.successfulSyncs}`);
  console.log(`Failed: ${stats.failedSyncs}`);
  console.log(`Success rate: ${((stats.successfulSyncs / stats.totalSyncs) * 100).toFixed(1)}%`);
  console.log(`Last sync: ${stats.lastSyncAt?.toLocaleString() || 'Never'}`);
  console.log(`Avg duration: ${stats.avgDuration ? (stats.avgDuration / 1000).toFixed(2) + 's' : 'N/A'}`);
  console.log(`Total records: ${stats.totalRecordsImported}`);

  // History
  const history = await tracker.getSyncHistory(5);
  console.log('\n=== Recent Syncs ===\n');
  history.forEach((sync, i) => {
    console.log(`${i + 1}. ${sync.id}`);
    console.log(`   Type: ${sync.syncType}`);
    console.log(`   Status: ${sync.status}`);
    console.log(`   Date: ${sync.createdAt.toLocaleString()}`);
    if (sync.result) {
      console.log(`   Repos: ${sync.result.reposSynced}, Issues: ${sync.result.issuesSynced}`);
    }
    console.log('');
  });
}

// ============================================================================
// Example 8: Batch Operations
// ============================================================================

async function exampleBatchOperations() {
  console.log('\n=== Example 8: Batch Operations ===\n');

  const client = getGitHubClient();
  const owner = process.env.GITHUB_OWNER || 'octocat';

  // Fetch multiple repos in parallel
  const repoNames = ['Hello-World', 'Spoon-Knife', 'octocat.github.io'];

  console.log('Fetching multiple repos in parallel...\n');

  const results = await client.batchRequest(
    repoNames.map(name => () => client.getRepo(owner, name)),
    3 // 3 concurrent requests
  );

  results.forEach((result, i) => {
    if (result instanceof Error) {
      console.log(`${i + 1}. ${repoNames[i]}: Error - ${result.message}`);
    } else {
      console.log(`${i + 1}. ${repoNames[i]}: ✓ ${result.stargazers_count} stars`);
    }
  });
}

// ============================================================================
// Main: Run Examples
// ============================================================================

async function main() {
  console.log('GitHub Integration - Examples\n');
  console.log('=' .repeat(60));

  try {
    // Run examples (comment out ones you don't want to run)
    await exampleAuth();
    // await exampleListRepos();
    // await exampleListIssues();
    // await exampleFullSync(); // Warning: Can take 30+ minutes for 180 repos
    // await exampleIncrementalSync();
    // await exampleSyncSpecificRepos();
    // await exampleSyncStatus();
    // await exampleBatchOperations();

    console.log('\n' + '='.repeat(60));
    console.log('Examples completed successfully!');

  } catch (error) {
    console.error('\nError running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export examples for testing
export {
  exampleAuth,
  exampleListRepos,
  exampleListIssues,
  exampleFullSync,
  exampleIncrementalSync,
  exampleSyncSpecificRepos,
  exampleSyncStatus,
  exampleBatchOperations,
};
