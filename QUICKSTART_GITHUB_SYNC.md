# GitHub Sync - Quick Start

## 🚀 3-Minute Setup

### 1. Run Database Migration (30 seconds)
```bash
cd /path/to/cto-dashboard
chmod +x run-migration.sh
./run-migration.sh
```

### 2. Add GitHub Token (1 minute)
```bash
# Create token at: https://github.com/settings/tokens
# Scope: public_repo (read-only)
# Add to .env.local:
echo "GITHUB_TOKEN=ghp_your_token_here" >> .env.local
```

### 3. Test Sync (2 minutes)
```bash
node test-github-sync.js PresidentAnderson
```

## ✅ That's it! System is ready.

---

## 📡 API Usage

### Trigger Sync
```bash
curl -X POST http://localhost:5000/api/sync-github \
  -H "Content-Type: application/json" \
  -d '{"username": "PresidentAnderson"}'
```

### Check Status
```bash
curl http://localhost:5000/api/sync-github/status?username=PresidentAnderson
```

### View History
```bash
curl http://localhost:5000/api/sync-github/history
```

---

## 🎨 UI Integration

```jsx
import GitHubSyncButton from './components/GitHubSyncButton';

<GitHubSyncButton username="PresidentAnderson" />
```

---

## 📊 Monitor Progress

### In Browser
Navigate to: `http://localhost:5000/api/sync-github/status`

### In Database
```sql
SELECT * FROM import_logs
WHERE import_type = 'github_sync'
ORDER BY created_at DESC
LIMIT 5;
```

### In Logs
```bash
tail -f backend/combined.log | grep github
```

---

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `backend/lib/github-sync.js` | Core sync logic |
| `backend/routes/sync-github.js` | API routes |
| `database/migrations/001_add_import_logs.sql` | Database schema |
| `test-github-sync.js` | Test script |
| `frontend/src/components/GitHubSyncButton.jsx` | UI component |
| `GITHUB_SYNC_GUIDE.md` | Full documentation (600+ lines) |

---

## ⚡ Performance

| Repos | Time | Token Required |
|-------|------|----------------|
| 50 | 30-45s | Optional |
| 150 | 2-3 min | Recommended |
| 300+ | 5-7 min | **Required** |

---

## 🐛 Troubleshooting

**Rate limit error?**
→ Add `GITHUB_TOKEN` to `.env.local`

**Connection error?**
→ Check database credentials in `.env.local`

**Sync stuck?**
→ `curl -X POST http://localhost:5000/api/sync-github/cancel -d '{"username":"PresidentAnderson"}'`

---

## 📖 Full Documentation

For detailed information, see:
- **`GITHUB_SYNC_GUIDE.md`** - Complete guide (600+ lines)
- **`GITHUB_SYNC_IMPLEMENTATION.md`** - Technical details

---

## 🎯 What It Does

1. **Fetches all repos** from GitHub (handles 200+)
2. **Calculates health scores** (0-100) based on activity
3. **Determines complexity** (1-5) based on language
4. **Extracts tech stack** from topics + language
5. **Upserts to database** (creates or updates)
6. **Logs everything** to `import_logs` table
7. **Handles errors** with retry logic
8. **Respects rate limits** automatically

---

## 🔐 Environment Variables

```bash
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cto_dashboard
DB_USER=postgres
DB_PASSWORD=your_password

# Recommended
GITHUB_TOKEN=ghp_your_token_here

# Already Set
AI_GATEWAY_API_KEY=vck_3FGj25fwZpbvJOsIkj7cG8HHhurSXfF6wAB3l13Fl4NwWW98HB3MZXJL
```

---

**Ready to sync? Run:** `node test-github-sync.js PresidentAnderson`
