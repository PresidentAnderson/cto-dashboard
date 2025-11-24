# ⚡ Quick Start - Get Your Dashboard Running Now

**Time to Production: 5 minutes**

---

## Step 1: Set Database Password (30 seconds)

Your DATABASE_URL is already in `.env.local`, just replace the password:

1. Open `.env.local` in a text editor
2. Find this line:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres
   ```
3. Replace `[YOUR_PASSWORD]` with your Supabase database password
4. Save the file

**Don't know your password?**
- Go to https://app.supabase.com/project/iithtbuedvwmtbagquxy/settings/database
- Click "Reset Database Password" if needed
- Copy your password

---

## Step 2: Import Your Projects (1 minute)

Run this command from your project directory:

```bash
node import-local-data.js
```

This will import 10 projects from `github-repos-data.json` directly to your database.

Expected output:
```
🚀 CTO Dashboard - Local Data Import
══════════════════════════════════════════════════

📖 Reading: /path/to/github-repos-data.json
✅ Found 10 projects to import

🔌 Testing database connection...
✅ Database connected

📊 Importing projects:

  ✅ Imported: lexchronos-enterprise
  ✅ Imported: attorney-accountability
  ✅ Imported: aurora-booking-engine
  ... (7 more)

══════════════════════════════════════════════════

📈 Import Summary:

  ✅ Imported: 10
  ✏️  Updated:  0
  ❌ Failed:   0
  📊 Total:    10

✨ Import complete!
```

---

## Step 3: Add JWT_SECRET to Vercel (2 minutes)

1. Go to: https://vercel.com/axaiinovation/cto-dashboard/settings/environment-variables

2. Click **"Add New"** and enter:
   ```
   Key:    JWT_SECRET
   Value:  9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=
   ```

3. Click **"Add New"** again for DATABASE_URL:
   ```
   Key:    DATABASE_URL
   Value:  postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres
   ```
   *(Replace YOUR_ACTUAL_PASSWORD with your actual password)*

4. Select: **Production, Preview, and Development** for both

5. Click **"Save"**

---

## Step 4: Redeploy Vercel (1 minute)

1. Go to: https://vercel.com/axaiinovation/cto-dashboard

2. Click **"Deployments"** tab

3. Find the latest deployment (top of list)

4. Click the **three dots (•••)** on the right

5. Click **"Redeploy"**

6. Wait 2-3 minutes for deployment to complete

---

## Step 5: Create Admin Account (1 minute)

Once deployment is complete:

1. Open: https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app

2. Press `F12` to open Developer Tools

3. Go to **Console** tab

4. Paste this code (edit your details):

```javascript
fetch('https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'jonathan.mitchell.anderson@gmail.com',
    password: 'YourSecurePassword123!',
    name: 'Jonathan Anderson',
    role: 'cto'
  })
})
.then(r => r.json())
.then(data => console.log('Success!', data));
```

5. Press `Enter`

6. You should see: `Success! {success: true, token: "...", user: {...}}`

---

## Step 6: Login & Explore! (30 seconds)

1. Refresh the page

2. You'll see the login screen

3. Enter your credentials

4. Click **"Sign In"**

5. **You're in!** 🎉

---

## 🎯 What You'll See

### Dashboard
- **10 projects** from your import
- Real-time KPIs
- Health scores
- Analytics charts

### Projects Tab
- Table view with all 10 projects
- Search and filter
- Add/Edit/Delete buttons
- **"Import Projects"** button for more CSV imports
- **"Sync from GitHub"** button for live GitHub sync

### Features Ready to Use
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ CSV import with drag-and-drop
- ✅ GitHub sync (sync your 180+ repos)
- ✅ Analytics dashboard
- ✅ Bug tracking
- ✅ Portfolio management

---

## 🔄 Next Steps

### Sync More Projects from GitHub

1. Go to **Projects** tab
2. Click **"Sync from GitHub"** button
3. Enter username: `PresidentAnderson`
4. Wait ~30 seconds
5. All 180+ GitHub repos will be imported!

### Import More Data via CSV

1. Go to **Projects** tab
2. Click **"Import Projects"** button
3. Drag and drop your CSV file
4. Review preview
5. Click **"Import"**

### Customize Your Dashboard

See `CUSTOMIZATION_GUIDE.md` for:
- Branding (company name, logo, colors)
- Adding team members
- Custom analytics
- Deployment of AI agents

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL password is correct in .env.local
- Verify Supabase database is running
- Check connection string format

### "JWT token invalid"
- Make sure JWT_SECRET is set in Vercel
- Verify Vercel redeployment completed
- Clear browser cache and try again

### "Import script fails"
- Run `npm install pg` first
- Check DATABASE_URL is set correctly in .env.local
- Verify github-repos-data.json exists

### Login page doesn't appear
- Check Vercel deployment completed
- Clear browser cache (Cmd+Shift+R on Mac)
- Check browser console for errors

---

## 📚 Full Documentation

For detailed information, see:

- **`FINAL_SETUP_GUIDE.md`** - Complete setup instructions
- **`DEPLOYMENT_STATUS.md`** - Current status and blockers
- **`V2_COMPLETE_SUMMARY.md`** - Master documentation
- **`API_ENDPOINTS_REFERENCE.md`** - API documentation
- **`CUSTOMIZATION_GUIDE.md`** - Branding and features

---

## 🎉 You're Done!

Your professional CTO Dashboard is now live with:

✅ 10+ projects imported
✅ Authentication & user management
✅ Bug tracking system
✅ Project portfolio management
✅ Financial analytics
✅ Real-time KPIs
✅ Import/Export capabilities
✅ Responsive design
✅ Production-ready deployment

**Dashboard:** https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app

---

**Questions?** All documentation is in your project root. Start exploring your new dashboard! 🚀
