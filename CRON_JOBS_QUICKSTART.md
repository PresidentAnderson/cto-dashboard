# Cron Jobs Quick Start Guide

## 30-Second Overview

The CTO Dashboard now has 3 automated cron jobs:
- **Daily** (2am): Sync GitHub repos, calculate metrics, update health scores
- **Hourly** (every hour): Monitor revenue, check SLAs, send alerts
- **Weekly** (Monday 9am): Generate reports, email executives, archive data

## Setup in 5 Steps

### 1. Run Database Migration

```bash
npx prisma migrate dev --name add_cron_job_tables
npx prisma generate
```

### 2. Set Environment Variables

```bash
# Generate a secure secret
CRON_SECRET=$(openssl rand -base64 32)

# Add to .env.local
echo "CRON_SECRET=$CRON_SECRET" >> .env.local
echo "REPORT_EMAILS=your-email@company.com" >> .env.local
```

### 3. Test Locally

```bash
# Start your dev server
npm run dev

# In another terminal, test cron jobs
./test-cron-jobs.sh all
```

### 4. Deploy to Vercel

```bash
# Set environment variables in Vercel
vercel env add CRON_SECRET
vercel env add REPORT_EMAILS

# Deploy
vercel --prod
```

### 5. Verify in Vercel Dashboard

Go to: `vercel.com/[your-project]/settings/cron-jobs`

You should see 3 scheduled jobs with green status indicators.

## Test Individual Jobs

```bash
# Test daily job
curl -X POST http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test hourly job
curl -X POST http://localhost:3000/api/cron/hourly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test weekly job
curl -X POST http://localhost:3000/api/cron/weekly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitor Job Execution

**Check job history:**
```sql
SELECT * FROM job_history
ORDER BY started_at DESC
LIMIT 10;
```

**Check sync events:**
```sql
SELECT * FROM sync_events
WHERE status = 'failed'
ORDER BY timestamp DESC;
```

**Get job statistics:**
```typescript
import { jobScheduler } from './lib/scheduler'

const stats = await jobScheduler.getJobStats()
console.log(stats)
```

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check CRON_SECRET in .env.local |
| Jobs not running | Verify vercel.json and redeploy |
| Database errors | Run `npx prisma migrate deploy` |
| Timeout errors | Optimize queries, add indexes |

## File Locations

```
api/cron/
├── daily.js      - Daily sync job
├── hourly.js     - Hourly monitoring
└── weekly.js     - Weekly reports

lib/
├── scheduler.ts       - Job orchestration
├── cron-monitor.ts    - Monitoring & alerts
└── email-reports.ts   - Email generation
```

## Key Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
CRON_SECRET=your-secret-here

# Optional
REPORT_EMAILS=cto@company.com
RESEND_API_KEY=re_xxxxx  # For email reports
```

## What Each Job Does

### Daily Job (2am)
- ✅ Syncs all GitHub repositories
- ✅ Calculates health scores (0-100)
- ✅ Updates project metrics
- ✅ Cleans up old logs (>30 days)

### Hourly Job (Every Hour)
- ✅ Calculates revenue at risk
- ✅ Checks for SLA breaches
- ✅ Monitors critical bugs
- ✅ Sends alerts if needed

### Weekly Job (Monday 9am)
- ✅ Generates CTO report
- ✅ Emails to configured recipients
- ✅ Archives old data
- ✅ Health checks all projects

## Next Steps

1. ✅ **Set up email service** - Configure Resend or SendGrid
2. ✅ **Monitor first runs** - Check logs for any errors
3. ✅ **Customize alerts** - Adjust thresholds in code
4. ✅ **Add Slack webhooks** - Get real-time notifications
5. ✅ **Create dashboard** - Build UI for job monitoring

## Getting Help

- 📖 Full documentation: `CRON_JOBS_GUIDE.md`
- 📋 Implementation details: `CRON_JOBS_SUMMARY.md`
- 🧪 Testing script: `test-cron-jobs.sh`
- 💡 Environment template: `.env.cron.example`

## Advanced Usage

**Manually trigger a job:**
```bash
# Via Vercel CLI
vercel cron daily --yes

# Via API endpoint
curl -X POST https://your-domain.vercel.app/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Get job dashboard data:**
```typescript
import { cronMonitor } from './lib/cron-monitor'

const dashboard = await cronMonitor.getDashboardData()
// Returns: running jobs, recent failures, statistics, health status
```

**Check specific job history:**
```typescript
import { jobScheduler } from './lib/scheduler'

const dailyJobs = await jobScheduler.getJobHistory('daily_sync', 20)
```

---

**Need more details?** See `CRON_JOBS_GUIDE.md` for comprehensive documentation.
