# Data Ingestion Pipeline Layer - Complete Guide

## Overview

The Data Ingestion Pipeline Layer provides a robust, scalable system for importing data from multiple sources:

- **CSV Import**: Bulk upload of projects and bugs from CSV files
- **GitHub Sync**: Automated synchronization with GitHub repositories
- **Manual Entry**: Direct data entry through validated forms
- **Pipeline Orchestration**: Job queue management with retry logic

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
├──────────────┬──────────────────┬──────────────────────────┤
│   CSV Files  │   GitHub API     │   Manual Entry Forms     │
└──────┬───────┴────────┬─────────┴──────────┬───────────────┘
       │                │                    │
       ▼                ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│              Validation Layer (Zod)                          │
│  • ProjectCSVSchema    • GitHubRepoSchema                    │
│  • BugCSVSchema        • ManualEntrySchemas                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│           Pipeline Orchestrator (p-queue)                     │
│  • Job Queue Management   • Priority Scheduling              │
│  • Retry Logic           • Concurrency Control               │
│  • Dead Letter Queue     • Progress Tracking                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Data Processing Layer                            │
│  • CSV Parser (papaparse)    • GitHub Sync Engine            │
│  • Batch Processing          • Rate Limiting                 │
│  • Deduplication            • Data Normalization             │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         Database Layer (Prisma + PostgreSQL)                  │
│  • projects    • bugs    • import_logs    • audit_log       │
└──────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. CSV Ingestion System

**Location**: `/backend/routes/api/ingest/csv.ts`

**Features**:
- ✅ Multi-format support (projects, bugs)
- ✅ Batch processing (50 records at a time)
- ✅ Streaming parser for large files
- ✅ Real-time progress tracking
- ✅ Deduplication logic
- ✅ Detailed error reporting
- ✅ Transaction support

**API Endpoints**:

```bash
# Upload CSV file
POST /api/ingest/csv
Content-Type: multipart/form-data

Body:
- file: CSV file
- type: "projects" | "bugs"

Response:
{
  "message": "CSV ingestion started",
  "jobId": "uuid",
  "totalRecords": 180
}

# Check progress
GET /api/ingest/csv/progress/:jobId

Response:
{
  "jobId": "uuid",
  "totalRecords": 180,
  "processedRecords": 50,
  "successfulRecords": 48,
  "failedRecords": 2,
  "duplicateRecords": 5,
  "status": "processing",
  "errors": [...]
}

# Get import history
GET /api/ingest/csv/history?limit=10&offset=0
```

**CSV Format Examples**:

Projects CSV:
```csv
name,description,githubUrl,language,stars,forks,status,complexity,clientAppeal
MyProject,A great project,https://github.com/user/repo,TypeScript,100,20,active,7,8
```

Bugs CSV:
```csv
bugNumber,title,severity,status,slaHours,projectName,assignedTo,revenueImpact
BUG-001,Login fails,critical,pending,4,MyProject,dev@example.com,500
```

### 2. GitHub Sync Engine

**Location**: `/lib/github-sync.ts`

**Features**:
- ✅ OAuth token authentication
- ✅ Rate limiting (5000/hour with token)
- ✅ Automatic pagination
- ✅ Incremental sync support
- ✅ Multi-repository sync
- ✅ Issue → Bug conversion
- ✅ PR tracking
- ✅ Commit statistics

**API Endpoints**:

```bash
# Full sync (all repos)
POST /api/github/sync
Content-Type: application/json

Body:
{
  "token": "ghp_...",
  "owner": "your-org-name",  // optional
  "incremental": false,
  "syncRepos": true,
  "syncIssues": true,
  "useQueue": true
}

Response:
{
  "success": true,
  "jobId": "uuid",
  "message": "GitHub sync job queued"
}

# Sync specific repository
POST /api/github/sync-repo

Body:
{
  "token": "ghp_...",
  "owner": "user",
  "repo": "repository-name"
}

# Check rate limit
GET /api/github/rate-limit
Authorization: Bearer ghp_...

Response:
{
  "success": true,
  "rateLimit": {
    "limit": 5000,
    "remaining": 4850,
    "reset": "2025-11-24T12:00:00Z",
    "used": 150
  }
}
```

**Configuration**:

```typescript
// Incremental Sync (only updated repos)
const result = await syncGitHub(token, {
  owner: 'my-org',
  incremental: true,
  syncRepos: true,
  syncIssues: true
});

// Full Sync (all repos)
const result = await syncGitHub(token, {
  owner: 'my-org',
  incremental: false
});
```

### 3. Manual Entry System

**Location**: `/backend/actions/manual-entry.ts`

**Features**:
- ✅ Type-safe input validation
- ✅ Auto-generated bug numbers
- ✅ Audit logging
- ✅ Transaction support
- ✅ Engineering hours tracking
- ✅ Batch operations

**API Endpoints**:

```bash
# Create bug
POST /api/manual/bugs
Content-Type: application/json
X-User-Id: <uuid>

Body:
{
  "title": "Login button not working",
  "description": "Users cannot click the login button",
  "severity": "high",
  "status": "pending",
  "slaHours": 24,
  "projectId": "uuid",
  "estimatedHours": 8,
  "isBlocker": false,
  "priorityScore": 75
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "bugNumber": "BUG-202511-0042"
  }
}

# Update bug
PUT /api/manual/bugs/:bugId
X-User-Id: <uuid>

Body:
{
  "status": "in_progress",
  "assignedToId": "uuid"
}

# Create project
POST /api/manual/projects
X-User-Id: <uuid>

Body:
{
  "name": "New Project",
  "description": "Project description",
  "githubUrl": "https://github.com/user/repo",
  "language": "TypeScript",
  "tags": ["web", "api"],
  "status": "active",
  "complexity": 7,
  "clientAppeal": 8,
  "totalMilestones": 5
}

# Log engineering hours
POST /api/manual/hours
X-User-Id: <uuid>

Body:
{
  "bugId": "uuid",
  "hours": 4.5,
  "notes": "Fixed authentication issue"
}

# Batch create bugs
POST /api/manual/bugs/batch
X-User-Id: <uuid>

Body:
{
  "bugs": [
    { "title": "Bug 1", "severity": "high", ... },
    { "title": "Bug 2", "severity": "medium", ... }
  ]
}
```

### 4. Pipeline Orchestrator

**Location**: `/lib/pipeline-orchestrator.ts`

**Features**:
- ✅ Priority-based job queue
- ✅ Concurrent job execution (configurable)
- ✅ Automatic retry with exponential backoff
- ✅ Dead letter queue for failed jobs
- ✅ Real-time job tracking
- ✅ Performance statistics

**API Endpoints**:

```bash
# Get pipeline statistics
GET /api/pipeline/stats

Response:
{
  "success": true,
  "stats": {
    "totalJobs": 25,
    "queuedJobs": 3,
    "processingJobs": 2,
    "completedJobs": 18,
    "failedJobs": 2,
    "avgDuration": 5432,
    "successRate": 90
  }
}

# Get all jobs (with filtering)
GET /api/pipeline/jobs?status=processing&type=github_sync

Response:
{
  "success": true,
  "jobs": [...],
  "total": 5
}

# Get specific job
GET /api/pipeline/jobs/:jobId

# Add job to pipeline
POST /api/pipeline/jobs

Body:
{
  "type": "github_sync",
  "payload": { "token": "...", "owner": "..." },
  "priority": "high",
  "source": "github",
  "maxRetries": 3
}

# Pause pipeline
POST /api/pipeline/pause

# Resume pipeline
POST /api/pipeline/resume

# Get dead letter queue
GET /api/pipeline/dlq

# Retry failed jobs
POST /api/pipeline/dlq/retry

# Clean up old jobs
POST /api/pipeline/cleanup
Body: { "daysOld": 7 }
```

**Job Priority Levels**:
- **critical**: Immediate processing (priority 10)
- **high**: Fast processing (priority 5)
- **normal**: Standard processing (priority 0)
- **low**: Background processing (priority -5)

## Error Handling Strategy

### 1. Validation Errors

```typescript
// All input is validated with Zod schemas
const result = ManualBugEntrySchema.safeParse(input);
if (!result.success) {
  return {
    success: false,
    validationErrors: result.error.errors.map(e =>
      `${e.path.join('.')}: ${e.message}`
    )
  };
}
```

### 2. Transactional Operations

```typescript
// All database operations use transactions
const bug = await prisma.$transaction(async (tx) => {
  const newBug = await tx.bug.create({ data });
  await tx.auditLog.create({ data: auditData });
  await tx.importLog.create({ data: logData });
  return newBug;
});
```

### 3. Retry Logic

```typescript
// Exponential backoff: 2^retryCount seconds
const delayMs = Math.pow(2, job.retryCount) * 1000;

// Retry 1: 2 seconds
// Retry 2: 4 seconds
// Retry 3: 8 seconds
```

### 4. Dead Letter Queue

Failed jobs after max retries are moved to DLQ:

```typescript
// Jobs can be retried from DLQ
await orchestrator.retryDeadLetterQueue();
```

### 5. Comprehensive Logging

```typescript
// Context-aware logging
loggers.csvIngestion('Processing batch 1/4', { jobId, batchSize: 50 });
loggers.githubSync('Rate limit: 4850/5000');
loggers.error('Pipeline', error, { jobId, type: 'github_sync' });
```

## Database Schema Integration

### Import Logs Table

```prisma
model ImportLog {
  id                String       @id @default(uuid())
  source            ImportSource // csv, github, manual
  recordsImported   Int
  recordsFailed     Int
  errors            String[]
  metadata          Json?
  timestamp         DateTime     @default(now())
}
```

### Audit Log Table

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  action      String   // bug_created, project_updated, etc.
  entityType  String?
  entityId    String?
  details     Json?
  createdAt   DateTime @default(now())
}
```

## Testing Recommendations

### 1. Unit Tests

```typescript
// Test validation schemas
describe('ProjectCSVSchema', () => {
  it('should validate valid project data', () => {
    const result = ProjectCSVSchema.safeParse({
      name: 'Test Project',
      status: 'active',
      // ...
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const result = ProjectCSVSchema.safeParse({
      name: '', // Invalid: empty name
    });
    expect(result.success).toBe(false);
  });
});
```

### 2. Integration Tests

```typescript
// Test CSV ingestion
describe('CSV Ingestion', () => {
  it('should process valid CSV file', async () => {
    const response = await request(app)
      .post('/api/ingest/csv')
      .attach('file', 'test-data.csv')
      .field('type', 'projects');

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('jobId');
  });
});
```

### 3. Load Tests

```typescript
// Test batch processing
describe('Batch Processing', () => {
  it('should handle 180 records efficiently', async () => {
    const records = generateTestRecords(180);
    const startTime = Date.now();

    await ingestProjects(records, jobId);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000); // 30 seconds
  });
});
```

### 4. GitHub Sync Tests

```typescript
// Test GitHub sync with mock data
describe('GitHub Sync', () => {
  it('should sync repositories', async () => {
    const engine = new GitHubSyncEngine(mockToken);
    const result = await engine.syncRepositories();

    expect(result.total).toBeGreaterThan(0);
    expect(result.failed).toBe(0);
  });
});
```

### 5. Pipeline Tests

```typescript
// Test job orchestration
describe('Pipeline Orchestrator', () => {
  it('should queue and execute jobs', async () => {
    const orchestrator = new PipelineOrchestrator();
    const jobId = await orchestrator.addJob('csv_import', payload);

    // Wait for completion
    await waitForJob(jobId);

    const job = orchestrator.getJob(jobId);
    expect(job?.status).toBe('completed');
  });

  it('should retry failed jobs', async () => {
    const orchestrator = new PipelineOrchestrator();
    const jobId = await orchestrator.addJob('failing_job', payload);

    await waitForJob(jobId);

    const job = orchestrator.getJob(jobId);
    expect(job?.retryCount).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### 1. CSV Processing

- **Batch Size**: 50 records per batch (configurable)
- **Memory**: Streaming parser prevents memory issues
- **Duration**: ~0.1-0.5s per record

### 2. GitHub Sync

- **Rate Limit**: 5000 requests/hour with token
- **Concurrency**: 3 parallel requests (respects rate limits)
- **Incremental**: Only sync updated repos (faster)

### 3. Database Optimization

- **Indexes**: All foreign keys and frequently queried fields
- **Transactions**: Batch operations in transactions
- **Connection Pooling**: Prisma connection pool

### 4. Queue Management

- **Concurrency**: 3 jobs simultaneously (configurable)
- **Priority**: Critical jobs processed first
- **Memory**: Job cleanup after 7 days

## Monitoring and Observability

### 1. Logging

All operations logged to:
- `logs/combined.log`: All logs
- `logs/error.log`: Errors only

### 2. Database Tracking

- `import_logs`: Every import operation
- `audit_log`: All data modifications

### 3. Real-time Metrics

```typescript
// Get pipeline statistics
const stats = orchestrator.getStats();
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Avg Duration: ${stats.avgDuration}ms`);
```

## Security Considerations

### 1. Input Validation

All input validated with Zod schemas before processing

### 2. File Upload Limits

```typescript
// Max file size: 50MB
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }
});
```

### 3. OAuth Token Security

```typescript
// Tokens never logged or stored in database
// Use environment variables only
```

### 4. SQL Injection Protection

Prisma ORM prevents SQL injection automatically

### 5. Audit Trail

All operations logged with user ID and timestamps

## Deployment Checklist

- [ ] Install all dependencies (see INGESTION_PIPELINE_DEPENDENCIES.md)
- [ ] Set environment variables (DATABASE_URL, GITHUB_TOKEN)
- [ ] Create logs directory: `mkdir -p backend/logs`
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Test CSV upload endpoint
- [ ] Test GitHub sync with valid token
- [ ] Configure pipeline concurrency
- [ ] Set up log rotation (logrotate)
- [ ] Monitor pipeline statistics
- [ ] Set up scheduled GitHub sync (cron)

## Support and Troubleshooting

### Common Issues

1. **CSV Import Fails**
   - Check CSV format matches schema
   - Verify file encoding (UTF-8)
   - Check for duplicate records

2. **GitHub Sync Rate Limited**
   - Check rate limit: `GET /api/github/rate-limit`
   - Wait for reset time
   - Use incremental sync

3. **Jobs Stuck in Queue**
   - Check pipeline status: `GET /api/pipeline/stats`
   - View failed jobs: `GET /api/pipeline/dlq`
   - Retry failed jobs: `POST /api/pipeline/dlq/retry`

4. **Memory Issues**
   - Reduce pipeline concurrency
   - Clean up old jobs: `POST /api/pipeline/cleanup`
   - Check batch size in CSV processor

### Getting Help

- Check logs: `tail -f logs/combined.log`
- View import history: `GET /api/ingest/csv/history`
- Monitor pipeline: `GET /api/pipeline/stats`
- Review audit logs in database

## Next Steps

1. **Install Dependencies**: Follow INGESTION_PIPELINE_DEPENDENCIES.md
2. **Test Locally**: Use provided test endpoints
3. **Import Data**: Start with small CSV files
4. **Sync GitHub**: Test with a few repositories
5. **Monitor**: Watch logs and pipeline stats
6. **Scale**: Increase concurrency as needed
