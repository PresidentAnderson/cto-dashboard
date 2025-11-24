# Data Ingestion Pipeline Dependencies

## Required NPM Packages

Add these dependencies to your `backend/package.json`:

```json
{
  "dependencies": {
    "@octokit/rest": "^20.0.2",
    "@octokit/plugin-throttling": "^8.1.3",
    "papaparse": "^5.4.1",
    "zod": "^3.22.4",
    "p-queue": "^8.0.1",
    "winston": "^3.11.0",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14",
    "@types/multer": "^1.4.11",
    "@types/uuid": "^9.0.7"
  }
}
```

## Installation Commands

```bash
# Navigate to backend directory
cd backend

# Install production dependencies
npm install @octokit/rest @octokit/plugin-throttling papaparse zod p-queue winston multer uuid

# Install dev dependencies
npm install --save-dev @types/papaparse @types/multer @types/uuid
```

## Package Descriptions

### Core Dependencies

- **@octokit/rest** (^20.0.2): GitHub REST API client for syncing repos, issues, PRs, and commits
- **@octokit/plugin-throttling** (^8.1.3): Automatic rate limiting and retry logic for GitHub API
- **papaparse** (^5.4.1): Fast CSV parser with streaming support
- **zod** (^3.22.4): TypeScript-first schema validation for input validation
- **p-queue** (^8.0.1): Priority queue with concurrency control for pipeline orchestration
- **winston** (^3.11.0): Professional logging library with multiple transports
- **multer** (^1.4.5-lts.1): Middleware for handling multipart/form-data (CSV uploads)
- **uuid** (^9.0.1): RFC4122 UUID generation for job IDs

### TypeScript Type Definitions

- **@types/papaparse**: Type definitions for papaparse
- **@types/multer**: Type definitions for multer
- **@types/uuid**: Type definitions for uuid

## Environment Variables

Add to your `.env.local`:

```bash
# GitHub OAuth Token (generate at https://github.com/settings/tokens)
GITHUB_TOKEN=ghp_your_token_here

# GitHub Organization (optional, defaults to authenticated user)
GITHUB_OWNER=your-org-name

# Pipeline Configuration
PIPELINE_CONCURRENCY=3
MAX_JOB_RETRIES=3

# Log Configuration
LOG_LEVEL=info
LOG_DIR=./logs
```

## Directory Structure

The pipeline creates these log directories:

```
backend/
├── logs/
│   ├── error.log          # Error logs only
│   └── combined.log       # All logs
├── lib/
│   ├── prisma.ts          # Already exists
│   ├── logger.ts          # NEW: Logging utility
│   ├── validation-schemas.ts  # NEW: Zod schemas
│   ├── github-sync.ts     # NEW: GitHub sync engine
│   └── pipeline-orchestrator.ts  # NEW: Pipeline orchestrator
├── routes/
│   └── api/
│       ├── ingest/
│       │   └── csv.ts     # NEW: CSV ingestion routes
│       ├── github-sync.ts # NEW: GitHub sync routes
│       ├── pipeline.ts    # NEW: Pipeline management routes
│       └── manual-entry.ts # NEW: Manual entry routes
└── actions/
    └── manual-entry.ts    # NEW: Manual entry server actions
```

## Server Integration

Update your `backend/server.js` (or create `server.ts`) to include the new routes:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import csvIngestRoutes from './routes/api/ingest/csv';
import githubSyncRoutes from './routes/api/github-sync';
import pipelineRoutes from './routes/api/pipeline';
import manualEntryRoutes from './routes/api/manual-entry';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ingest/csv', csvIngestRoutes);
app.use('/api/github', githubSyncRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/manual', manualEntryRoutes);

// ... rest of your server setup

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Testing the Installation

After installing dependencies, verify everything works:

```bash
# Check if all packages are installed
npm list @octokit/rest papaparse zod p-queue winston multer uuid

# Run TypeScript compilation (if using TypeScript)
npx tsc --noEmit

# Start the server
npm run dev
```

## Troubleshooting

### Google Drive Issues

If you're working in a Google Drive directory and encounter npm install issues:

1. **Copy to local directory:**
   ```bash
   # Copy project to local directory
   cp -r "path/to/google-drive/cto-dashboard" ~/local-dev/

   # Navigate and install
   cd ~/local-dev/cto-dashboard/backend
   npm install
   ```

2. **Use npm cache:**
   ```bash
   npm cache clean --force
   npm install --legacy-peer-deps
   ```

3. **Alternative: Use pnpm or yarn:**
   ```bash
   # Using pnpm
   pnpm install

   # Using yarn
   yarn install
   ```

### Module Resolution Issues

If you encounter module resolution errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```
