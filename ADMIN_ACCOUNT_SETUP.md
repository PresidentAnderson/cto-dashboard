# 🔐 Admin Account Setup Guide

**Status:** ⚠️ Database tables need to be created first

---

## Current Situation

Your dashboard is deployed at:
**https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app**

However, the database tables haven't been initialized yet. The `users` table doesn't exist in your Supabase database.

---

## Quick Setup (5 minutes)

### Step 1: Create Database Tables (2 minutes)

**Option A: Supabase SQL Editor (Recommended)**

1. Go to Supabase SQL Editor:
   - https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql

2. Click **"New Query"**

3. Copy the entire contents of `database/schema.sql` (409 lines)

4. Paste into the SQL editor

5. Click **"Run"** (or press Cmd+Enter)

6. You should see: ✅ Success messages for all tables created

**Option B: Using psql Command Line**

```bash
# If you have PostgreSQL client installed
cd cto-dashboard
chmod +x init-database.sh
./init-database.sh
```

---

### Step 2: Create Admin Account (1 minute)

**After tables are created**, run this script:

```bash
cd cto-dashboard
chmod +x create-admin-via-api.sh
./create-admin-via-api.sh
```

This will create your admin account with:
- **Email:** jonathan.mitchell.anderson@gmail.com
- **Password:** J0n8th8n
- **Role:** cto

---

### Step 3: Login (30 seconds)

1. Go to: https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app

2. Enter your credentials:
   - Email: jonathan.mitchell.anderson@gmail.com
   - Password: J0n8th8n

3. Click **"Login"**

4. You should see the dashboard! 🎉

---

## What Tables Will Be Created?

The `database/schema.sql` file creates:

### Core Tables (7)
1. **users** - User accounts and authentication
2. **bugs** - Bug tracking system
3. **projects** - Project portfolio
4. **bug_history** - Audit trail for bug changes
5. **monthly_metrics** - Analytics snapshots
6. **portfolio_metrics** - Portfolio summaries
7. **audit_log** - System-wide audit trail

### Views (3)
- `bugs_with_users` - Bugs with user details
- `dashboard_kpis` - Real-time KPI calculations
- `project_portfolio_view` - Projects with calculated metrics

### Functions (3)
- `calculate_bug_priority_score()` - Auto-calculate bug priority
- `get_bug_cost_analysis()` - Financial impact analysis
- `update_updated_at_column()` - Auto-update timestamps

### Triggers (5)
- Auto-update `updated_at` on users, bugs, projects
- Auto-set SLA hours based on bug severity
- Track bug changes in history table

### Indexes (34)
- Performance indexes on all key columns
- Full-text search on bug titles/descriptions
- Composite indexes for common queries

---

## Troubleshooting

### "relation public.users does not exist"

This means the database tables haven't been created yet. Follow **Step 1** above.

### "Cannot connect to database"

Check that you're using the correct database credentials:
- **Host:** db.iithtbuedvwmtbagquxy.supabase.co
- **Database:** postgres
- **User:** postgres
- **Password:** Success*2026$$$
- **Port:** 5432

### "Vercel Deployment Protection" Error

The `create-admin-via-api.sh` script bypasses this by writing directly to the database using Supabase REST API.

### Login Still Fails After Creating Account

1. Verify user was created:
   ```bash
   curl -X GET "https://iithtbuedvwmtbagquxy.supabase.co/rest/v1/users?email=eq.jonathan.mitchell.anderson@gmail.com" \
     -H "apikey: sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35" \
     -H "Authorization: Bearer sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35"
   ```

2. Check audit_log for password hash:
   ```bash
   curl -X GET "https://iithtbuedvwmtbagquxy.supabase.co/rest/v1/audit_log?action=eq.password_created&order=created_at.desc&limit=1" \
     -H "apikey: sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35" \
     -H "Authorization: Bearer sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35"
   ```

3. Try the browser console registration method (from SUCCESS_REPORT.md line 109):
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
   .then(data => console.log('Success!', data));
   ```

---

## Files Created

| File | Purpose |
|------|---------|
| `database/schema.sql` | Complete database schema (409 lines) |
| `create-admin-via-api.sh` | Creates admin account via Supabase API |
| `create-admin-user.sql` | SQL script to create admin user |
| `init-database.sh` | Initializes database schema via psql |
| `ADMIN_ACCOUNT_SETUP.md` | This guide |

---

## Next Steps After Login

Once you're logged in:

1. **Import Projects**
   - You already have 10 projects in `github-repos-data.json`
   - Run: `./import-via-supabase.sh` (if not already done)
   - Or use the dashboard UI: Projects → Import Projects

2. **Sync GitHub Repositories**
   - Dashboard → Projects → "Sync from GitHub"
   - This will import all 180+ repositories from your GitHub account

3. **Add Team Members**
   - Dashboard → Users → Add User
   - Roles: cto, manager, engineer, qa_engineer, viewer

4. **Customize Branding**
   - See `CUSTOMIZATION_GUIDE.md`
   - Change company name, logo, colors

5. **Import Bugs Data**
   - Dashboard → Bugs → Import Bugs
   - Or use API endpoint: POST `/api/bugs/import`

---

## Security Notes

### Current Setup (Development)
- Password hashing: SHA-256 with JWT_SECRET salt
- Passwords stored in `audit_log.details` JSON column (temporary)
- JWT tokens expire after 7 days
- Simple authentication without rate limiting on login

### Production Recommendations
1. Add `password_hash` column to `users` table
2. Use bcrypt/argon2 instead of SHA-256
3. Enable rate limiting on `/api/auth/login`
4. Add password complexity requirements
5. Implement 2FA/TOTP
6. Change JWT_SECRET from default
7. Set up password reset flow
8. Add account lockout after failed attempts

---

## Support

If you encounter any issues:

1. Check the database tables were created:
   - Go to Supabase: https://app.supabase.com/project/iithtbuedvwmtbagquxy/editor
   - You should see: users, bugs, projects, etc.

2. Check the user was created:
   - Supabase → Table Editor → users
   - Look for: jonathan.mitchell.anderson@gmail.com

3. Check the deployment:
   - Vercel: https://vercel.com/axaiinovation/cto-dashboard
   - Latest deployment should be live
   - Environment variables should be set

4. Check browser console:
   - Press F12 → Console tab
   - Look for any error messages during login

---

**Ready to get started?**

👉 Start with **Step 1: Create Database Tables** above!
