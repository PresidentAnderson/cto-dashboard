# 🔧 Database Setup Solution

**Issue:** Direct PostgreSQL connections to Supabase are being blocked by network/DNS issues.

**Solution:** Use Supabase SQL Editor (web interface) - it's the most reliable method.

---

## ✅ Complete Setup (5 Minutes)

### Step 1: Initialize Database Schema (2 minutes)

1. **Open Supabase SQL Editor:**
   👉 https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new

2. **Copy the schema:**
   - Open the file: `database/schema.sql` in your project
   - Select all (Cmd+A or Ctrl+A)
   - Copy (Cmd+C or Ctrl+C)

3. **Paste and execute:**
   - Paste into the SQL Editor
   - Click **"Run"** button (or press Cmd+Enter)
   - Wait ~10 seconds for execution

4. **Verify success:**
   - You should see green checkmarks
   - Message: "Success. No rows returned"

---

### Step 2: Create Admin User (1 minute)

**Option A: Using SQL Editor (Recommended)**

Paste this into the same SQL Editor and click Run:

```sql
-- Create admin user
INSERT INTO users (email, name, role, created_at, updated_at)
VALUES (
  'jonathan.mitchell.anderson@gmail.com',
  'Jonathan Anderson',
  'cto',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW()
RETURNING id, email, name, role;

-- Store password hash (SHA-256 with JWT_SECRET)
-- Password: J0n8th8n
-- JWT_SECRET: 9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=
-- Hash result: 2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f
INSERT INTO audit_log (action, entity_type, details, created_at)
VALUES (
  'password_created',
  'user',
  '{"email": "jonathan.mitchell.anderson@gmail.com", "password_hash": "2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f"}',
  NOW()
);
```

**Option B: Using Browser Console**

1. Go to: https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app
2. Press F12 → Console tab
3. Paste this code:

```javascript
fetch('https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'jonathan.mitchell.anderson@gmail.com',
    password: 'J0n8th8n',
    name: 'Jonathan Anderson',
    role: 'cto'
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✅ Admin account created!');
    console.log('Email:', data.user.email);
    console.log('Role:', data.user.role);
    console.log('Token:', data.token);
  } else {
    console.error('❌ Error:', data.error);
  }
});
```

4. Press Enter
5. Wait for response

---

### Step 3: Login (30 seconds)

1. Go to: https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app
2. Enter credentials:
   - **Email:** jonathan.mitchell.anderson@gmail.com
   - **Password:** J0n8th8n
3. Click "Login"
4. You're in! 🎉

---

## 🔍 Why This Approach?

**Technical Issue:**
- Direct PostgreSQL connections (`psql`, `pg` module, `psycopg2`) are blocked
- DNS resolution fails for `db.iithtbuedvwmtbagquxy.supabase.co:5432`
- Network/firewall restrictions preventing port 5432 access

**Why Supabase SQL Editor Works:**
- Uses HTTPS (port 443) instead of PostgreSQL protocol (port 5432)
- Web-based interface bypasses local network restrictions
- Direct connection to Supabase backend
- Most reliable method for initial setup

---

## 📋 What Gets Created?

### Tables (7)
1. **users** - User accounts & authentication
2. **bugs** - Bug tracking system
3. **projects** - Project portfolio
4. **bug_history** - Change audit trail
5. **monthly_metrics** - Analytics snapshots
6. **portfolio_metrics** - Portfolio summaries
7. **audit_log** - System-wide audit log

### Views (3)
- `bugs_with_users` - Bugs with assigned user details
- `dashboard_kpis` - Real-time KPI calculations
- `project_portfolio_view` - Projects with metrics

### Functions (3)
- `calculate_bug_priority_score()` - Auto-calculate priorities
- `get_bug_cost_analysis()` - Financial impact analysis
- `update_updated_at_column()` - Auto-update timestamps

### Triggers (5)
- Auto-update `updated_at` columns
- Auto-set SLA hours based on severity
- Track bug changes in history

### Indexes (34)
- Performance optimization on all key columns
- Full-text search capabilities
- Composite indexes for complex queries

---

## 🔐 Password Hashing Details

**Method:** SHA-256 with JWT_SECRET as salt
**Formula:** `SHA256(password + JWT_SECRET)`

**Your credentials:**
- Password: `J0n8th8n`
- JWT_SECRET: `9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=`
- Hash: `2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f`

This matches the implementation in `api/auth.js` line 71.

---

## ✅ Verification Checklist

After setup, verify everything works:

```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Should return: audit_log, bug_history, bugs, monthly_metrics, portfolio_metrics, projects, users

-- Check admin user exists
SELECT id, email, name, role, created_at
FROM users
WHERE email = 'jonathan.mitchell.anderson@gmail.com';
-- Should return: 1 row with your details

-- Check password hash stored
SELECT action, entity_type, details
FROM audit_log
WHERE action = 'password_created'
ORDER BY created_at DESC
LIMIT 1;
-- Should return: 1 row with password_hash in details JSON

-- Check database statistics
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM bugs) as bugs,
  (SELECT COUNT(*) FROM audit_log) as audit_entries;
-- Should return: users=1, projects=0, bugs=0, audit_entries=1
```

---

## 📝 Next Steps After Login

1. **Import Projects**
   ```bash
   ./import-via-supabase.sh
   ```
   Imports 10 projects from `github-repos-data.json`

2. **Sync GitHub Repositories**
   - Dashboard → Projects → "Sync from GitHub"
   - Imports all 180+ repositories

3. **Add Team Members**
   - Dashboard → Users → Add User
   - Assign roles: manager, engineer, qa_engineer, viewer

4. **Customize Branding**
   - See `CUSTOMIZATION_GUIDE.md`
   - Update company name, logo, colors

---

## 🆘 Troubleshooting

### "relation public.users does not exist"
→ Database tables haven't been created yet. Follow Step 1 above.

### "Vercel Deployment Protection" blocking login
→ Use the browser console method (Step 2, Option B) to create account directly.

### Login fails with correct credentials
→ Check that password hash was stored:
```sql
SELECT details FROM audit_log WHERE action = 'password_created';
```

### Still can't login
→ Try creating account via browser console (Step 2, Option B) which calls the `/api/auth/register` endpoint directly.

---

## 🎯 Quick Reference

| Step | Action | Time | URL |
|------|--------|------|-----|
| 1 | Execute schema.sql | 2 min | https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new |
| 2 | Create admin user | 1 min | (SQL Editor or Browser Console) |
| 3 | Login to dashboard | 30 sec | https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app |

---

## 📂 Files Reference

| File | Purpose |
|------|---------|
| `database/schema.sql` | Complete database schema (409 lines) |
| `SETUP_SOLUTION.md` | This guide |
| `ADMIN_ACCOUNT_SETUP.md` | Detailed setup instructions |
| `import-via-supabase.sh` | Import 10 projects |

---

**Ready? Start with Step 1!** 🚀

Open Supabase SQL Editor: https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new
