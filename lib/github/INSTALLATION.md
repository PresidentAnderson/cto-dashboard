# GitHub Integration - Installation Guide

## 1. Install Dependencies

Add the following dependencies to your `backend/package.json`:

```bash
cd backend
npm install @octokit/rest@^20.0.2 @octokit/plugin-retry@^6.0.1 @octokit/plugin-throttling@^8.1.0
```

Or add manually to `package.json`:

```json
{
  "dependencies": {
    "@octokit/rest": "^20.0.2",
    "@octokit/plugin-retry": "^6.0.1",
    "@octokit/plugin-throttling": "^8.1.0"
  }
}
```

## 2. Environment Variables

Add to `.env.local`:

```bash
# GitHub Personal Access Token (required)
GITHUB_TOKEN=ghp_your_personal_access_token_here

# GitHub Webhook Secret (optional, for webhooks)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# GitHub Organization/User (required)
GITHUB_OWNER=your-github-username

# Database URL (already configured)
DATABASE_URL=postgresql://...
```

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "CTO Dashboard Sync"
4. Expiration: No expiration (or custom)
5. Select scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
   - `read:user` (Read user profile data)
6. Click "Generate token"
7. Copy token and add to `.env.local`

## 3. Update Database Schema

The GitHub integration uses existing tables (`projects`, `bugs`, `project_metrics`, `import_logs`).

No schema changes required if you're using the latest Prisma schema.

## 4. TypeScript Configuration

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

## 5. Test the Integration

Create a test script `scripts/test-github-sync.ts`:

```typescript
import { getGitHubClient, quickSyncAll } from '../lib/github';

async function test() {
  try {
    console.log('Testing GitHub authentication...');

    const client = getGitHubClient();
    const auth = await client.verifyAuth();

    if (!auth.authenticated) {
      throw new Error('Authentication failed: ' + auth.error);
    }

    console.log('✓ Authenticated as:', auth.user.login);

    // Test rate limit
    const rateLimit = await client.getRateLimit();
    console.log(`✓ Rate limit: ${rateLimit.core.remaining}/${rateLimit.core.limit}`);

    // Test listing repos (first 5)
    const owner = process.env.GITHUB_OWNER;
    if (!owner) {
      throw new Error('GITHUB_OWNER not set');
    }

    console.log(`\nFetching repositories for ${owner}...`);
    const repos = await client.listRepos(owner);
    console.log(`✓ Found ${repos.length} repositories`);

    repos.slice(0, 5).forEach(repo => {
      console.log(`  - ${repo.name} (${repo.stargazers_count} stars)`);
    });

    console.log('\n✓ GitHub integration is working correctly!');

  } catch (error) {
    console.error('✗ Test failed:', error);
    process.exit(1);
  }
}

test();
```

Run the test:

```bash
npx tsx scripts/test-github-sync.ts
```

## 6. Setup API Endpoints

### Option A: Express API (Backend)

Create `backend/routes/github.js`:

```javascript
const express = require('express');
const router = express.Router();
const { quickSyncAll, quickIncrementalSync, getSyncStatusTracker, createWebhookMiddleware } = require('../../lib/github');

// Trigger full sync
router.post('/sync/full', async (req, res) => {
  try {
    const owner = process.env.GITHUB_OWNER;
    const result = await quickSyncAll(owner);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger incremental sync
router.post('/sync/incremental', async (req, res) => {
  try {
    const owner = process.env.GITHUB_OWNER;
    const result = await quickIncrementalSync(owner);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
router.get('/sync/status', async (req, res) => {
  try {
    const tracker = getSyncStatusTracker();
    const current = tracker.getCurrentSync();
    const stats = await tracker.getSyncStats();
    res.json({ current, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
router.post('/webhook', createWebhookMiddleware());

module.exports = router;
```

Add to `backend/server.js`:

```javascript
const githubRoutes = require('./routes/github');
app.use('/api/github', githubRoutes);
```

### Option B: Next.js API Routes (Frontend)

Create `frontend/pages/api/github/sync.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { quickSyncAll, quickIncrementalSync } from '@/lib/github';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type = 'incremental' } = req.body;
    const owner = process.env.GITHUB_OWNER!;

    const result = type === 'full'
      ? await quickSyncAll(owner)
      : await quickIncrementalSync(owner);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 7. Setup Webhooks (Optional)

For real-time updates, configure GitHub webhooks:

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Payload URL: `https://your-domain.com/api/github/webhook`
3. Content type: `application/json`
4. Secret: (the value from `GITHUB_WEBHOOK_SECRET`)
5. Events:
   - Push events
   - Issues
   - Pull requests
   - Repositories
6. Active: ✓
7. Click "Add webhook"

Test webhook:

```bash
curl -X POST https://your-domain.com/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"zen": "Test webhook"}'
```

## 8. Setup Cron Job (Optional)

For scheduled syncs, add to `backend/server.js`:

```javascript
const cron = require('node-cron');
const { quickIncrementalSync } = require('../lib/github');

// Run incremental sync daily at 2am
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled GitHub sync...');
  try {
    const owner = process.env.GITHUB_OWNER;
    const result = await quickIncrementalSync(owner);
    console.log('Sync completed:', result);
  } catch (error) {
    console.error('Sync failed:', error);
  }
});
```

Install cron:

```bash
npm install node-cron
```

## 9. Frontend Integration

Example React component for triggering sync:

```typescript
'use client';

import { useState } from 'react';

export default function GitHubSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const handleSync = async (type: 'full' | 'incremental') => {
    setSyncing(true);
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => handleSync('incremental')}
        disabled={syncing}
      >
        {syncing ? 'Syncing...' : 'Incremental Sync'}
      </button>

      <button
        onClick={() => handleSync('full')}
        disabled={syncing}
      >
        {syncing ? 'Syncing...' : 'Full Sync'}
      </button>

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
```

## 10. Monitoring & Logs

View sync logs in Prisma Studio:

```bash
cd backend
npx prisma studio
```

Or query directly:

```typescript
import { prisma } from '@/lib/prisma';

const logs = await prisma.importLog.findMany({
  where: { source: 'github' },
  orderBy: { timestamp: 'desc' },
  take: 10,
});
```

## Troubleshooting

### Issue: "Authentication failed"

**Solution**: Verify your GitHub token:

```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Issue: "Rate limit exceeded"

**Solution**: Wait for rate limit reset or reduce concurrency:

```typescript
const result = await orchestrator.syncAllRepos({
  owner: 'username',
  concurrency: 2, // Reduce from default 5
});
```

### Issue: "Webhook signature verification failed"

**Solution**: Ensure webhook secret matches:

1. Check `.env.local`: `GITHUB_WEBHOOK_SECRET=...`
2. Check GitHub webhook settings: Secret field
3. Verify they match exactly

### Issue: "Module not found: @octokit/rest"

**Solution**: Install dependencies:

```bash
cd backend
npm install @octokit/rest @octokit/plugin-retry @octokit/plugin-throttling
```

## Next Steps

1. ✓ Install dependencies
2. ✓ Configure environment variables
3. ✓ Test authentication
4. ✓ Run initial full sync
5. ✓ Setup webhooks (optional)
6. ✓ Setup cron job (optional)
7. ✓ Monitor sync logs

For detailed API documentation, see [README.md](./README.md).
