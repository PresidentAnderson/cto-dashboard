# Data Ingestion Pipeline - Quick Start Guide

Get up and running with the data ingestion pipeline in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- GitHub personal access token (for GitHub sync)

## Step 1: Install Dependencies (2 minutes)

```bash
cd backend

# Install all required packages
npm install @octokit/rest @octokit/plugin-throttling papaparse zod p-queue winston multer uuid

# Install TypeScript types
npm install --save-dev @types/papaparse @types/multer @types/uuid
```

## Step 2: Configure Environment (1 minute)

Add to your `.env.local`:

```bash
# Database (should already exist)
DATABASE_URL=postgresql://user:password@localhost:5432/cto_dashboard

# GitHub Token (get from https://github.com/settings/tokens)
# Scopes needed: repo, read:org
GITHUB_TOKEN=ghp_your_token_here

# Optional: GitHub organization name
GITHUB_OWNER=your-org-name

# Pipeline Configuration (optional)
PIPELINE_CONCURRENCY=3
MAX_JOB_RETRIES=3
LOG_LEVEL=info
```

## Step 3: Create Log Directory (10 seconds)

```bash
mkdir -p backend/logs
```

## Step 4: Update Server Routes (2 minutes)

Add to your `backend/server.js` (or `server.ts`):

```javascript
// Import routes
import csvRoutes from './routes/api/ingest/csv';
import githubRoutes from './routes/api/github-sync';
import pipelineRoutes from './routes/api/pipeline';
import manualRoutes from './routes/api/manual-entry';

// Register routes
app.use('/api/ingest/csv', csvRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/manual', manualRoutes);
```

## Step 5: Start Server (10 seconds)

```bash
npm run dev
# or
npm start
```

Server should start on `http://localhost:3001` (or your configured port).

## Step 6: Test CSV Upload (2 minutes)

```bash
# Upload sample projects
curl -X POST http://localhost:3001/api/ingest/csv \
  -F "file=@sample-data/projects-template.csv" \
  -F "type=projects"

# Response:
# {
#   "message": "CSV ingestion started",
#   "jobId": "uuid",
#   "totalRecords": 5
# }

# Check progress
curl http://localhost:3001/api/ingest/csv/progress/{jobId}
```

## Step 7: Test GitHub Sync (2 minutes)

```bash
# Start GitHub sync
curl -X POST http://localhost:3001/api/github/sync \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ghp_your_token_here",
    "incremental": false,
    "useQueue": true
  }'

# Response:
# {
#   "success": true,
#   "jobId": "uuid",
#   "message": "GitHub sync job queued"
# }

# Check job status
curl http://localhost:3001/api/pipeline/jobs/{jobId}
```

## Step 8: Test Manual Entry (1 minute)

```bash
# Create a bug manually
curl -X POST http://localhost:3001/api/manual/bugs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: your-user-id" \
  -d '{
    "title": "Test Bug",
    "severity": "high",
    "status": "pending",
    "slaHours": 24,
    "priorityScore": 75
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "uuid",
#     "bugNumber": "BUG-202511-0001"
#   }
# }
```

## Step 9: Monitor Pipeline (1 minute)

```bash
# Get pipeline statistics
curl http://localhost:3001/api/pipeline/stats

# Response:
# {
#   "success": true,
#   "stats": {
#     "totalJobs": 2,
#     "queuedJobs": 0,
#     "processingJobs": 1,
#     "completedJobs": 1,
#     "failedJobs": 0,
#     "avgDuration": 5432,
#     "successRate": 100
#   }
# }

# View all jobs
curl http://localhost:3001/api/pipeline/jobs

# View logs
tail -f backend/logs/combined.log
```

## Step 10: Verify Database (1 minute)

```bash
# Check imported projects
npx prisma studio

# Or use SQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM projects;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM bugs;"
psql $DATABASE_URL -c "SELECT * FROM import_logs ORDER BY timestamp DESC LIMIT 5;"
```

## Common Use Cases

### Import 180 Repositories from CSV

```bash
# 1. Prepare your CSV file (use projects-template.csv as guide)
# 2. Upload
curl -X POST http://localhost:3001/api/ingest/csv \
  -F "file=@your-repos.csv" \
  -F "type=projects"

# 3. Monitor progress
watch -n 2 'curl -s http://localhost:3001/api/ingest/csv/progress/{jobId} | jq'
```

### Sync All GitHub Repositories

```bash
# Full sync (first time)
curl -X POST http://localhost:3001/api/github/sync \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ghp_...",
    "owner": "your-org",
    "incremental": false,
    "syncRepos": true,
    "syncIssues": true,
    "useQueue": true
  }'

# Incremental sync (daily updates)
curl -X POST http://localhost:3001/api/github/sync \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ghp_...",
    "owner": "your-org",
    "incremental": true,
    "useQueue": true
  }'
```

### Batch Create Bugs

```bash
curl -X POST http://localhost:3001/api/manual/bugs/batch \
  -H "Content-Type: application/json" \
  -H "X-User-Id: your-user-id" \
  -d '{
    "bugs": [
      {
        "title": "Bug 1",
        "severity": "high",
        "slaHours": 24
      },
      {
        "title": "Bug 2",
        "severity": "medium",
        "slaHours": 72
      }
    ]
  }'
```

### Log Engineering Hours

```bash
curl -X POST http://localhost:3001/api/manual/hours \
  -H "Content-Type: application/json" \
  -H "X-User-Id: your-user-id" \
  -d '{
    "bugId": "bug-uuid",
    "hours": 4.5,
    "notes": "Fixed authentication issue"
  }'
```

## Troubleshooting

### Issue: CSV upload fails

**Check**:
```bash
# Verify file format
head -n 2 your-file.csv

# Check file size
ls -lh your-file.csv

# View error logs
tail -n 50 backend/logs/error.log
```

### Issue: GitHub sync rate limited

**Check rate limit**:
```bash
curl http://localhost:3001/api/github/rate-limit \
  -H "Authorization: Bearer ghp_your_token"
```

**Solution**: Wait for reset time or use incremental sync.

### Issue: Jobs stuck in queue

**Check pipeline**:
```bash
# View all jobs
curl http://localhost:3001/api/pipeline/jobs

# View failed jobs
curl http://localhost:3001/api/pipeline/dlq

# Retry failed jobs
curl -X POST http://localhost:3001/api/pipeline/dlq/retry

# Pause pipeline
curl -X POST http://localhost:3001/api/pipeline/pause

# Resume pipeline
curl -X POST http://localhost:3001/api/pipeline/resume
```

### Issue: Module not found

**Reinstall dependencies**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors

**Check TypeScript config**:
```bash
npx tsc --noEmit
```

## Next Steps

1. **Read Full Documentation**: `DATA_INGESTION_PIPELINE_GUIDE.md`
2. **Review Architecture**: `DATA_INGESTION_PIPELINE_SUMMARY.md`
3. **Install Dependencies**: `INGESTION_PIPELINE_DEPENDENCIES.md`
4. **Set Up Monitoring**: Configure log aggregation and alerts
5. **Schedule Sync**: Set up cron jobs for daily GitHub sync
6. **Test at Scale**: Import your full dataset (180+ repos)

## API Endpoint Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ingest/csv` | POST | Upload CSV file |
| `/api/ingest/csv/progress/:id` | GET | Check progress |
| `/api/ingest/csv/history` | GET | View history |
| `/api/github/sync` | POST | Trigger sync |
| `/api/github/sync-repo` | POST | Sync one repo |
| `/api/github/rate-limit` | GET | Check rate limit |
| `/api/pipeline/stats` | GET | Pipeline stats |
| `/api/pipeline/jobs` | GET | List all jobs |
| `/api/pipeline/jobs/:id` | GET | Get job status |
| `/api/pipeline/dlq` | GET | Failed jobs |
| `/api/manual/bugs` | POST | Create bug |
| `/api/manual/projects` | POST | Create project |
| `/api/manual/hours` | POST | Log hours |

## Performance Tips

1. **CSV Import**: Use batch size of 50 (default) for optimal performance
2. **GitHub Sync**: Use incremental sync for daily updates (10x faster)
3. **Concurrency**: Increase to 5 for faster processing (set in .env)
4. **Cleanup**: Run pipeline cleanup weekly to free memory

## Support

- **Logs**: `tail -f backend/logs/combined.log`
- **Database**: `npx prisma studio`
- **API Docs**: See `DATA_INGESTION_PIPELINE_GUIDE.md`
- **Issues**: Check `backend/logs/error.log`

---

**You're all set!** The data ingestion pipeline is now ready to handle CSV imports, GitHub sync, and manual data entry.
