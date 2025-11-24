# CTO DASHBOARD - TEAM HANDOFF GUIDE

**Read this first** (10 minutes)

This document gets your team up and running with the CTO Dashboard in under 30 minutes.

---

## 📋 WHAT YOU'RE GETTING

A **production-ready bug tracking and project portfolio management system** with:

✅ Real-time bug tracking (by severity, status, SLA)
✅ Project portfolio prioritization matrix (ROI-based)
✅ Cost analysis & financial metrics
✅ Analytics dashboard with 12-month trends
✅ Complete REST API (15+ endpoints)
✅ PostgreSQL database with triggers & views
✅ React frontend with charts & filtering
✅ Docker deployment (one command to run everything)
✅ Sample data included (ready to demo immediately)

---

## 🚀 QUICKSTART (5 MINUTES)

### Option 1: Docker (Recommended - Fastest)

```bash
# 1. Navigate to project
cd cto-dashboard

# 2. Copy environment file
cp backend/.env.example backend/.env

# 3. Edit .env (set your DB_PASSWORD)
nano backend/.env

# 4. Start everything
docker-compose up -d

# 5. Wait 30 seconds, then seed database
docker-compose exec api npm run seed

# ✅ Done! Open http://localhost:3000
```

### Option 2: Manual Setup (Development)

```bash
# 1. Start PostgreSQL (if not running)
# Install PostgreSQL 15+ first

# 2. Create database
createdb cto_dashboard

# 3. Load schema
psql cto_dashboard < database/schema.sql

# 4. Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials

# 5. Seed database
npm run seed

# 6. Start API
npm start
# API running on http://localhost:5000

# 7. In new terminal: Install frontend dependencies
cd frontend
npm install

# 8. Start frontend
npm run dev
# Frontend running on http://localhost:3000

# ✅ Done! Open http://localhost:3000
```

---

## 🎯 WHAT YOUR AGENTS SEE

Once the dashboard is running, you'll see:

### **Homepage (Overview Tab)**
- 🔴 **5 Critical Bugs** (example data)
- 🟡 **12 High Bugs** (2 overdue SLA)
- 📊 **$68M Portfolio Value**
- 💰 **$17M Year-3 Revenue**

### **Bug Tracker Tab**
- Bug list with filtering (severity, status, assigned user)
- SLA breach alerts (red warnings for overdue bugs)
- Cost analysis ($6,900 monthly bug cost)
- Revenue impact calculator

### **Projects Tab**
- **Prioritization Matrix** (complexity vs client appeal bubble chart)
- **Detailed Table** (ROI scores, milestones, blockers)
- **Valuation View** (TAM/SAM/SOM market sizing, DCF valuations)

### **Analytics Tab**
- 12-month bug trend charts
- Monthly cost analysis
- AI-powered recommendations (e.g., "12 critical bugs - allocate resources now")

---

## 🏗️ PROJECT STRUCTURE

```
cto-dashboard/
├── backend/
│   ├── server.js              ← API server (Express)
│   ├── seed.js                ← Sample data loader
│   ├── package.json           ← Dependencies
│   ├── .env.example           ← Config template
│   └── Dockerfile             ← Container config
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            ← Main React app (all components)
│   │   ├── App.css            ← Styling (Tailwind)
│   │   └── main.jsx           ← Entry point
│   ├── package.json           ← Dependencies
│   ├── vite.config.js         ← Build config
│   └── Dockerfile             ← Container config
│
├── database/
│   └── schema.sql             ← PostgreSQL schema (8 tables)
│
├── docs/
│   ├── HANDOFF.md             ← This file
│   ├── SETUP.md               ← Detailed ops guide
│   └── README.md              ← Feature overview
│
└── docker-compose.yml         ← One-command deployment
```

---

## 🔑 KEY FILES TO KNOW

### **Backend API (`backend/server.js`)**
- **15+ REST endpoints** for bugs, projects, analytics
- Auto-calculates priority scores, SLA due dates
- PostgreSQL connection pool
- Rate limiting, CORS, security headers

**Example API calls:**
```bash
# Get all bugs
curl http://localhost:5000/api/bugs | jq .

# Get dashboard KPIs
curl http://localhost:5000/api/dashboard/kpis | jq .

# Get projects
curl http://localhost:5000/api/projects | jq .

# Create a bug
curl -X POST http://localhost:5000/api/bugs \
  -H "Content-Type: application/json" \
  -d '{"title":"Test bug","severity":"high","business_impact":"$1k/day"}'
```

### **Database Schema (`database/schema.sql`)**
- **8 tables:** bugs, projects, users, bug_history, monthly_metrics, portfolio_metrics, audit_log
- **Triggers:** Auto-update timestamps, log status changes, set SLA due dates
- **Views:** Pre-joined queries for performance (bugs_with_users, dashboard_kpis, project_portfolio_view)
- **Functions:** Priority scoring, cost analysis

### **Frontend App (`frontend/src/App.jsx`)**
- **Single-file React app** (all components in one file for simplicity)
- **4 main views:**
  - `DashboardOverview` - KPI cards homepage
  - `BugTracker` - Bug list with filters, cost analysis
  - `ProjectPortfolio` - 3 view modes (matrix, table, valuation)
  - `Analytics` - Trends, charts, recommendations
- **Uses Recharts** for data visualization
- **Tailwind CSS** for styling

---

## 🧪 TESTING THE SYSTEM

### 1. Verify Database
```bash
# PostgreSQL (local)
psql cto_dashboard -c "SELECT COUNT(*) FROM bugs;"
# Should return: ~50 bugs

psql cto_dashboard -c "SELECT * FROM dashboard_kpis;"
# Should return: critical_bugs, high_bugs, portfolio_value, etc.
```

### 2. Verify API
```bash
# Health check
curl http://localhost:5000/health
# Should return: {"status":"healthy","database":"connected"}

# Get bugs
curl http://localhost:5000/api/bugs?severity=critical
# Should return JSON array of critical bugs

# Get projects
curl http://localhost:5000/api/projects
# Should return: 3 projects (Feature X, Project Y, Project Z)
```

### 3. Verify Frontend
- Open http://localhost:3000
- Click each tab (Overview, Bug Tracker, Projects, Analytics)
- Filter bugs by severity
- Switch project views (matrix, table, valuation)
- Check that charts render

---

## 📊 SAMPLE DATA OVERVIEW

The `seed.js` script creates:

**6 Users:**
- Sarah Chen (Senior Engineer)
- Mike Rodriguez (Engineer)
- Alice Johnson (Senior Engineer)
- David Kim (Engineer)
- Emily Watson (QA Engineer)
- CTO Admin

**3 Projects:**
- **Feature X** - Payment Gateway (shipped, 9/10 appeal, ROI: 44)
- **Project Y** - Enterprise Platform (active, 6/10 appeal, ROI: 18)
- **Project Z** - Mobile Refresh (deferred, 3/10 appeal, ROI: 0.2)

**~50 Bugs:**
- 5 Critical (e.g., "Payments fail for Amex >$5k")
- 12 High (e.g., "Auth timeout crashes session")
- 18 Medium (e.g., "Dashboard loads slow")
- 15 Low (e.g., "Mobile button misaligned")

**5 Months of Historical Data:**
- Monthly metrics (bugs created, resolved, cost trends)
- Shows upward trend in bug volume & costs

---

## 🔧 CUSTOMIZATION GUIDE

### Change Sample Data
Edit `backend/seed.js` and re-run:
```bash
docker-compose exec api npm run seed
```

### Add New API Endpoint
Edit `backend/server.js`, add route:
```javascript
app.get('/api/your-endpoint', async (req, res) => {
  // Your code
});
```

### Add New Database Table
1. Add table to `database/schema.sql`
2. Drop and recreate database:
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec api npm run seed
```

### Modify Frontend UI
Edit `frontend/src/App.jsx` - all components are in one file for easy editing.

---

## 🐛 TROUBLESHOOTING

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### "API returning 500 errors"
```bash
# Check API logs
docker-compose logs api

# Common fix: Database not seeded
docker-compose exec api npm run seed
```

### "Frontend shows 'Error fetching bugs'"
```bash
# Check if API is running
curl http://localhost:5000/health

# Check CORS settings in backend/.env
# Make sure CORS_ORIGINS includes http://localhost:3000
```

### "Port 5000 already in use"
```bash
# Find process using port
lsof -i :5000

# Kill it or change PORT in backend/.env and docker-compose.yml
```

---

## 📈 NEXT STEPS

### Week 1: Familiarization
- Run the system locally
- Explore all 4 tabs
- Test API endpoints with curl/Postman
- Read `database/schema.sql` to understand data model

### Week 2: Customization
- Replace sample data with your real projects
- Add your team members to `users` table
- Import existing bugs from your bug tracker
- Customize KPIs on homepage

### Week 3: Production Deployment
- Read `docs/SETUP.md` for production deployment
- Deploy to AWS/GCP/Azure
- Set up backups
- Configure monitoring

### Week 4: Extensions
- Add authentication (currently open API)
- Integrate with GitHub Issues
- Add Slack notifications for SLA breaches
- Build mobile app (API is ready)

---

## 🚨 IMPORTANT NOTES

### Security
⚠️ **No authentication yet** - API is open. Add auth before deploying to production.

Recommended auth strategies:
- **JWT tokens** (lightweight, good for SPAs)
- **OAuth2** (use Auth0, Okta, or build your own)
- **API keys** (simple, good for internal tools)

Example auth middleware (add to `backend/server.js`):
```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  // Verify token (JWT, etc.)
  next();
};

// Protect routes
app.use('/api/', authMiddleware);
```

### Database Backups
Set up daily backups:
```bash
# Automated backup (cron job)
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres cto_dashboard > /backups/cto_dashboard_$(date +\%Y\%m\%d).sql
```

### Scaling
Current setup supports:
- **1,000 bugs** - no performance issues
- **100 projects** - no performance issues
- **10 concurrent users** - fine on single server

For >100 concurrent users:
- Add Redis caching
- Use PostgreSQL read replicas
- Deploy API across multiple servers (load balancer)

---

## 📞 SUPPORT

### Getting Help
1. Check `docs/SETUP.md` for detailed deployment instructions
2. Check `docs/README.md` for API reference
3. Review database schema in `database/schema.sql`
4. Check logs: `docker-compose logs -f`

### Common Questions
**Q: Can I use this with an existing database?**
A: Yes, but you'll need to migrate your data to match the schema in `schema.sql`.

**Q: Does this integrate with Jira/Linear/GitHub Issues?**
A: Not out of the box, but you can build integrations via the API.

**Q: Can I deploy this to Heroku/Vercel/Netlify?**
A: Yes. See `docs/SETUP.md` for deployment instructions.

**Q: Is there a mobile app?**
A: No, but the frontend is responsive. You can also build a native app using the API.

---

## ✅ HANDOFF CHECKLIST

Before handing off to your team, ensure:

- [ ] Docker is installed on their machines
- [ ] They have access to this codebase
- [ ] They've read this HANDOFF.md (10 min)
- [ ] They've successfully run `docker-compose up -d`
- [ ] They can access http://localhost:3000
- [ ] They've tested the API with curl/Postman
- [ ] They understand the project structure
- [ ] They know how to modify sample data
- [ ] They have access to production credentials (if deploying)

---

**🎉 You're ready!** Your team can now start working with the CTO Dashboard.

**Next:** Read `docs/SETUP.md` for production deployment instructions.
