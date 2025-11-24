# 🚀 VERCEL DEPLOYMENT GUIDE

Deploy your CTO Dashboard to Vercel in 5 minutes.

---

## 📋 PREREQUISITES

- GitHub account (repository already created: https://github.com/PresidentAnderson/cto-dashboard)
- Vercel account (free tier is fine)

---

## 🚀 DEPLOY FRONTEND TO VERCEL

### Option 1: Via Vercel Dashboard (Easiest - 3 minutes)

1. **Go to Vercel**
   - Visit https://vercel.com/new
   - Sign in with GitHub

2. **Import Repository**
   - Click "Import Project"
   - Select "Import Git Repository"
   - Search for `presidentanderson/cto-dashboard`
   - Click "Import"

3. **Configure Build Settings**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Environment Variables**
   Add this environment variable:
   ```
   VITE_API_URL=http://localhost:5000
   ```
   (We'll update this after deploying the backend)

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your frontend will be live at: `https://cto-dashboard-xxx.vercel.app`

### Option 2: Via Vercel CLI (Advanced - 2 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project's name? cto-dashboard
# - In which directory is your code located? ./
# - Want to modify settings? No

# Production deployment
vercel --prod
```

---

## 🔧 DEPLOY BACKEND API

### Option 1: Railway (Recommended - Free tier)

1. **Go to Railway**
   - Visit https://railway.app
   - Sign in with GitHub

2. **New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `presidentanderson/cto-dashboard`

3. **Configure Service**
   - Root Directory: `backend`
   - Start Command: `npm start`
   - Add PostgreSQL database:
     - Click "+ New"
     - Select "Database" → "PostgreSQL"
     - Railway will auto-create database and provide connection string

4. **Environment Variables**
   Railway auto-provides `DATABASE_URL`. Add these:
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 3-4 minutes
   - Get your API URL: `https://cto-dashboard-api-xxx.up.railway.app`

6. **Seed Database**
   - Go to Railway dashboard
   - Click on your service
   - Open "Settings" → "Service"
   - Run custom command: `npm run seed`

### Option 2: Render (Alternative - Free tier)

1. Visit https://render.com
2. Create "Web Service" from GitHub
3. Select `presidentanderson/cto-dashboard`
4. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add PostgreSQL database
6. Deploy

### Option 3: Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create cto-dashboard-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git subtree push --prefix backend heroku main

# Seed database
heroku run npm run seed
```

---

## 🔗 CONNECT FRONTEND TO BACKEND

After deploying both:

1. **Get Backend URL**
   - Railway: `https://cto-dashboard-api-xxx.up.railway.app`
   - Render: `https://cto-dashboard-api.onrender.com`
   - Heroku: `https://cto-dashboard-api.herokuapp.com`

2. **Update Frontend Environment Variable**
   - Go to Vercel dashboard
   - Select your project
   - Settings → Environment Variables
   - Update `VITE_API_URL` to your backend URL
   - Redeploy frontend

3. **Update Backend CORS**
   - Go to your backend hosting (Railway/Render/Heroku)
   - Add environment variable:
     ```
     CORS_ORIGINS=https://cto-dashboard-xxx.vercel.app
     ```

---

## ✅ VERIFY DEPLOYMENT

### Frontend
- Visit your Vercel URL: `https://cto-dashboard-xxx.vercel.app`
- Should see dashboard with KPI cards
- Click all 4 tabs (Overview, Bugs, Projects, Analytics)

### Backend
- Test API health:
  ```bash
  curl https://your-api-url/health
  ```
- Test endpoints:
  ```bash
  curl https://your-api-url/api/dashboard/kpis
  curl https://your-api-url/api/bugs
  ```

### Full System
- Open frontend
- Check browser console (no errors)
- Click Bug Tracker tab → bugs should load
- Click Projects tab → projects should load
- Click Analytics tab → charts should render

---

## 🎯 DEPLOYMENT SUMMARY

### What You'll Have

**Frontend (Vercel):**
- URL: `https://cto-dashboard-xxx.vercel.app`
- Auto-deploy on git push
- Global CDN
- Free SSL
- Cost: **$0/month** (Hobby plan)

**Backend (Railway):**
- URL: `https://cto-dashboard-api-xxx.up.railway.app`
- PostgreSQL database included
- Auto-deploy on git push
- Cost: **$5/month** (with database)

**Total Cost:** **$5/month** for full production system

---

## 🔐 PRODUCTION CHECKLIST

Before sharing publicly:

- [ ] Add authentication (currently open API)
- [ ] Set strong database password
- [ ] Configure CORS for specific domains only
- [ ] Enable rate limiting
- [ ] Set up monitoring (Vercel Analytics, Railway Observability)
- [ ] Configure database backups
- [ ] Add custom domain (optional)

---

## 🚀 QUICK START COMMANDS

```bash
# Frontend (Vercel)
cd frontend
vercel --prod

# Backend (Railway)
# Use Railway dashboard or CLI:
railway login
railway init
railway up

# Full deployment
git push origin main  # Auto-deploys both if configured
```

---

## 📞 TROUBLESHOOTING

### Frontend shows "Error fetching bugs"
- Check `VITE_API_URL` environment variable in Vercel
- Verify backend is running: `curl https://your-api-url/health`
- Check CORS settings in backend

### Backend returns 500 errors
- Check environment variables are set
- Verify database connection
- Check logs: Railway dashboard → Deployments → View Logs
- Ensure database is seeded: `npm run seed`

### Database connection failed
- Verify `DATABASE_URL` or individual DB_* variables
- Check database is running (Railway/Render dashboard)
- Ensure schema is loaded (re-run seed script)

---

## 🎉 YOU'RE LIVE!

Your CTO Dashboard is now deployed and accessible worldwide:

- **Frontend:** https://cto-dashboard-xxx.vercel.app
- **Backend:** https://cto-dashboard-api-xxx.up.railway.app

Share the frontend URL with your team!

---

## 📊 MONITORING

### Vercel
- Visit https://vercel.com/dashboard
- Click your project
- See: Deployments, Analytics, Logs

### Railway
- Visit https://railway.app/dashboard
- Click your project
- See: Deployments, Metrics, Logs

---

**Next steps:**
1. Share frontend URL with stakeholders
2. Add authentication (see `docs/HANDOFF.md`)
3. Connect to real data sources
4. Customize for your needs

**Your dashboard is live!** 🚀
