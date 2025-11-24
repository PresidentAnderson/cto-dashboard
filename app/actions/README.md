# Server Actions Layer - CTO Dashboard v2.0

Next.js 14 Server Actions for inline CRUD operations without API routes.

## Overview

This directory contains all server actions for the CTO Dashboard, organized by domain:

- **projects.ts** - Project CRUD operations
- **bugs.ts** - Bug tracking and management
- **sync.ts** - GitHub and CSV synchronization
- **metrics.ts** - Analytics and KPI generation
- **validations.ts** - Zod validation schemas
- **utils.ts** - Shared utilities
- **types.ts** - TypeScript types and response helpers

## Architecture

### Response Pattern

All actions return a typed `ActionResponse<T>`:

```typescript
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

### Usage Example

```typescript
'use client'

import { addProjectAction } from '@/app/actions'
import { useState } from 'react'

export function CreateProjectForm() {
  const [error, setError] = useState<string>()

  async function handleSubmit(formData: FormData) {
    const result = await addProjectAction(formData)

    if (result.success) {
      console.log('Created project:', result.data)
      // Handle success
    } else {
      setError(result.error)
      // Handle error
    }
  }

  return (
    <form action={handleSubmit}>
      {/* form fields */}
      {error && <p className="error">{error}</p>}
    </form>
  )
}
```

## Actions Reference

### Project Actions

#### `addProjectAction(formData: FormData)`
Creates a new project with full validation.

**FormData Fields:**
- `name` (required) - Project name
- `description` - Project description
- `githubUrl` - GitHub repository URL
- `status` - Project status (active, shipped, deferred, cancelled)
- `complexity` - Complexity score (1-10)
- `clientAppeal` - Client appeal score (1-10)
- Financial fields: `arr`, `year1Revenue`, `year3Revenue`, etc.

**Returns:** `ActionResponse<Project>`

**Cache Tags:** Revalidates `projects`, `dashboard`

#### `updateProjectAction(id: string, data: Partial<Project>)`
Updates an existing project.

**Returns:** `ActionResponse<Project>`

**Cache Tags:** Revalidates `projects`, `project-${id}`, `dashboard`

#### `deleteProjectAction(id: string)`
Soft deletes a project (sets status to cancelled).

**Validation:** Prevents deletion if project has active bugs.

**Returns:** `ActionResponse<{ id: string }>`

#### `toggleProjectStatusAction(id: string)`
Quick toggle between active/shipped status.

**Returns:** `ActionResponse<Project>`

#### `getProjectAction(id: string)`
Fetches a single project with bugs and metrics.

**Returns:** `ActionResponse<Project>`

#### `listProjectsAction(options?)`
Lists projects with optional filtering.

**Options:**
- `status` - Filter by project status
- `language` - Filter by programming language
- `limit` - Maximum results (default: 100)

**Returns:** `ActionResponse<Project[]>`

### Bug Actions

#### `createBugAction(data)`
Creates a new bug with automatic bug number generation and SLA calculation.

**Required Fields:**
- `title` - Bug title
- `severity` - critical, high, medium, low

**Optional Fields:**
- `description`, `assignedToId`, `projectId`, `businessImpact`, `revenueImpact`, `isBlocker`, `priorityScore`, `estimatedHours`

**Auto-calculated:**
- `bugNumber` - Generated sequentially (BUG-0001, BUG-0002, etc.)
- `slaHours` - Based on severity (critical: 4h, high: 24h, medium: 72h, low: 168h)

**Returns:** `ActionResponse<Bug>`

**Cache Tags:** Revalidates `bugs`, `project-bugs-${projectId}`, `dashboard`

#### `updateBugAction(id: string, data: Partial<Bug>)`
Updates a bug and creates history entries for all changes.

**History Tracking:** Automatically logs all field changes to `bug_history`

**Auto-updates:**
- `resolvedAt` - Set when status changes to closed/shipped
- `slaHours` - Recalculated if severity changes

**Returns:** `ActionResponse<Bug>`

#### `updateBugStatusAction(id: string, status: BugStatus)`
Quick status update action.

**Status Values:** pending, in_progress, verified, shipped, closed, deferred

**Returns:** `ActionResponse<Bug>`

#### `updateBugSeverityAction(id: string, severity: BugSeverity)`
Quick severity update action with automatic SLA recalculation.

**Severity Values:** critical, high, medium, low

**Returns:** `ActionResponse<Bug>`

#### `deleteBugAction(id: string)`
Permanently deletes a bug (cascades to history).

**Returns:** `ActionResponse<{ id: string }>`

#### `getBugAction(id: string)`
Fetches a bug with full history and relationships.

**Returns:** `ActionResponse<Bug & { history }>`

#### `listBugsAction(options?)`
Lists bugs with comprehensive filtering.

**Options:**
- `status` - Filter by status
- `severity` - Filter by severity
- `projectId` - Filter by project
- `assignedToId` - Filter by assignee
- `isBlocker` - Filter blockers only
- `limit` - Maximum results (default: 100)

**Returns:** `ActionResponse<Bug[]>`

### Sync Actions

#### `syncGitHubNowAction(projectId?: string)`
Manually triggers GitHub synchronization.

**Behavior:**
- If `projectId` provided: Syncs single project
- If omitted: Syncs all active/shipped projects with GitHub URLs

**Returns:** `ActionResponse<ImportResult>`

```typescript
type ImportResult = {
  recordsImported: number
  recordsFailed: number
  errors: string[]
  details?: Record<string, unknown>
}
```

**Logging:** Creates entry in `import_logs` table

#### `importCSVAction(formData: FormData)`
Imports data from CSV file.

**FormData Fields:**
- `file` - CSV file
- `type` - 'projects' or 'bugs'
- `skipErrors` - Continue on errors (default: false)

**CSV Format:**
- First row must contain headers
- Quoted values supported
- Missing columns allowed (will use defaults)

**Project CSV Headers:**
- name, description, githubUrl, demoUrl, language, tags, stars, forks, status, complexity, clientAppeal

**Bug CSV Headers:**
- title, description, severity, status, businessImpact, isBlocker, priorityScore

**Returns:** `ActionResponse<ImportResult>`

#### `getSyncStatusAction()`
Gets current sync status and last sync information.

**Returns:** `ActionResponse<SyncStatus>`

#### `getImportHistoryAction(limit?: number)`
Retrieves import history from logs.

**Returns:** `ActionResponse<ImportLog[]>`

### Metrics Actions

#### `getDashboardMetricsAction()`
Generates comprehensive dashboard KPIs.

**Returns:** `ActionResponse<DashboardMetrics>`

**Includes:**
- Overview counts (projects, bugs, critical bugs, blockers)
- Bug breakdowns by severity and status
- Average resolution time
- SLA compliance percentage
- Financial metrics (ARR, revenue, valuation, costs)
- Recent bugs and projects

#### `getProjectMetricsAction(projectId: string)`
Gets detailed metrics for a specific project.

**Returns:** `ActionResponse<ProjectMetrics>`

**Includes:**
- Project details
- Bug statistics
- 30-day metrics timeline
- Financial breakdown

#### `generateMetricsAction(projectId?, dateRange?)`
Recalculates metrics for projects.

**Behavior:**
- If `projectId` provided: Generates for single project
- If omitted: Generates for all active/shipped projects

**Also Generates:**
- Monthly metrics aggregation
- Portfolio metrics snapshot

**Returns:** `ActionResponse<{ generated: number }>`

**Cache Tags:** Revalidates all metrics cache tags

## Validation Strategy

All actions use Zod schemas for validation:

1. **Input Validation** - Validates all incoming data against schemas
2. **Type Safety** - Ensures TypeScript types match runtime data
3. **Error Messages** - Returns clear, actionable error messages
4. **Schema Composition** - Reuses schemas (e.g., `updateSchema = createSchema.partial()`)

### Validation Schemas

Defined in `validations.ts`:

- `createProjectSchema` - Full project creation validation
- `updateProjectSchema` - Partial project updates
- `createBugSchema` - Bug creation with severity/status enums
- `updateBugSchema` - Bug updates with additional fields
- `syncGitHubSchema` - GitHub sync parameters
- `importCSVSchema` - CSV import validation
- `generateMetricsSchema` - Metrics generation parameters

### Custom Validation

```typescript
import { validateSchema } from './validations'

const result = validateSchema(createProjectSchema, data)
if (!result.success) {
  return error(result.error, 'VALIDATION_ERROR')
}
// Use result.data (typed and validated)
```

## Cache Invalidation Strategy

### Cache Tags by Domain

**Projects:**
- `projects` - All projects list
- `project-${id}` - Individual project
- `project-metrics` - Project metrics

**Bugs:**
- `bugs` - All bugs list
- `bug-${id}` - Individual bug
- `project-bugs-${projectId}` - Project-specific bugs

**Sync:**
- `sync` - Sync status

**Metrics:**
- `metrics` - General metrics
- `dashboard-metrics` - Dashboard KPIs
- `project-metrics-${id}` - Project-specific metrics
- `monthly-metrics` - Monthly aggregations
- `portfolio-metrics` - Portfolio snapshots

**Global:**
- `dashboard` - Revalidated on most mutations

### Path Revalidation

Common paths revalidated:
- `/dashboard` - On all mutations
- `/projects` - On project changes
- `/bugs` - On bug changes
- `/analytics` - On metrics generation

### Optimistic Updates

Support for optimistic updates in client components:

```typescript
'use client'

import { useOptimistic } from 'react'
import { updateBugStatusAction } from '@/app/actions'

export function BugStatusToggle({ bug }) {
  const [optimisticBug, setOptimisticBug] = useOptimistic(
    bug,
    (state, newStatus) => ({ ...state, status: newStatus })
  )

  async function handleStatusChange(newStatus) {
    setOptimisticBug(newStatus) // Immediate UI update
    await updateBugStatusAction(bug.id, newStatus) // Server update
  }

  return (
    <select value={optimisticBug.status} onChange={(e) => handleStatusChange(e.target.value)}>
      {/* options */}
    </select>
  )
}
```

## Error Handling

### Error Response Structure

```typescript
{
  success: false,
  error: "Human-readable error message",
  code: "ERROR_CODE" // Optional error code for programmatic handling
}
```

### Error Codes

Common error codes:
- `VALIDATION_ERROR` - Zod validation failed
- `NOT_FOUND` - Resource not found
- `INVALID_ID` - Invalid ID format
- `CREATE_ERROR` - Creation failed
- `UPDATE_ERROR` - Update failed
- `DELETE_ERROR` - Deletion failed
- `SYNC_ERROR` - Sync operation failed
- `IMPORT_ERROR` - Import operation failed
- `FETCH_ERROR` - Fetch operation failed
- `HAS_ACTIVE_BUGS` - Cannot delete project with active bugs
- `PROJECT_NOT_FOUND` - Project not found
- `USER_NOT_FOUND` - User not found
- `NO_GITHUB_URL` - Project has no GitHub URL

### Error Handling in Components

```typescript
async function handleAction() {
  try {
    const result = await someAction()

    if (!result.success) {
      // Handle known errors
      if (result.code === 'VALIDATION_ERROR') {
        setFieldErrors(result.error)
      } else {
        setGeneralError(result.error)
      }
      return
    }

    // Handle success
    handleSuccess(result.data)
  } catch (err) {
    // Handle unexpected errors
    setGeneralError('An unexpected error occurred')
    console.error(err)
  }
}
```

## Audit Logging

All actions automatically log to the `audit_log` table:

```typescript
await logAudit(
  'action.name',        // Action identifier
  { userId, ipAddress }, // Context
  'entity_type',        // Entity type (project, bug, etc.)
  'entity_id',          // Entity ID
  { ...details }        // Additional metadata
)
```

### Sync Event Logging

Import/sync operations log to `import_logs`:

```typescript
await logSyncEvent(
  'csv' | 'github' | 'manual',
  recordsImported,
  recordsFailed,
  errors,
  { ...metadata }
)
```

## TypeScript Usage

### Import Types

```typescript
import type { ActionResponse } from '@/app/actions/types'
import type { Project, Bug } from '@prisma/client'

async function handleCreate(): Promise<ActionResponse<Project>> {
  // Implementation
}
```

### Type Guards

```typescript
if (result.success) {
  // TypeScript knows result.data exists
  console.log(result.data.name)
} else {
  // TypeScript knows result.error exists
  console.error(result.error)
}
```

## Integration with Components

### Server Components

```typescript
// app/projects/page.tsx
import { listProjectsAction } from '@/app/actions'

export default async function ProjectsPage() {
  const result = await listProjectsAction({ status: 'active' })

  if (!result.success) {
    return <ErrorMessage error={result.error} />
  }

  return (
    <div>
      {result.data.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### Client Components with Forms

```typescript
// app/projects/CreateProjectForm.tsx
'use client'

import { addProjectAction } from '@/app/actions'
import { useFormState } from 'react-dom'

export function CreateProjectForm() {
  const [state, formAction] = useFormState(addProjectAction, null)

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="description" />
      <button type="submit">Create Project</button>

      {state && !state.success && (
        <p className="error">{state.error}</p>
      )}
    </form>
  )
}
```

### Client Components with Transitions

```typescript
'use client'

import { updateBugStatusAction } from '@/app/actions'
import { useTransition } from 'react'

export function BugStatusButton({ bugId, currentStatus }) {
  const [isPending, startTransition] = useTransition()

  async function handleToggle() {
    startTransition(async () => {
      const newStatus = currentStatus === 'pending' ? 'in_progress' : 'pending'
      const result = await updateBugStatusAction(bugId, newStatus)

      if (!result.success) {
        alert(result.error)
      }
    })
  }

  return (
    <button onClick={handleToggle} disabled={isPending}>
      {isPending ? 'Updating...' : 'Toggle Status'}
    </button>
  )
}
```

## Testing

### Unit Testing Actions

```typescript
import { addProjectAction } from '@/app/actions'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')

describe('addProjectAction', () => {
  it('creates project with valid data', async () => {
    const formData = new FormData()
    formData.append('name', 'Test Project')
    formData.append('status', 'active')

    const result = await addProjectAction(formData)

    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Test Project')
  })

  it('returns error for invalid data', async () => {
    const formData = new FormData()
    // Missing required name field

    const result = await addProjectAction(formData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('name')
  })
})
```

## Performance Considerations

1. **Batch Operations** - Use transactions for multi-step operations
2. **Selective Includes** - Only include related data when needed
3. **Pagination** - Use `limit` parameter for large datasets
4. **Cache Strategy** - Granular cache tags for efficient revalidation
5. **Background Jobs** - Consider queue for long-running operations (GitHub sync, metrics)

## Security

1. **Input Validation** - All inputs validated with Zod
2. **SQL Injection** - Protected by Prisma parameterized queries
3. **Authentication** - Add auth checks as needed (not included in base actions)
4. **Rate Limiting** - Implement at middleware level
5. **CSRF Protection** - Built into Next.js Server Actions

## Future Enhancements

1. **Authentication Context** - Pass user ID from session
2. **Background Jobs** - Queue for GitHub sync and metrics
3. **Webhooks** - GitHub webhook integration
4. **Real-time Updates** - WebSocket for live metrics
5. **Batch Operations** - Bulk update/delete actions
6. **Advanced Filtering** - Full-text search, date ranges
7. **Export Actions** - PDF/Excel export generation
8. **Notification Actions** - Email/Slack notifications
