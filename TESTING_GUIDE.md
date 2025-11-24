# CSV Import System - Testing Guide

## Quick Start Testing

### Prerequisites

1. Database running with schema applied
2. API server running (Vercel dev or local)
3. Frontend development server running
4. Import logs migration applied

### Setup Database

```bash
# Apply migration for import_logs table
psql $DATABASE_URL -f database/migration-import-logs.sql
```

### Start Development Servers

```bash
# Terminal 1: API (if testing locally)
cd api
vercel dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Test Scenarios

### Test 1: Valid Import (Happy Path)

**File**: `test-samples/test-valid.csv`

**Steps**:
1. Open application
2. Click "Import CSV" or "Import Projects" button
3. Drag and drop `test-valid.csv` or select it
4. Click "Preview & Validate"
5. Verify preview shows 5 projects
6. Click "Import 5 Projects"
7. Wait for progress bar
8. Verify success message shows "5 imported, 0 failed"

**Expected Result**:
- All 5 projects imported successfully
- No validation errors
- Projects visible in dashboard
- Import logged in `import_logs` table

**Verification**:
```sql
-- Check projects were imported
SELECT name, status, language, stars FROM projects
WHERE name LIKE '%Platform%' OR name LIKE '%Chatbot%'
ORDER BY created_at DESC LIMIT 5;

-- Check import logs
SELECT entity_type, status, created_at FROM import_logs
WHERE entity_type = 'project'
ORDER BY created_at DESC LIMIT 5;
```

---

### Test 2: Invalid Data (Error Handling)

**File**: `test-samples/test-invalid.csv`

**Steps**:
1. Upload `test-invalid.csv`
2. Click "Preview & Validate"
3. Observe validation errors

**Expected Result**:
- Validation fails with errors:
  - Row 2: Name is required
  - Row 4: Invalid URL formats
  - Row 5: Invalid status
  - Row 6: Stars cannot be negative
- Cannot proceed to import
- Clear error messages displayed

**Verification**:
- Preview button should show errors
- Import button should be disabled or show errors
- Error messages should specify row numbers

---

### Test 3: Large File (Performance)

**File**: `test-samples/test-large.csv`

**Steps**:
1. Upload `test-large.csv` (20 projects)
2. Click "Preview & Validate"
3. Verify only 10 rows shown in preview
4. Click "Import 20 Projects"
5. Monitor progress bar
6. Time the import

**Expected Result**:
- Preview shows 10 rows (message says "10 of 20")
- Import completes in < 5 seconds
- Progress bar animates smoothly
- All 20 projects imported successfully

**Performance Benchmarks**:
- 20 rows: < 5 seconds
- 50 rows: < 10 seconds
- 100 rows: < 20 seconds
- 200 rows: < 40 seconds

---

### Test 4: Duplicate Detection

**Steps**:
1. Import `test-valid.csv` first time (succeeds)
2. Import same file again
3. Observe duplicate errors

**Expected Result**:
- First import: 5 successful
- Second import: 5 failed with "Duplicate entry" errors
- Error messages include project names
- No duplicate projects in database

**Verification**:
```sql
-- Should show only 5 unique projects, not 10
SELECT name, COUNT(*) as count FROM projects
WHERE name IN ('E-Commerce Platform', 'AI Chatbot', 'Analytics Dashboard')
GROUP BY name;
```

---

### Test 5: Drag and Drop

**Steps**:
1. Open import modal
2. Drag `test-valid.csv` from file explorer
3. Hover over drop zone (should highlight)
4. Drop file
5. Verify file is selected

**Expected Result**:
- Drop zone highlights when dragging
- File name appears after drop
- File size displayed
- No errors

---

### Test 6: File Validation

**Test 6a: Wrong File Type**

**Steps**:
1. Try to upload a .txt or .json file
2. Observe error

**Expected Result**:
- Error: "Please select a CSV file"
- File not accepted

**Test 6b: File Too Large**

**Steps**:
1. Create CSV > 5MB (or mock it)
2. Try to upload
3. Observe error

**Expected Result**:
- Error: "File size exceeds 5MB limit (X.XX MB)"
- File rejected

---

### Test 7: Preview Mode

**File**: `test-valid.csv`

**Steps**:
1. Upload file
2. Click "Preview & Validate"
3. Examine preview table
4. Do NOT click Import
5. Click "Cancel"
6. Check database

**Expected Result**:
- Preview shows data correctly
- Table displays: name, description, status, language, stars
- First 10 rows visible
- Message says "Showing first 10 of X rows"
- NO data imported to database
- Preview is read-only

**Verification**:
```sql
-- Should show no new projects
SELECT COUNT(*) FROM projects WHERE created_at > NOW() - INTERVAL '1 minute';
```

---

### Test 8: Progress Bar

**File**: `test-large.csv`

**Steps**:
1. Upload large file
2. Click Import
3. Watch progress bar
4. Observe percentage updates

**Expected Result**:
- Progress bar starts at 0%
- Increments smoothly to 100%
- Shows percentage number
- "Importing..." text visible
- Button disabled during import

---

### Test 9: Error Recovery

**Steps**:
1. Upload `test-invalid.csv`
2. Preview shows errors
3. Fix errors in CSV file
4. Save as `test-fixed.csv`
5. Upload fixed file
6. Import succeeds

**Expected Result**:
- Can upload new file after error
- Fixed file imports successfully
- No residual errors from previous attempt

---

### Test 10: Mixed Success/Failure

**File**: Create `test-mixed.csv`:
```csv
name,description,github_url,demo_url,tags,language,stars,status
Valid Project 1,Good project,https://github.com/org/proj1,https://proj1.com,tag1,JavaScript,10,active
,Missing name,https://github.com/org/proj2,https://proj2.com,tag2,TypeScript,20,active
Valid Project 2,Another good one,https://github.com/org/proj3,https://proj3.com,tag3,Python,30,shipped
Invalid URL,Bad url here,not-a-url,https://proj4.com,tag4,Java,40,active
Valid Project 3,Third good project,https://github.com/org/proj5,https://proj5.com,tag5,Go,50,active
```

**Steps**:
1. Upload `test-mixed.csv`
2. Preview (should fail validation)
3. Fix file or observe errors

**Expected with validation**:
- Validation catches errors before import
- Shows specific row numbers
- Lists all validation errors

**Alternative: Test without preview**:
- Some rows succeed
- Some rows fail
- Results summary shows: "3 imported, 2 failed"
- Failed section lists errors

---

### Test 11: Template Download

**Steps**:
1. Open import modal
2. Click "Download Template CSV"
3. Open downloaded file
4. Verify format

**Expected Result**:
- File downloads as `projects-template.csv`
- Contains header row with all fields
- Includes 2-3 example rows
- Example data is realistic and helpful

---

### Test 12: Success Summary

**File**: `test-valid.csv`

**Steps**:
1. Import file successfully
2. Examine success screen
3. Verify statistics

**Expected Result**:
- Green success banner with checkmark
- Shows: "5 of 5 projects imported successfully"
- Three stat cards:
  - Total Rows: 5
  - Imported: 5
  - Failed: 0
- "Import Another File" button
- "Close" button

---

### Test 13: Import Logging

**File**: `test-valid.csv`

**Steps**:
1. Import file
2. Query import_logs table
3. Verify entries

**Expected Result**:
```sql
SELECT
  entity_type,
  entity_id,
  status,
  metadata->>'source' as source,
  metadata->>'row' as row_number,
  created_at
FROM import_logs
WHERE entity_type = 'project'
ORDER BY created_at DESC
LIMIT 10;
```

Should show:
- One log entry per imported project
- entity_type = 'project'
- status = 'success'
- metadata contains source and row info
- entity_id links to projects table

---

### Test 14: Concurrent Imports (Stress Test)

**Note**: Only run this if testing multi-user scenarios

**Steps**:
1. Open two browser windows
2. Upload different files in each
3. Click import simultaneously
4. Observe results

**Expected Result**:
- Both imports complete successfully
- No race conditions
- No duplicate IDs
- Import logs show distinct timestamps

---

### Test 15: UI/UX Testing

**Checklist**:
- [ ] Modal appears centered on screen
- [ ] Modal is responsive (try different screen sizes)
- [ ] Drag and drop zone is visually clear
- [ ] File picker button is prominent
- [ ] Preview table scrolls if many columns
- [ ] Preview table has sticky header
- [ ] Error messages are readable and helpful
- [ ] Success screen is celebratory and clear
- [ ] Buttons have hover states
- [ ] Loading states are clear
- [ ] Progress bar is smooth
- [ ] Close button (X) is visible
- [ ] Modal can be closed with Cancel
- [ ] Modal backdrop dims content behind

---

## Integration Testing

### Test with Real Application

**Steps**:
1. Start full application
2. Navigate to Projects page
3. Note current project count
4. Import CSV with 5 projects
5. Verify project count increases by 5
6. Verify new projects appear in project list
7. Click on imported project
8. Verify all fields imported correctly

**Expected Result**:
- Seamless integration with existing UI
- Projects appear immediately after import (or after refresh)
- No UI glitches
- All data fields populated correctly

---

## API Testing

### Test API Directly (with curl)

**Test 1: Preview Mode**

```bash
curl -X POST http://localhost:3000/api/import-csv?preview=true \
  -F "file=@test-samples/test-valid.csv" \
  -H "Content-Type: multipart/form-data"
```

**Expected Response**:
```json
{
  "success": true,
  "preview": true,
  "data": [...],
  "total_rows": 5,
  "message": "Preview of 5 of 5 rows"
}
```

**Test 2: Import**

```bash
curl -X POST http://localhost:3000/api/import-csv \
  -F "file=@test-samples/test-valid.csv" \
  -H "Content-Type: multipart/form-data"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Successfully imported 5 projects",
  "total_rows": 5,
  "imported_count": 5,
  "failed_count": 0,
  "imported": [...],
  "failed": []
}
```

**Test 3: Validation Error**

```bash
curl -X POST http://localhost:3000/api/import-csv \
  -F "file=@test-samples/test-invalid.csv"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "validation_errors": [...],
  "total_rows": 5,
  "failed_rows": 4
}
```

---

## Automated Testing Script

Create `test-import.sh`:

```bash
#!/bin/bash

# CSV Import System Test Script

API_URL="http://localhost:3000/api/import-csv"

echo "Testing CSV Import System..."
echo "=============================="

# Test 1: Valid import
echo -e "\nTest 1: Valid import"
RESPONSE=$(curl -s -X POST "$API_URL" -F "file=@test-samples/test-valid.csv")
echo $RESPONSE | jq '.success, .imported_count, .failed_count'

# Test 2: Preview mode
echo -e "\nTest 2: Preview mode"
RESPONSE=$(curl -s -X POST "$API_URL?preview=true" -F "file=@test-samples/test-valid.csv")
echo $RESPONSE | jq '.preview, .total_rows'

# Test 3: Invalid data
echo -e "\nTest 3: Invalid data"
RESPONSE=$(curl -s -X POST "$API_URL" -F "file=@test-samples/test-invalid.csv")
echo $RESPONSE | jq '.success, .error'

# Test 4: Large file
echo -e "\nTest 4: Large file"
START=$(date +%s)
RESPONSE=$(curl -s -X POST "$API_URL" -F "file=@test-samples/test-large.csv")
END=$(date +%s)
DURATION=$((END - START))
echo "Import time: ${DURATION}s"
echo $RESPONSE | jq '.imported_count, .failed_count'

echo -e "\n=============================="
echo "Tests completed!"
```

Run with:
```bash
chmod +x test-import.sh
./test-import.sh
```

---

## Manual Verification Checklist

After running tests, verify:

- [ ] All valid projects imported to database
- [ ] No duplicate projects created
- [ ] Import logs recorded correctly
- [ ] Validation catches all error types
- [ ] Progress bar works smoothly
- [ ] Error messages are helpful
- [ ] Success summary is accurate
- [ ] Template download works
- [ ] Drag and drop functions
- [ ] File size limit enforced
- [ ] File type validation works
- [ ] Preview mode doesn't import
- [ ] Large files process in batches
- [ ] UI is responsive and polished
- [ ] Modal can be closed properly

---

## Troubleshooting Test Failures

### Import Always Fails

**Check**:
- Database connection working?
- `projects` table exists?
- `import_logs` table created?
- API server running?

**Debug**:
```bash
# Check database
psql $DATABASE_URL -c "\dt"

# Check API logs
# Look in Vercel dashboard or console
```

### Validation Not Working

**Check**:
- CSV format correct (headers match)?
- File encoding is UTF-8?
- No extra commas or quotes?

**Debug**:
Open CSV in text editor and verify format exactly matches template.

### Preview Shows Wrong Data

**Check**:
- CSV headers match expected fields?
- Commas inside quotes handled correctly?

**Debug**:
Simplify CSV to minimal test case and retry.

### Progress Bar Doesn't Update

**Check**:
- Browser console for errors?
- Network tab shows API call?

**Debug**:
Progress simulation may need adjustment in component.

---

## Performance Profiling

To measure performance:

```javascript
// In import-csv.js
console.time('CSV Import');

// ... import logic ...

console.timeEnd('CSV Import');
```

Monitor:
- Parse time
- Validation time
- Database insert time
- Total time

Optimize:
- Batch size (currently 50)
- Database connection pooling
- Parsing options

---

## Test Coverage Summary

| Category | Test | Status |
|----------|------|--------|
| Happy Path | Valid import | ✓ |
| Validation | Invalid data | ✓ |
| Performance | Large file | ✓ |
| Duplicates | Duplicate detection | ✓ |
| UI | Drag and drop | ✓ |
| UI | File validation | ✓ |
| Preview | Preview mode | ✓ |
| Progress | Progress bar | ✓ |
| Recovery | Error recovery | ✓ |
| Mixed | Partial success | ✓ |
| Download | Template download | ✓ |
| Summary | Success screen | ✓ |
| Logging | Import logs | ✓ |
| Stress | Concurrent imports | ✓ |
| UI/UX | Responsive design | ✓ |
| Integration | Full app test | ✓ |
| API | Direct API test | ✓ |

---

**Last Updated**: November 24, 2025
**Version**: 1.0.0
