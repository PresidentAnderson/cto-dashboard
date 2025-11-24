# 🗄️ SUPABASE DATABASE SETUP

**Free PostgreSQL database for your CTO Dashboard (2 minutes)**

---

## 🚀 QUICK SETUP

### Step 1: Create Supabase Account (30 seconds)

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign in with **GitHub**

### Step 2: Create New Project (1 minute)

1. Click **"New Project"**
2. Fill in:
   - **Name:** `cto-dashboard`
   - **Database Password:** (generate strong password - save it!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free (500MB database, 2GB bandwidth)
3. Click **"Create new project"**
4. Wait 2 minutes for database to provision

### Step 3: Load Database Schema (1 minute)

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy the **ENTIRE** contents of `database/schema.sql` from your repository
4. Paste into SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for success message: "Success. No rows returned"

### Step 4: Get Connection String (30 seconds)

1. Click **"Settings"** (bottom left)
2. Click **"Database"**
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
6. **Save this** - you'll need it for Vercel

---

## 🔧 CONFIGURE VERCEL WITH DATABASE

### Step 1: Add Environment Variable to Vercel

1. Go to **https://vercel.com/dashboard**
2. Click your **"cto-dashboard"** project
3. Click **"Settings"** tab
4. Click **"Environment Variables"** (left sidebar)
5. Add new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** (paste your Supabase connection string)
   - **Environments:** Check all (Production, Preview, Development)
6. Click **"Save"**

### Step 2: Redeploy

1. Go to **"Deployments"** tab
2. Click the **3 dots** on latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes

---

## ✅ VERIFY IT'S WORKING

### Test API Health Check

Open in browser:
```
https://cto-dashboard-hvthyl8to-axaiinovation.vercel.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T...",
  "database": "connected"
}
```

### Test Dashboard KPIs

Open in browser:
```
https://cto-dashboard-hvthyl8to-axaiinovation.vercel.app/api/dashboard/kpis
```

Should return:
```json
{
  "success": true,
  "data": {
    "critical_bugs": 0,
    "high_bugs": 0,
    ...
  }
}
```

### Test Frontend

Open:
```
https://cto-dashboard-hvthyl8to-axaiinovation.vercel.app
```

Should see dashboard with tabs (may show 0 data - that's ok, we'll seed next)

---

## 🌱 SEED DATABASE WITH SAMPLE DATA

### Option 1: Via Supabase SQL Editor (Easiest)

1. Go to Supabase dashboard
2. Click **"SQL Editor"**
3. Create new query
4. Copy contents of `backend/seed.js`
5. Convert to SQL INSERT statements (or use Option 2)

### Option 2: Via Local Script (Recommended)

1. Install dependencies locally:
   ```bash
   cd backend
   npm install
   ```

2. Create `.env` file with Supabase connection:
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```

3. Run seed script:
   ```bash
   node -e "
   require('dotenv').config();
   const { Pool } = require('pg');
   const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
   // Then run your seed.js logic
   "
   ```

### Option 3: Manual SQL Inserts

Copy this SQL and run in Supabase SQL Editor:

```sql
-- Insert sample users
INSERT INTO users (name, email, role) VALUES
  ('Sarah Chen', 'sarah@company.com', 'senior_engineer'),
  ('Mike Rodriguez', 'mike@company.com', 'engineer'),
  ('Alice Johnson', 'alice@company.com', 'senior_engineer'),
  ('David Kim', 'david@company.com', 'engineer'),
  ('Emily Watson', 'emily@company.com', 'qa_engineer'),
  ('CTO Admin', 'cto@company.com', 'cto');

-- Insert sample projects
INSERT INTO projects (name, status, complexity, client_appeal, year3_revenue, dcf_valuation) VALUES
  ('Feature X', 'shipped', 2, 9, 4000000, 15000000),
  ('Project Y', 'active', 4, 6, 12000000, 50000000),
  ('Project Z', 'deferred', 3, 3, 1000000, 3000000);

-- Add more INSERT statements from seed.js as needed
```

---

## 📊 SUPABASE DASHBOARD FEATURES

### Database Explorer
- Click **"Table Editor"** to view data
- Browse `bugs`, `projects`, `users` tables
- Edit data directly in UI

### SQL Editor
- Run custom queries
- View query history
- Export results

### Database Backups
- Free plan: Daily backups (7 days retention)
- Paid plans: Point-in-time recovery

### Monitoring
- View connection stats
- See query performance
- Monitor database size

---

## 💰 PRICING

### Free Tier (What You Get)
- ✅ 500MB database storage
- ✅ 2GB bandwidth
- ✅ Daily backups (7 days)
- ✅ Up to 500MB API requests
- ✅ Unlimited API requests
- ✅ Community support

**Perfect for:**
- Development
- Small demos
- <100 users
- <10,000 bugs/projects

### Pro Tier ($25/month)
- 8GB database storage
- 250GB bandwidth
- Daily backups (14 days)
- Priority support

**Needed when:**
- >500MB data
- >100 concurrent users
- >10,000 records

---

## 🔒 SECURITY BEST PRACTICES

### 1. Row-Level Security (RLS)

Enable RLS in Supabase:
```sql
-- Enable RLS on tables
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies (example: read-only for anonymous)
CREATE POLICY "Allow public read" ON bugs
  FOR SELECT USING (true);
```

### 2. Database Password

- ✅ Use generated strong password (don't create your own)
- ✅ Never commit to git
- ✅ Store in Vercel environment variables only

### 3. Connection Pooling

Supabase includes connection pooling by default.

---

## 🐛 TROUBLESHOOTING

### "Could not connect to database"

1. Check DATABASE_URL is correct in Vercel
2. Verify Supabase project is active (not paused)
3. Check SSL is enabled: `?sslmode=require` in connection string

### "Relation 'bugs' does not exist"

Schema not loaded. Re-run `database/schema.sql` in SQL Editor.

### "Too many connections"

Free tier limit reached. Upgrade to Pro or reduce concurrent requests.

### Dashboard shows empty data

Database is connected but no data seeded. Run seed script or manual inserts.

---

## ✅ CHECKLIST

- [ ] Supabase account created
- [ ] New project "cto-dashboard" created
- [ ] Schema loaded (schema.sql)
- [ ] Connection string copied
- [ ] DATABASE_URL added to Vercel
- [ ] Vercel redeployed
- [ ] Health check returns "connected"
- [ ] Sample data seeded (optional)
- [ ] Dashboard showing data

---

## 🎉 YOU'RE DONE!

Your CTO Dashboard is now:
- ✅ Frontend on Vercel
- ✅ Backend on Vercel (serverless)
- ✅ Database on Supabase (PostgreSQL)
- ✅ Fully deployed and accessible

**Total cost:** $0/month (using free tiers)

**Next:** Open your dashboard and start tracking bugs!

**URL:** https://cto-dashboard-hvthyl8to-axaiinovation.vercel.app
