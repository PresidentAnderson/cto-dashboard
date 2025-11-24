# GitHub Sync - Quick Start

Get the GitHub integration running in 5 minutes.

## 1. Install (2 minutes)

```bash
cd backend
npm install @octokit/rest @octokit/plugin-retry @octokit/plugin-throttling
```

## 2. Configure (1 minute)

Add to `.env.local`:

```bash
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=your-github-username
DATABASE_URL=postgresql://... # Already configured
```

**Get GitHub Token**: https://github.com/settings/tokens
- Scopes: `repo`, `read:org`, `read:user`

## 3. Test (1 minute)

```bash
npx tsx -e "
import { getGitHubClient } from './lib/github/index';

(async () => {
  const client = getGitHubClient();
  const auth = await client.verifyAuth();

  if (auth.authenticated) {
    console.log('✓ Authenticated as:', auth.user.login);

    const rateLimit = await client.getRateLimit();
    console.log('✓ Rate limit:', rateLimit.core.remaining + '/' + rateLimit.core.limit);

    console.log('✓ GitHub integration is working!');
  } else {
    console.error('✗ Authentication failed:', auth.error);
    process.exit(1);
  }
})();
"
```

## 4. Sync (1 minute)

### Option A: Quick Sync (Recommended for first time)

Sync a few test repos:

```bash
npx tsx -e "
import { quickSyncAll } from './lib/github/index';

(async () => {
  console.log('Starting test sync...');

  const result = await quickSyncAll('your-username', ['repo1', 'repo2']);

  console.log('✓ Synced:', result.reposSynced, 'repos');
  console.log('✓ Issues:', result.issuesSynced);
  console.log('✓ Duration:', (result.duration / 1000).toFixed(1) + 's');
})();
"
```

### Option B: Full Sync (Takes 30 minutes for 180 repos)

```bash
npx tsx -e "
import { quickSyncAll } from './lib/github/index';

(async () => {
  console.log('Starting full sync (this may take 30 minutes)...');

  const result = await quickSyncAll('your-username');

  console.log('✓ Complete!');
  console.log('  Repos:', result.reposSynced);
  console.log('  Issues:', result.issuesSynced);
  console.log('  PRs:', result.prsSynced);
  console.log('  Duration:', (result.duration / 60000).toFixed(1) + ' min');
})();
"
```

## 5. Verify Data

Check your database:

```bash
cd backend
npx prisma studio
```

Look at:
- `projects` table → Should see your repos
- `bugs` table → Should see GitHub issues
- `project_metrics` table → Should see metrics

## That's It! 🎉

Your GitHub sync is now running.

## Next Steps

### Setup Incremental Sync

Add to `backend/server.js`:

```javascript
const cron = require('node-cron');
const { quickIncrementalSync } = require('../lib/github');

// Run every hour
cron.schedule('0 * * * *', async () => {
  await quickIncrementalSync(process.env.GITHUB_OWNER);
});
```

### Setup Webhooks (Optional)

Real-time updates when you push code:

1. **Add webhook endpoint** (`backend/routes/github.js`):
```javascript
const { createWebhookMiddleware } = require('../../lib/github');
router.post('/webhook', createWebhookMiddleware());
```

2. **Configure on GitHub**:
   - Go to: https://github.com/settings/hooks
   - Payload URL: `https://your-domain.com/api/github/webhook`
   - Content type: `application/json`
   - Secret: Add to `.env.local` as `GITHUB_WEBHOOK_SECRET`
   - Events: Push, Issues, Pull requests

### API Endpoints

Add to `backend/routes/github.js`:

```javascript
const { quickSyncAll, quickIncrementalSync, getSyncStatusTracker } = require('../../lib/github');

// Trigger sync
router.post('/sync', async (req, res) => {
  const { type = 'incremental' } = req.body;
  const result = type === 'full'
    ? await quickSyncAll(process.env.GITHUB_OWNER)
    : await quickIncrementalSync(process.env.GITHUB_OWNER);
  res.json(result);
});

// Get status
router.get('/status', async (req, res) => {
  const tracker = getSyncStatusTracker();
  const stats = await tracker.getSyncStats();
  res.json(stats);
});
```

### Frontend Integration

```typescript
// Trigger sync from frontend
const handleSync = async () => {
  const res = await fetch('/api/github/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'incremental' })
  });
  const result = await res.json();
  console.log('Synced:', result);
};
```

## Troubleshooting

### "Authentication failed"

Check your token:
```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### "Rate limit exceeded"

Wait for reset or reduce concurrency:
```typescript
await orchestrator.syncAllRepos({
  owner: 'username',
  concurrency: 2 // Lower from default 5
});
```

### "Module not found"

Install dependencies:
```bash
cd backend
npm install @octokit/rest @octokit/plugin-retry @octokit/plugin-throttling
```

## Documentation

- **Full API**: See [README.md](./README.md)
- **Installation**: See [INSTALLATION.md](./INSTALLATION.md)
- **Examples**: See [example.ts](./example.ts)
- **Summary**: See [GITHUB_SYNC_SYSTEM_SUMMARY.md](../../GITHUB_SYNC_SYSTEM_SUMMARY.md)

## Support

Questions? Check the documentation or review the example code.
