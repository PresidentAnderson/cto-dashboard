# Cron Jobs System - CTO Dashboard v2.0

Complete automated background task system for syncing, metrics, and reporting using Vercel Cron.

## Overview

The CTO Dashboard includes three automated cron jobs that handle data synchronization, metric calculations, and weekly reporting:

- **Daily Job**: Syncs GitHub repos, calculates metrics, updates health scores
- **Hourly Job**: Monitors revenue at risk, SLA breaches, and sends alerts
- **Weekly Job**: Generates and emails executive reports, archives old data

## Architecture

### Components

```
/api/cron/
├── daily.js      - Daily sync and metrics (2am)
├── hourly.js     - Monitoring and alerts (every hour)
└── weekly.js     - Reports and archival (Monday 9am)

/lib/
├── scheduler.ts        - Job queue and retry logic
├── cron-monitor.ts     - Monitoring and alerting
└── email-reports.ts    - Email report generation

/prisma/schema.prisma
├── JobHistory     - Track job executions
├── SyncEvent      - Log sync activities
└── New enums      - JobType, JobStatus
```

## Cron Schedules

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/hourly",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/weekly",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Schedule Breakdown

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily | `0 2 * * *` | Every day at 2:00 AM |
| Hourly | `0 * * * *` | Every hour at :00 |
| Weekly | `0 9 * * 1` | Every Monday at 9:00 AM |

## Daily Job (`/api/cron/daily`)

**Schedule**: 2am daily

### Tasks

1. **GitHub Repository Sync**
   - Fetch latest commits from all active projects
   - Update repository metadata (stars, forks, last commit)
   - Pull issues and PRs data
   - Log sync events

2. **Daily Metrics Calculation**
   - Calculate project health scores
   - Update bug counts and severity distribution
   - Record daily snapshots in `project_metrics`
   - Track engineering velocity

3. **Project Health Score Updates**
   - Evaluate health based on:
     - Open bug count (-2 points per bug)
     - Critical bugs (-10 points per critical)
     - Recent activity
     - Milestone progress
   - Store in `project_metrics` table

4. **Cleanup Old Logs**
   - Remove sync events older than 30 days
   - Keep failed events for debugging
   - Archive old import logs
   - Maintain database performance

### Example Response

```json
{
  "success": true,
  "jobId": "uuid-here",
  "timestamp": "2025-11-24T02:00:00.000Z",
  "result": {
    "success": true,
    "duration": 45230,
    "results": {
      "githubSync": {
        "success": true,
        "recordsProcessed": 25,
        "errors": []
      },
      "metricsCalculation": {
        "success": true,
        "recordsProcessed": 25,
        "errors": []
      },
      "healthScores": {
        "success": true,
        "recordsProcessed": 25,
        "errors": []
      },
      "cleanup": {
        "success": true,
        "recordsProcessed": 342,
        "errors": []
      }
    }
  }
}
```

## Hourly Job (`/api/cron/hourly`)

**Schedule**: Every hour

### Tasks

1. **Recalculate Revenue at Risk**
   - Sum daily revenue impact from open bugs
   - Track by severity level
   - Alert if threshold exceeded ($10k+/day)

2. **Update Engineering Velocity**
   - Count bugs resolved in last 7 days
   - Calculate average resolution time
   - Track velocity trends

3. **Check for SLA Breaches**
   - Compare bug age vs. SLA hours
   - Identify overdue bugs
   - Calculate breach duration
   - Flag critical breaches

4. **Send Alerts**
   - Unassigned critical bugs
   - SLA breaches on critical bugs
   - High revenue at risk (>$10k/day)
   - Log all alerts to sync_events

### Alert Thresholds

```javascript
{
  unassignedCritical: 1+,      // Any unassigned critical bug
  slaBreaches: 1+ critical,     // Critical bugs past SLA
  revenueAtRisk: $10,000+/day  // High revenue impact
}
```

### Example Response

```json
{
  "success": true,
  "jobId": "uuid-here",
  "result": {
    "revenueAtRisk": {
      "success": true,
      "value": 15420.50
    },
    "engineeringVelocity": {
      "success": true,
      "value": 12
    },
    "slaBreaches": {
      "success": true,
      "breaches": [
        {
          "bugNumber": "BUG-001",
          "breachHours": 8,
          "severity": "critical"
        }
      ]
    },
    "alerts": {
      "success": true,
      "alertsSent": 2
    }
  }
}
```

## Weekly Job (`/api/cron/weekly`)

**Schedule**: Monday 9am

### Tasks

1. **Generate CTO Report**
   - Executive summary of all metrics
   - Top projects by health score
   - Critical bugs requiring attention
   - Engineering velocity trends
   - Revenue at risk summary

2. **Email to Recipients**
   - HTML formatted report
   - Responsive design
   - Key metrics highlighted
   - Action items flagged
   - Configure via `REPORT_EMAILS` env var

3. **Archive Old Data**
   - Keep last 10,000 sync events
   - Keep last 1,000 job history records
   - Remove import logs >90 days old
   - Optimize database size

4. **Health Check All Projects**
   - Scan all projects for issues
   - Categorize: healthy/warning/critical
   - Log detailed health report
   - Track trends over time

### Example Report Data

```json
{
  "period": {
    "start": "2025-11-17",
    "end": "2025-11-24"
  },
  "summary": {
    "activeProjects": 25,
    "totalBugs": 47,
    "criticalBugs": 3,
    "bugsResolved": 12,
    "avgResolutionTime": 4.5,
    "revenueAtRisk": 15420.50
  },
  "topProjects": [...],
  "criticalBugs": [...],
  "healthCheck": {
    "healthy": 18,
    "warning": 5,
    "critical": 2
  }
}
```

## Security

### Cron Secret Protection

All cron routes are protected by `CRON_SECRET` environment variable:

```javascript
// Request must include Authorization header
Authorization: Bearer YOUR_CRON_SECRET
```

Vercel automatically includes this header when triggering cron jobs.

### Environment Variables

```bash
# Required
CRON_SECRET=your-secret-key-here
DATABASE_URL=postgresql://...

# Optional
REPORT_EMAILS=cto@company.com,engineering@company.com
EMAIL_FROM=cto-dashboard@company.com
```

## Database Schema

### JobHistory Table

Tracks all job executions with retry logic:

```typescript
model JobHistory {
  id              String    @id
  jobType         JobType   // daily_sync, hourly_metrics, weekly_report
  status          JobStatus // pending, running, completed, failed, timeout
  startedAt       DateTime
  completedAt     DateTime?
  executionTimeMs Int?
  attempt         Int       // Current attempt (1-3)
  maxAttempts     Int       // Maximum retry attempts
  errorMessage    String?
  result          Json?
  triggeredBy     String?   // vercel-cron, manual, etc.
}
```

### SyncEvent Table

Logs all sync activities and alerts:

```typescript
model SyncEvent {
  id               String   @id
  jobId            String?  // Links to JobHistory
  eventType        String   // github_sync, metrics_calculation, alert, etc.
  status           String   // started, success, failed, warning
  message          String?
  details          Json?
  duration         Int?
  recordsProcessed Int?
  recordsFailed    Int?
  timestamp        DateTime
}
```

## Job Scheduler Library

Advanced job management with retry logic:

```typescript
import { jobScheduler } from './lib/scheduler'

// Execute a job with automatic retry
const result = await jobScheduler.executeJob(
  'daily_sync',
  async (context) => {
    // Your job logic here
    return {
      success: true,
      recordsProcessed: 10,
    }
  },
  'manual-trigger'
)

// Get job history
const history = await jobScheduler.getJobHistory('daily_sync', 50)

// Get job statistics
const stats = await jobScheduler.getJobStats()
```

### Features

- **Concurrent Job Limits**: Max 5 jobs running simultaneously
- **Timeout Protection**: 9-minute timeout (Vercel limit is 10)
- **Retry Logic**: 3 attempts with exponential backoff
- **Stuck Job Detection**: Auto-timeout stuck jobs
- **Idempotent Execution**: Safe to run multiple times

## Monitoring Dashboard

### Get Job Status

```typescript
import { cronMonitor } from './lib/cron-monitor'

// Get dashboard data
const dashboard = await cronMonitor.getDashboardData()

// Get health metrics
const health = await cronMonitor.getHealthMetrics()

// Get recent events
const events = await cronMonitor.getRecentEvents(100)
```

### Dashboard Data Structure

```json
{
  "summary": {
    "runningJobs": 1,
    "recentFailures": 0,
    "slowJobs": 2,
    "healthStatus": "healthy"
  },
  "recentJobs": [...],
  "statistics": [...],
  "runningJobs": [...],
  "recentFailures": [...],
  "slowJobs": [...]
}
```

## Email Reports

### Configuration

```bash
# Email recipients (comma-separated)
REPORT_EMAILS=cto@company.com,engineering@company.com

# Sender address
EMAIL_FROM=cto-dashboard@company.com

# Email service API key (Resend, SendGrid, etc.)
RESEND_API_KEY=re_xxxxx
```

### Integration Options

1. **Resend** (Recommended)
   ```javascript
   const { Resend } = require('resend')
   const resend = new Resend(process.env.RESEND_API_KEY)

   await resend.emails.send({
     from: 'CTO Dashboard <cto-dashboard@company.com>',
     to: recipients,
     subject: 'Weekly CTO Report',
     html: emailHTML,
   })
   ```

2. **SendGrid**
   ```javascript
   const sgMail = require('@sendgrid/mail')
   sgMail.setApiKey(process.env.SENDGRID_API_KEY)

   await sgMail.send({
     to: recipients,
     from: 'cto-dashboard@company.com',
     subject: 'Weekly CTO Report',
     html: emailHTML,
   })
   ```

## Testing Cron Jobs Locally

### Manual Trigger Script

```bash
#!/bin/bash
# test-cron.sh

CRON_SECRET="your-secret-here"

# Test daily job
curl -X POST http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"

# Test hourly job
curl -X POST http://localhost:3000/api/cron/hourly \
  -H "Authorization: Bearer $CRON_SECRET"

# Test weekly job
curl -X POST http://localhost:3000/api/cron/weekly \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Testing in Production

```bash
# Trigger via Vercel CLI
vercel cron daily --yes
vercel cron hourly --yes
vercel cron weekly --yes

# Or via API
curl -X POST https://your-domain.vercel.app/api/cron/daily \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Troubleshooting

### Common Issues

**1. Jobs Not Running**
- Check `vercel.json` cron configuration
- Verify deployment includes cron jobs
- Check Vercel dashboard > Cron Jobs tab

**2. Authentication Failures**
- Ensure `CRON_SECRET` is set in environment
- Verify Authorization header format
- Check Vercel environment variables

**3. Timeout Errors**
- Jobs must complete within 10 minutes
- Optimize database queries
- Consider breaking into smaller tasks

**4. Database Connection Issues**
- Check `DATABASE_URL` configuration
- Verify Prisma client generation
- Monitor connection pool limits

### Debugging

```javascript
// Enable detailed logging
console.log('[Cron Job] Starting...')
console.log('[Cron Job] Processing item:', item)
console.log('[Cron Job] Completed in', duration, 'ms')

// Check job history
SELECT * FROM job_history
ORDER BY started_at DESC
LIMIT 10;

// Check sync events
SELECT * FROM sync_events
WHERE status = 'failed'
ORDER BY timestamp DESC;
```

## Performance Optimization

### Database Queries

```typescript
// Use select to limit data
const projects = await prisma.project.findMany({
  select: { id: true, name: true },
  where: { status: 'active' },
})

// Use take to limit results
const recentBugs = await prisma.bug.findMany({
  take: 100,
  orderBy: { createdAt: 'desc' },
})

// Use indexes for filtering
@@index([status, severity])
@@index([createdAt(sort: Desc)])
```

### Concurrent Operations

```typescript
// Use Promise.all for parallel operations
const [projects, bugs, metrics] = await Promise.all([
  prisma.project.findMany(),
  prisma.bug.findMany(),
  prisma.projectMetric.findMany(),
])
```

## Monitoring and Alerts

### Key Metrics to Track

- **Job Execution Time**: Alert if >8 minutes
- **Job Success Rate**: Alert if <95%
- **Consecutive Failures**: Alert after 3 failures
- **SLA Breaches**: Immediate alert for critical
- **Revenue at Risk**: Alert if >$10k/day

### Alert Channels

- Database logging (sync_events)
- Console output (Vercel logs)
- Email notifications (TODO: implement)
- Slack webhooks (TODO: implement)

## Migration Guide

### Adding New Cron Jobs

1. Create new route in `/api/cron/your-job.js`
2. Add schedule to `vercel.json`
3. Update Prisma schema with new JobType enum
4. Run migration: `npx prisma migrate dev`
5. Deploy to Vercel

### Modifying Existing Jobs

1. Update job logic in route file
2. Test locally with manual trigger
3. Deploy changes
4. Monitor job execution in dashboard

## Best Practices

1. **Idempotency**: Jobs should be safe to run multiple times
2. **Timeouts**: Keep jobs under 8 minutes (buffer for 10min limit)
3. **Error Handling**: Log all errors with context
4. **Progress Logging**: Log major steps for debugging
5. **Database Cleanup**: Regularly archive old data
6. **Monitoring**: Track job metrics and set up alerts
7. **Testing**: Test jobs locally before deploying
8. **Documentation**: Keep this guide updated with changes

## Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Prisma Client Documentation](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Node.js Scheduling](https://nodejs.org/api/timers.html)

## Support

For issues or questions:
1. Check Vercel logs for error messages
2. Review job_history table for failure details
3. Check sync_events for detailed execution logs
4. Contact the development team

---

**Last Updated**: November 24, 2025
**Version**: 2.0
