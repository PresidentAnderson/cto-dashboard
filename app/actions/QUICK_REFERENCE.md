# Server Actions Quick Reference

## Import Actions

```typescript
import {
  // Projects
  addProjectAction,
  updateProjectAction,
  deleteProjectAction,
  toggleProjectStatusAction,
  getProjectAction,
  listProjectsAction,

  // Bugs
  createBugAction,
  updateBugAction,
  updateBugStatusAction,
  updateBugSeverityAction,
  deleteBugAction,
  getBugAction,
  listBugsAction,

  // Sync
  syncGitHubNowAction,
  importCSVAction,
  getSyncStatusAction,
  getImportHistoryAction,

  // Metrics
  generateMetricsAction,
  getDashboardMetricsAction,
  getProjectMetricsAction,

  // Types
  type ActionResponse,
  success,
  error,
} from '@/app/actions'
```

## Response Pattern

```typescript
const result = await someAction()

if (result.success) {
  // result.data is available
  console.log(result.data)
} else {
  // result.error and result.code are available
  console.error(result.error)
}
```

## Common Usage Patterns

### Server Component

```typescript
export default async function Page() {
  const result = await listProjectsAction({ status: 'active' })

  if (!result.success) {
    return <ErrorPage error={result.error} />
  }

  return <ProjectList projects={result.data} />
}
```

### Form Action

```typescript
'use client'

export function MyForm() {
  async function handleSubmit(formData: FormData) {
    const result = await addProjectAction(formData)

    if (result.success) {
      router.push(`/projects/${result.data.id}`)
    } else {
      setError(result.error)
    }
  }

  return <form action={handleSubmit}>...</form>
}
```

### With useTransition

```typescript
'use client'

export function QuickAction({ id }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await toggleProjectStatusAction(id)
      if (!result.success) {
        toast.error(result.error)
      }
    })
  }

  return <button onClick={handleClick} disabled={isPending}>...</button>
}
```

### With useOptimistic

```typescript
'use client'

export function OptimisticUpdate({ bug }) {
  const [optimisticBug, setOptimisticBug] = useOptimistic(
    bug,
    (state, newStatus) => ({ ...state, status: newStatus })
  )

  async function handleChange(newStatus) {
    setOptimisticBug(newStatus)
    await updateBugStatusAction(bug.id, newStatus)
  }

  return <select value={optimisticBug.status} onChange={...} />
}
```

## Action Categories

### Projects (6 actions)
- Create, Update, Delete, Toggle Status, Get, List

### Bugs (7 actions)
- Create, Update, Update Status, Update Severity, Delete, Get, List

### Sync (4 actions)
- GitHub Sync, CSV Import, Get Status, Get History

### Metrics (3 actions)
- Generate, Get Dashboard, Get Project

## Key Features

- Type-safe responses with discriminated unions
- Zod validation on all inputs
- Automatic cache revalidation
- Audit logging built-in
- History tracking for bugs
- Auto-generated bug numbers
- SLA calculation
- FormData and object support
- Optimistic update ready

## Error Codes

- VALIDATION_ERROR
- NOT_FOUND
- INVALID_ID
- CREATE_ERROR
- UPDATE_ERROR
- DELETE_ERROR
- FETCH_ERROR
- SYNC_ERROR
- IMPORT_ERROR
- HAS_ACTIVE_BUGS
- NO_GITHUB_URL

## Files Structure

```
app/actions/
├── types.ts           # Response types and helpers
├── validations.ts     # Zod schemas
├── utils.ts           # Shared utilities
├── projects.ts        # Project CRUD
├── bugs.ts            # Bug management
├── sync.ts            # GitHub/CSV sync
├── metrics.ts         # Analytics
└── index.ts           # Exports
```

## Installation

```bash
npm install zod date-fns
```

## Next.js Config

```javascript
// next.config.js
experimental: {
  serverActions: {
    bodySizeLimit: '10mb'
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Full Documentation

See `app/actions/README.md` for complete API reference.
