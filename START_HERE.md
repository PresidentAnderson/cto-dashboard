# 🚀 START HERE - CTO Dashboard Setup

**Time Required:** 5 minutes total

---

## Step 1: Create Database Tables (2 min)

1. Open Supabase SQL Editor:
   **👉 https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new**

2. Open the file `database/schema.sql` in your project

3. Copy all contents (Cmd+A, then Cmd+C)

4. Paste into the SQL Editor

5. Click **"Run"** button (or Cmd+Enter)

6. Wait 10 seconds - you should see green checkmarks ✅

---

## Step 2: Create Your Admin Account (2 min)

In the SAME SQL Editor, paste this and click Run:

```sql
-- Create your admin account
INSERT INTO users (email, name, role, created_at, updated_at)
VALUES (
  'jonathan.mitchell.anderson@gmail.com',
  'Jonathan Anderson',
  'cto',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();

-- Store your password hash
INSERT INTO audit_log (action, entity_type, details, created_at)
VALUES (
  'password_created',
  'user',
  '{"email": "jonathan.mitchell.anderson@gmail.com", "password_hash": "2550682da9a7ddcec21eaf1863bcdcd6e48fcadc0e1250c11eb8229fe4bc3a1f"}',
  NOW()
);
```

---

## Step 3: Login (1 min)

1. Go to your dashboard:
   **👉 https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app**

2. Enter your credentials:
   - **Email:** jonathan.mitchell.anderson@gmail.com
   - **Password:** J0n8th8n

3. Click "Login"

4. **You're in!** 🎉

---

## Next: Import Your Projects

Once logged in, run this to import 10 projects:

```bash
cd cto-dashboard
./import-via-supabase.sh
```

---

## Need Help?

- **Full Guide:** `SETUP_SOLUTION.md`
- **Troubleshooting:** `ADMIN_ACCOUNT_SETUP.md`
- **Customization:** `CUSTOMIZATION_GUIDE.md`

---

**That's it! Get started with Step 1 now!** 🚀
