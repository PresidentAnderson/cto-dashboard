# CTO Dashboard API v2.0 - Complete Documentation

## Overview

The CTO Dashboard API v2.0 is a comprehensive REST API for bug tracking, project portfolio management, and analytics. It provides modular endpoints for external integrations, webhooks, and data synchronization.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Response Format](#response-format)
5. [API Endpoints](#api-endpoints)
   - [Projects API](#projects-api)
   - [Analytics API](#analytics-api)
   - [Ingestion API](#ingestion-api)
   - [Metrics API](#metrics-api)
   - [Webhooks API](#webhooks-api)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Getting Started

### Base URL

```
Development: http://localhost:5000
Production:  https://api.ctodashboard.com
```

### Installation

```bash
cd backend
npm install
npm run dev
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cto_dashboard"

# API Keys (comma-separated)
API_KEYS="your-api-key-1,your-api-key-2"

# GitHub Webhook Secret
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# CORS
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"

# Server
PORT=5000
NODE_ENV=development
```

---

## Authentication

Protected endpoints require an API key. Provide it in one of two ways:

### Header: x-api-key
```bash
curl -H "x-api-key: YOUR_API_KEY" https://api.ctodashboard.com/api/projects
```

### Header: Authorization Bearer
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.ctodashboard.com/api/projects
```

### Public Endpoints (No Auth Required)
- `GET /health`
- `GET /api`
- `GET /api/docs`
- `GET /api/projects` (read-only)
- `GET /api/projects/:id` (read-only)
- `GET /api/analytics/*` (all analytics endpoints)
- `GET /api/metrics/daily`
- `GET /api/metrics/monthly`
- `GET /api/metrics/portfolio`

### Protected Endpoints (Auth Required)
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/ingest/csv`
- `POST /api/sync/github`
- `GET /api/sync/status`
- `POST /api/metrics/rebuild`

---

## Rate Limiting

### General API Endpoints
- **Limit:** 10 requests per second per IP
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

### Strict Rate Limiting (Ingestion/Webhooks)
- **Limit:** 5 requests per minute per IP
- Applied to:
  - `POST /api/ingest/csv`
  - `POST /api/sync/github`
  - `POST /api/webhooks/github`

---

## Response Format

All API responses follow a standard format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## API Endpoints

## Projects API

### GET /api/projects
List all projects with optional filters.

**Query Parameters:**
- `status` - Filter by status (active, shipped, deferred, cancelled)
- `language` - Filter by programming language
- `complexity_min` - Minimum complexity (1-10)
- `complexity_max` - Maximum complexity (1-10)
- `client_appeal_min` - Minimum client appeal (1-10)
- `client_appeal_max` - Maximum client appeal (1-10)
- `has_github` - Boolean: has GitHub URL
- `search` - Search in name, description, tags
- `sort_by` - Sort field (name, roi_score, complexity, client_appeal, created_at)
- `sort_order` - Sort direction (asc, desc)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```bash
curl "http://localhost:5000/api/projects?status=active&complexity_min=7&page=1&limit=20"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Project Name",
      "description": "Project description",
      "status": "active",
      "complexity": 8,
      "client_appeal": 9,
      "roi_score": "125.50",
      "bug_count": 5,
      "github_url": "https://github.com/user/repo",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### GET /api/projects/:id
Get detailed information about a specific project.

**Example:**
```bash
curl "http://localhost:5000/api/projects/550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Name",
    "description": "Detailed description",
    "status": "active",
    "complexity": 8,
    "client_appeal": 9,
    "github_url": "https://github.com/user/repo",
    "bug_summary": {
      "total": 12,
      "critical": 2,
      "high": 4,
      "blockers": 1
    },
    "bugs": [
      // Top 10 bugs
    ],
    "metrics": [
      // Last 30 days of metrics
    ]
  }
}
```

---

### GET /api/projects/:id/bugs
Get all bugs for a specific project.

**Query Parameters:**
- `severity` - Filter by severity (critical, high, medium, low)
- `status` - Filter by status (pending, in_progress, verified, shipped, closed, deferred)
- `page` - Page number
- `limit` - Items per page

**Example:**
```bash
curl "http://localhost:5000/api/projects/uuid/bugs?severity=critical&status=pending"
```

---

### GET /api/projects/:id/metrics
Get metrics history for a project.

**Query Parameters:**
- `days` - Number of days to retrieve (default: 30)

**Example:**
```bash
curl "http://localhost:5000/api/projects/uuid/metrics?days=90"
```

---

### POST /api/projects
Create a new project (requires authentication).

**Request Body:**
```json
{
  "name": "Project Name",
  "description": "Project description",
  "github_url": "https://github.com/user/repo",
  "demo_url": "https://demo.example.com",
  "language": "TypeScript",
  "tags": ["web", "saas", "ai"],
  "status": "active",
  "complexity": 7,
  "client_appeal": 8,
  "year1_revenue": 50000,
  "year3_revenue": 500000,
  "monthly_infra_cost": 500
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/projects" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Project","status":"active"}'
```

---

### PUT /api/projects/:id
Update an existing project (requires authentication).

**Request Body:** Same as POST, all fields optional

---

### DELETE /api/projects/:id
Delete a project (requires authentication).

**Query Parameters:**
- `force` - Force delete even if project has bugs

**Example:**
```bash
curl -X DELETE "http://localhost:5000/api/projects/uuid?force=true" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Analytics API

### GET /api/analytics/summary
Get comprehensive dashboard overview with KPIs, trends, and top bugs.

**Example:**
```bash
curl "http://localhost:5000/api/analytics/summary"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bugs": {
      "by_severity": {
        "critical": 5,
        "high": 12,
        "medium": 23,
        "low": 8
      },
      "by_status": {
        "pending": 10,
        "in_progress": 15,
        "verified": 8,
        "shipped": 12,
        "closed": 3
      },
      "blockers": 2,
      "sla_breached": 3,
      "recent_24h": 7,
      "total_open": 33
    },
    "projects": {
      "by_status": {
        "active": 15,
        "shipped": 8,
        "deferred": 2,
        "cancelled": 1
      },
      "total": 26
    },
    "portfolio": {
      "total_projects": 26,
      "shipped_projects": 8,
      "year3_revenue": "5000000.00",
      "dcf_valuation": "15000000.00",
      "monthly_costs": "5000.00"
    },
    "revenue_impact": {
      "daily_loss": 5000
    },
    "trends": {
      "monthly": [
        // 12 months of trend data
      ]
    },
    "top_priority_bugs": [
      // Top 5 priority bugs
    ]
  }
}
```

---

### GET /api/analytics/project/:slug
Get analytics for a specific project (by ID or name).

**Example:**
```bash
curl "http://localhost:5000/api/analytics/project/my-project-name"
```

---

### GET /api/analytics/trends
Get trend data for charts.

**Query Parameters:**
- `metric` - Metric to analyze (bugs, revenue_impact, resolution_time, eng_hours) **Required**
- `period` - Time period (7d, 30d, 90d, 1y) Default: 30d
- `group_by` - Grouping (day, week, month) Default: day

**Example:**
```bash
curl "http://localhost:5000/api/analytics/trends?metric=bugs&period=30d&group_by=week"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metric": "bugs",
    "period": {
      "start": "2024-10-25T00:00:00Z",
      "end": "2024-11-24T00:00:00Z",
      "group_by": "week"
    },
    "data": [
      {
        "period": "2024-10-25T00:00:00Z",
        "total": 45,
        "critical": 5,
        "high": 12,
        "medium": 20,
        "low": 8
      }
    ]
  }
}
```

---

### GET /api/analytics/risks
Identify risks and issues across the portfolio.

**Example:**
```bash
curl "http://localhost:5000/api/analytics/risks"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_risks": 4,
    "critical": 1,
    "high": 2,
    "medium": 1,
    "low": 0,
    "risks": [
      {
        "type": "BLOCKER_BUGS",
        "severity": "critical",
        "title": "Project Blockers Active",
        "description": "2 blocker bugs preventing progress",
        "impact": "critical",
        "recommendation": "Resolve blockers to unblock project milestones",
        "affected_count": 2,
        "affected_bugs": [
          // List of blocker bugs
        ]
      }
    ]
  }
}
```

---

## Ingestion API

### POST /api/ingest/csv
Upload and import CSV data (requires authentication).

**Request:**
- Content-Type: `multipart/form-data`
- Form Fields:
  - `file` - CSV file (required)
  - `type` - Data type: "projects" or "bugs" (required)
  - `overwrite` - Boolean: overwrite existing records (default: false)
  - `validate_only` - Boolean: validate without importing (default: false)

**CSV Format for Projects:**
```csv
name,description,github_url,language,complexity,client_appeal,status
Project 1,Description,https://github.com/user/repo,TypeScript,8,9,active
```

**CSV Format for Bugs:**
```csv
title,description,severity,status,project_id,is_blocker,estimated_hours
Bug Title,Description,critical,pending,uuid,true,8
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/ingest/csv" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@projects.csv" \
  -F "type=projects" \
  -F "overwrite=false"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 3,
    "total": 48,
    "errors": [
      {
        "line": 5,
        "error": "Invalid complexity value",
        "record": { }
      }
    ]
  }
}
```

---

### POST /api/sync/github
Trigger GitHub synchronization (requires authentication).

**Request Body:**
```json
{
  "repository": "username/repo-name",  // Optional: specific repo
  "full_sync": false,                  // Optional: full vs incremental
  "force": false                       // Optional: force if sync running
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/sync/github" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"repository":"username/repo","full_sync":true}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sync_id": "uuid",
    "status": "started",
    "message": "GitHub sync initiated",
    "repository": "username/repo"
  }
}
```

---

### GET /api/sync/status
Check GitHub sync progress (requires authentication).

**Query Parameters:**
- `sync_id` - Sync operation ID (optional, returns all if omitted)

**Example:**
```bash
curl "http://localhost:5000/api/sync/status?sync_id=uuid" \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "repository": "username/repo",
    "status": "running",
    "started_at": "2025-11-24T12:00:00Z",
    "progress": {
      "repositories_processed": 5,
      "repositories_total": 10,
      "issues_synced": 123,
      "errors": []
    }
  }
}
```

---

## Metrics API

### POST /api/metrics/rebuild
Regenerate metrics (requires authentication).

**Request Body:**
```json
{
  "metric_type": "all",           // all, monthly, portfolio, project
  "start_date": "2024-01-01",     // Optional
  "end_date": "2024-12-31",       // Optional
  "force": false                  // Overwrite existing metrics
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/metrics/rebuild" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"metric_type":"monthly","force":true}'
```

---

### GET /api/metrics/daily
Get daily metrics for specified period.

**Query Parameters:**
- `date` - End date (default: today)
- `days` - Number of days (default: 30, max: 90)

**Example:**
```bash
curl "http://localhost:5000/api/metrics/daily?days=30"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-10-25T00:00:00Z",
      "end": "2024-11-24T00:00:00Z",
      "days": 30
    },
    "summary": {
      "total_bugs_created": 145,
      "total_bugs_resolved": 132,
      "total_revenue_impact": 12500,
      "avg_bugs_per_day": "4.83",
      "avg_resolution_per_day": "4.40"
    },
    "daily_metrics": [
      {
        "date": "2024-11-24",
        "bugs_created": 5,
        "bugs_resolved": 7,
        "by_severity": {
          "critical": 1,
          "high": 2,
          "medium": 2,
          "low": 0
        },
        "revenue_impact": 500,
        "avg_resolution_hours": "18.50"
      }
    ]
  }
}
```

---

### GET /api/metrics/monthly
Get monthly aggregated metrics.

**Query Parameters:**
- `months` - Number of months (default: 12)

---

### GET /api/metrics/portfolio
Get latest portfolio metrics snapshot.

---

## Webhooks API

### POST /api/webhooks/github
GitHub webhook receiver with signature verification.

**Headers Required:**
- `X-GitHub-Event` - Event type (push, issues, pull_request, etc.)
- `X-GitHub-Delivery` - Delivery UUID
- `X-Hub-Signature-256` - HMAC signature

**Supported Events:**
- `push` - Update project commit info and metrics
- `issues` - Create/update/close bugs from issues
- `pull_request` - Update bug status from PRs
- `repository` - Create/archive projects
- `ping` - Webhook verification

**Configuration in GitHub:**
1. Go to repository Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/github`
3. Content type: `application/json`
4. Secret: Your `GITHUB_WEBHOOK_SECRET`
5. Select events: Push, Issues, Pull requests

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Webhook processed successfully",
    "event": "issues",
    "delivery": "uuid",
    "result": {
      "message": "Bug created from GitHub issue",
      "bug_number": "BUG-00123",
      "issue_number": 45
    }
  }
}
```

---

### POST /api/webhooks/test
Test webhook endpoint (no authentication or signature required).

**Request Body:**
```json
{
  "event_type": "test",
  "test_data": {
    "any": "data"
  }
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (invalid signature)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (database down)

### Error Codes

- `API_KEY_MISSING` - No API key provided
- `API_KEY_INVALID` - Invalid API key
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `DUPLICATE_GITHUB_URL` - Project with GitHub URL exists
- `PROJECT_HAS_BUGS` - Cannot delete project with bugs
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SIGNATURE_MISSING` - Webhook signature missing
- `SIGNATURE_INVALID` - Invalid webhook signature
- `WEBHOOK_CONFIG_ERROR` - Webhook not configured
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Unexpected error

---

## Examples

### Complete Workflow Example

```bash
# 1. Create a project
PROJECT_RESPONSE=$(curl -X POST "http://localhost:5000/api/projects" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI SaaS Platform",
    "description": "AI-powered analytics platform",
    "complexity": 9,
    "client_appeal": 10,
    "year3_revenue": 1000000
  }')

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.data.id')

# 2. Import bugs via CSV
curl -X POST "http://localhost:5000/api/ingest/csv" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@bugs.csv" \
  -F "type=bugs"

# 3. Get project analytics
curl "http://localhost:5000/api/analytics/project/$PROJECT_ID"

# 4. Check risk assessment
curl "http://localhost:5000/api/analytics/risks"

# 5. Rebuild metrics
curl -X POST "http://localhost:5000/api/metrics/rebuild" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"metric_type":"all","force":true}'
```

---

## OpenAPI Specification

Access the complete OpenAPI 3.0 specification:

```bash
curl "http://localhost:5000/api/docs"
```

Import into tools like:
- Postman
- Insomnia
- Swagger UI
- ReDoc

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@ctodashboard.com
- Documentation: https://docs.ctodashboard.com

---

## License

MIT License - See LICENSE file for details
