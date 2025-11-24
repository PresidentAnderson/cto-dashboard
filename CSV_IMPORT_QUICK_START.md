# CSV Import Quick Start Guide

## Setup (One-Time)

### 1. Install Dependencies

Dependencies already installed:
- `papaparse` - CSV parsing
- `multiparty` - File upload handling

### 2. Run Database Migration

```bash
psql $DATABASE_URL -f database/migration-import-logs.sql
```

This creates the `import_logs` table for tracking imports.

### 3. Deploy or Start Development

**Option A: Deploy to Vercel**
```bash
vercel --prod
```

**Option B: Local Development**
```bash
# Terminal 1: API
cd api
vercel dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Usage

### For End Users

1. **Click Import Button**: Look for "Import CSV" or "Import Projects"
2. **Select File**: Drag and drop or click to select CSV file
3. **Preview**: Click "Preview & Validate" to check data
4. **Import**: Click "Import X Projects" to complete
5. **Review**: Check success summary and any errors

### For Developers

#### Add Import Button to Your Component

```jsx
import { useState } from 'react';
import ImportCSVModal from './ImportCSVModal';

function ProjectsPage() {
  const [showImport, setShowImport] = useState(false);

  return (
    <div>
      <button onClick={() => setShowImport(true)}>
        Import Projects from CSV
      </button>

      {showImport && (
        <ImportCSVModal
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            // Refresh projects list
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
```

## CSV Format

### Template

Download template from modal or use this:

```csv
name,description,github_url,demo_url,tags,language,stars,status
Project Name,Description here,https://github.com/org/repo,https://demo.com,"tag1,tag2",TypeScript,42,active
```

### Required Fields

- **name**: Project name (max 200 chars)

### Optional Fields

- **description**: Project description
- **github_url**: GitHub URL (must be valid URL)
- **demo_url**: Demo/website URL (must be valid URL)
- **tags**: Comma-separated tags
- **language**: Programming language
- **stars**: Number of stars (integer)
- **status**: active, shipped, archived, deferred, or cancelled

## Common Issues

### "Validation failed"

**Cause**: Invalid data in CSV
**Fix**:
1. Review error messages
2. Fix indicated rows
3. Re-upload

### "Duplicate entry"

**Cause**: Project name already exists
**Fix**:
1. Use unique names
2. Or delete existing project first

### "File too large"

**Cause**: File exceeds 5MB
**Fix**:
1. Split into smaller files
2. Import in batches

### "Invalid URL format"

**Cause**: URL doesn't start with http:// or https://
**Fix**:
1. Add https:// prefix
2. Or leave field empty

## File Locations

### Backend
- `/api/import-csv.js` - Main API endpoint
- `/api/csv-validator.js` - Validation utilities

### Frontend
- `/frontend/src/ImportCSVModal.jsx` - Import modal component

### Database
- `/database/migration-import-logs.sql` - Import logs table

### Templates
- `/frontend/public/templates/projects-template.csv` - Sample template

### Documentation
- `/CSV_IMPORT_GUIDE.md` - Complete documentation
- `/TESTING_GUIDE.md` - Testing instructions
- `/CSV_IMPORT_QUICK_START.md` - This file

### Test Files
- `/test-samples/test-valid.csv` - Valid test data
- `/test-samples/test-invalid.csv` - Invalid test data
- `/test-samples/test-large.csv` - Large dataset (20 rows)

## API Endpoint

### POST `/api/import-csv`

**Import CSV file**

```bash
curl -X POST http://your-domain.com/api/import-csv \
  -F "file=@projects.csv"
```

**Preview only (no import)**

```bash
curl -X POST http://your-domain.com/api/import-csv?preview=true \
  -F "file=@projects.csv"
```

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| name | Required, max 200 chars | "Name is required" |
| github_url | Valid URL | "Invalid GitHub URL format" |
| demo_url | Valid URL | "Invalid demo URL format" |
| stars | Integer >= 0 | "Stars must be valid integer" |
| status | One of valid values | "Invalid status" |

## Performance

- **Small files (1-50 rows)**: < 5 seconds
- **Medium files (51-100 rows)**: < 10 seconds
- **Large files (101-200 rows)**: < 20 seconds
- **Maximum supported**: 200+ rows (5MB limit)

## Support

1. **Read documentation**: See `CSV_IMPORT_GUIDE.md`
2. **Run tests**: See `TESTING_GUIDE.md`
3. **Check errors**: Review validation messages
4. **Use template**: Download from modal

## Next Steps

1. Run database migration (if not done)
2. Test with sample files in `/test-samples/`
3. Create your own CSV file
4. Import and verify
5. Check import logs in database

## Quick Commands

```bash
# Run migration
psql $DATABASE_URL -f database/migration-import-logs.sql

# Test API locally
curl -X POST http://localhost:3000/api/import-csv?preview=true \
  -F "file=@test-samples/test-valid.csv"

# Check import logs
psql $DATABASE_URL -c "SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 10;"

# Count imported projects
psql $DATABASE_URL -c "SELECT COUNT(*) FROM projects;"
```

---

**Need help?** Check the full documentation in `CSV_IMPORT_GUIDE.md`
