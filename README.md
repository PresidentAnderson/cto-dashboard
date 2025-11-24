# CTO DASHBOARD

> **Real-time Bug Tracking & Project Portfolio Management System**

A production-ready dashboard for tracking bugs, managing project portfolios, and analyzing engineering costs with real-time metrics and AI-powered insights.

![Dashboard Preview](https://via.placeholder.com/800x400?text=CTO+Dashboard+Preview)

---

## 🎯 Features

### 📊 Dashboard Overview
- **Real-time KPIs** - Critical bugs, high bugs, portfolio value, year-3 revenue projections
- **Live updates** - Auto-refresh every 30 seconds
- **Visual status** - Color-coded severity badges and status indicators

### 🐛 Bug Tracker
- **Smart Filtering** - By severity (critical/high/medium/low), status, blocker flag
- **SLA Monitoring** - Automatic breach detection with visual alerts
  - Critical: 4 hours
  - High: 24 hours
  - Medium: 72 hours
  - Low: 30 days
- **Cost Analysis** - Engineering hours, estimated costs ($150/hour), revenue impact
- **Priority Scoring** - Algorithmic ranking based on severity, impact, aging, blocker status
- **Business Impact Tracking** - Revenue loss quantification for each bug

### 📁 Project Portfolio
- **3 View Modes:**
  1. **Prioritization Matrix** - Bubble chart (complexity vs client appeal)
  2. **Detailed Table** - ROI scores, milestones, complexity ratings
  3. **Valuation & Market** - TAM/SAM/SOM analysis, DCF valuations

- **Financial Metrics:**
  - Year-1 & Year-3 revenue projections
  - Annual Recurring Revenue (ARR)
  - Return on Investment (ROI) scoring
  - Portfolio valuation (DCF method)
  - Monthly infrastructure costs

- **Market Sizing:**
  - Total Addressable Market (TAM)
  - Serviceable Addressable Market (SAM)
  - Serviceable Obtainable Market 3-year (SOM)
  - Traction metrics (MRR, customer count)
  - Profit margins

### 📈 Analytics & Reporting
- **12-Month Trends** - Bug volume, costs, resolution times
- **Cost & Impact Analysis:**
  - Monthly engineering hours on bugs
  - Total bug fix costs
  - Revenue impact from unresolved bugs
- **Severity Distribution** - Visual breakdown with percentages
- **AI Recommendations** - Automated insights:
  - Critical bug alerts (threshold: 5)
  - SLA breach warnings
  - QA automation ROI suggestions
  - Capacity planning recommendations

---

## 🚀 Quick Start

### Prerequisites
- **Docker** (recommended) OR
- **Node.js 18+** + **PostgreSQL 15+**

### Option 1: Docker (Fastest - 5 minutes)

```bash
# 1. Clone and navigate
cd cto-dashboard

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env - set DB_PASSWORD

# 3. Start everything
docker-compose up -d

# 4. Seed database (wait 30 seconds after step 3)
docker-compose exec api npm run seed

# 5. Open dashboard
open http://localhost:3000
```

### Option 2: Manual Setup (Development)

```bash
# 1. Database setup
createdb cto_dashboard
psql cto_dashboard < database/schema.sql

# 2. Backend setup
cd backend
npm install
cp .env.example .env  # Edit with your DB credentials
npm run seed
npm start  # API on http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend
npm install
npm run dev  # UI on http://localhost:3000
```

---

## 📚 API Reference

### Authentication
⚠️ **Currently no authentication** - Add JWT/OAuth before production deployment.

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Dashboard KPIs
```http
GET /api/dashboard/kpis
```
Returns:
```json
{
  "critical_bugs": 5,
  "high_bugs": 12,
  "medium_bugs": 18,
  "low_bugs": 45,
  "blocker_bugs": 3,
  "sla_breached_count": 2,
  "portfolio_value": 68000000,
  "year3_revenue_total": 17000000,
  "monthly_infra_cost": 8200
}
```

#### Bugs

**Get all bugs** (with filters)
```http
GET /api/bugs?severity=critical&status=pending&is_blocker=true
```

**Get single bug**
```http
GET /api/bugs/:id
```

**Create bug**
```http
POST /api/bugs
Content-Type: application/json

{
  "title": "Payment gateway timeout",
  "description": "Gateway times out after 30s",
  "severity": "critical",
  "business_impact": "$5k/day revenue loss",
  "revenue_impact_daily": 5000,
  "is_blocker": true,
  "estimated_hours": 8,
  "assigned_to": "uuid-of-user",
  "project_id": "uuid-of-project"
}
```

**Update bug**
```http
PUT /api/bugs/:id
Content-Type: application/json

{
  "status": "in_progress",
  "assigned_to": "uuid-of-user",
  "actual_hours": 4
}
```

**Delete bug**
```http
DELETE /api/bugs/:id
```

**Cost analysis**
```http
GET /api/bugs/analytics/cost?start_date=2024-01-01&end_date=2024-12-31
```

#### Projects

**Get all projects**
```http
GET /api/projects?status=active
```

**Get single project** (includes associated bugs)
```http
GET /api/projects/:id
```

**Create project**
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Feature X",
  "description": "New payment processing feature",
  "status": "active",
  "complexity": 3,
  "client_appeal": 8,
  "total_milestones": 5,
  "year1_revenue": 500000,
  "year3_revenue": 5000000,
  "tam": 2500000000,
  "sam": 400000000,
  "som_year3": 8000000,
  "dcf_valuation": 15000000,
  "monthly_infra_cost": 2800
}
```

**Update project**
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "current_milestone": 3,
  "status": "active"
}
```

#### Analytics

**Monthly metrics** (last 12 months)
```http
GET /api/analytics/monthly?months=12
```

**Portfolio metrics**
```http
GET /api/analytics/portfolio
```

**AI Recommendations**
```http
GET /api/analytics/recommendations
```

#### Users

**Get all users**
```http
GET /api/users
```

---

## 🗄️ Database Schema

### Core Tables

**bugs** - Bug tracking with SLA monitoring
- `id`, `bug_number` (BUG-001 format), `title`, `description`
- `severity` (critical/high/medium/low), `status`, `assigned_to`
- `project_id`, `days_open` (auto-calculated)
- `sla_hours` (auto-set based on severity), `business_impact`
- `revenue_impact_daily`, `is_blocker`, `priority_score`
- `estimated_hours`, `actual_hours`
- Timestamps: `created_at`, `updated_at`, `resolved_at`

**projects** - Portfolio management
- `id`, `name`, `description`, `status`
- `complexity` (1-5), `client_appeal` (0-10)
- `current_milestone`, `total_milestones`
- `arr`, `year1_revenue`, `year3_revenue`, `roi_score`
- `tam`, `sam`, `som_year3`, `traction_mrr`
- `margin_percent`, `dcf_valuation`, `monthly_infra_cost`

**users** - Team members
- `id`, `email`, `name`, `role`, `avatar_url`

**bug_history** - Audit trail
- `bug_id`, `field_changed`, `old_value`, `new_value`
- `changed_by`, `changed_at`

**monthly_metrics** - Historical analytics
- `month`, `total_bugs`, `critical_bugs`, `high_bugs`, `medium_bugs`, `low_bugs`
- `eng_hours`, `total_cost`, `revenue_impact_daily`
- `avg_resolution_days`, `bugs_created`, `bugs_resolved`

**portfolio_metrics** - Portfolio snapshots
- `total_projects`, `shipped_projects`
- `year3_revenue_total`, `portfolio_dcf_total`, `monthly_deps_cost`

**audit_log** - System-wide audit trail
- `user_id`, `action`, `entity_type`, `entity_id`
- `details` (JSONB), `ip_address`, `user_agent`

### Triggers & Functions

- **Auto-update `updated_at`** - On every row update
- **Auto-set SLA hours** - Based on severity (4h/24h/72h/720h)
- **Track bug changes** - Logs status/severity/assignment changes to `bug_history`
- **Priority score calculator** - Algorithmic ranking function
- **Bug cost analysis** - Aggregate cost calculations

### Views

- **bugs_with_users** - Bugs joined with assignee info + SLA breach flags
- **dashboard_kpis** - Pre-calculated KPI totals for fast dashboard loads
- **project_portfolio_view** - Projects with bug counts, risk levels, completion estimates

---

## 🏗️ Technology Stack

### Backend
- **Node.js 18** - Runtime
- **Express 4** - Web framework
- **PostgreSQL 15** - Database
- **pg** - PostgreSQL client
- **Winston** - Logging
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **CORS** - Cross-origin support

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS 3** - Styling
- **Recharts 2** - Data visualization
- **Axios** - HTTP client

### DevOps
- **Docker** - Containerization
- **docker-compose** - Multi-container orchestration
- **PostgreSQL (Alpine)** - Database container
- **Node (Alpine)** - App containers

---

## 📁 Project Structure

```
cto-dashboard/
├── backend/                    # API server
│   ├── server.js              # Express app with 15+ endpoints
│   ├── seed.js                # Sample data loader
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                   # React UI
│   ├── src/
│   │   ├── App.jsx            # Main app (all components)
│   │   ├── App.css            # Tailwind styles
│   │   └── main.jsx           # Entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── database/
│   └── schema.sql             # PostgreSQL schema (8 tables)
│
├── docs/
│   ├── HANDOFF.md             # Team handoff guide
│   ├── SETUP.md               # Detailed deployment guide
│   └── README.md              # This file
│
├── docker-compose.yml         # Orchestration config
└── README.md
```

---

## 🎨 UI Components

### Dashboard Overview
- **KPI Cards** - Large metric cards with icons and color coding
- **Live refresh** - Auto-updates every 30 seconds

### Bug Tracker
- **Status Overview Cards** - 5 cards showing bug counts by severity + blockers
- **Filter Bar** - Dropdowns for severity, status, blockers
- **Bug Table** - Sortable, filterable list with:
  - Bug number (BUG-XXX)
  - Title + business impact
  - Severity badge
  - Status badge
  - Assigned user
  - Days open
  - SLA breach warnings
- **Cost Analysis Panel** - Total hours, cost, revenue impact

### Project Portfolio
- **View Switcher** - 3 buttons to toggle views
- **Prioritization Matrix** - Interactive scatter plot (Recharts)
  - X-axis: Complexity (1-5)
  - Y-axis: Client Appeal (0-10)
  - Bubble size: Revenue
  - Color: Status (green=shipped, blue=active, gray=deferred)
- **Table View** - Detailed metrics table
- **Valuation View** - Market sizing + funding angles

### Analytics
- **Metrics Cards** - Monthly cost, bugs created, eng hours (with % change)
- **Severity Distribution** - Horizontal bar chart with percentages
- **12-Month Trend Chart** - Line chart (Recharts) showing:
  - Total bugs (blue line)
  - Critical bugs (red line)
  - Monthly cost (green line, right Y-axis)
- **Recommendations Panel** - Color-coded alerts with action items

---

## 🔐 Security

### Current State
⚠️ **No authentication implemented** - Suitable for internal tools or demos only.

### Before Production
Add one of these auth strategies:

1. **JWT Tokens** (recommended)
   ```javascript
   // middleware/auth.js
   const jwt = require('jsonwebtoken');

   module.exports = (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'Unauthorized' });

     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = decoded;
       next();
     } catch (err) {
       res.status(401).json({ error: 'Invalid token' });
     }
   };
   ```

2. **OAuth2** (Auth0, Okta)
   - Use `passport-oauth2` or provider SDKs
   - Good for SSO integration

3. **API Keys** (simple)
   - Store hashed keys in database
   - Check on every request

### Other Security Measures
- ✅ **Helmet** - Security headers enabled
- ✅ **CORS** - Configurable origins
- ✅ **Rate limiting** - 100 req/15min per IP
- ✅ **SQL injection prevention** - Parameterized queries only
- ✅ **Input validation** - Joi validation on POST/PUT
- ⚠️ **HTTPS** - Not enabled (add nginx reverse proxy or use cloud provider SSL)

---

## 🚀 Deployment

### Local Development
```bash
docker-compose up -d
```

### Production (AWS/GCP/Azure)
See `docs/SETUP.md` for detailed instructions.

**Quick checklist:**
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `DB_PASSWORD`
- [ ] Enable HTTPS (nginx + Let's Encrypt)
- [ ] Add authentication
- [ ] Configure database backups
- [ ] Set up monitoring (Datadog, New Relic, etc.)
- [ ] Configure log aggregation (Loggly, Papertrail, etc.)

---

## 📊 Sample Data

The `seed.js` script creates realistic test data:

- **6 users** (Sarah, Mike, Alice, David, Emily, CTO)
- **3 projects** (Feature X [shipped], Project Y [active], Project Z [deferred])
- **~50 bugs** across all severity levels
- **5 months** of historical metrics (Feb-Jun 2024)
- **1 portfolio snapshot**

### Customize Sample Data
Edit `backend/seed.js` and re-run:
```bash
npm run seed
```

---

## 🧪 Testing

### API Tests
```bash
# Health check
curl http://localhost:5000/health

# Get KPIs
curl http://localhost:5000/api/dashboard/kpis | jq .

# Get bugs (filter by critical)
curl http://localhost:5000/api/bugs?severity=critical | jq .

# Create bug
curl -X POST http://localhost:5000/api/bugs \
  -H "Content-Type: application/json" \
  -d '{"title":"Test bug","severity":"high"}'
```

### Database Tests
```bash
# Check row counts
psql cto_dashboard -c "SELECT COUNT(*) FROM bugs;"
psql cto_dashboard -c "SELECT COUNT(*) FROM projects;"
psql cto_dashboard -c "SELECT COUNT(*) FROM users;"

# Test views
psql cto_dashboard -c "SELECT * FROM dashboard_kpis;"
psql cto_dashboard -c "SELECT * FROM bugs_with_users LIMIT 5;"
```

### Frontend Tests
1. Open http://localhost:3000
2. Click all 4 tabs
3. Test filters in Bug Tracker
4. Switch project views
5. Check that charts render

---

## 🤝 Contributing

### Adding Features
1. **Backend changes:**
   - Add endpoints to `backend/server.js`
   - Update schema in `database/schema.sql` (if needed)
   - Add seed data in `backend/seed.js`

2. **Frontend changes:**
   - Edit `frontend/src/App.jsx`
   - Update components inline (single-file structure)

3. **Database changes:**
   - Update `database/schema.sql`
   - Drop database and recreate:
     ```bash
     docker-compose down -v
     docker-compose up -d
     docker-compose exec api npm run seed
     ```

### Code Style
- **Backend:** ESLint (Standard.js)
- **Frontend:** ESLint (React recommended)
- **Formatting:** Prettier (2-space indent)

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Express](https://expressjs.com/)
- [React](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [Vite](https://vitejs.dev/)

---

## 📞 Support

- **Documentation:** `docs/HANDOFF.md`, `docs/SETUP.md`
- **API Reference:** This README (see API Reference section)
- **Database Schema:** `database/schema.sql`
- **Sample Data:** `backend/seed.js`

---

**Built with ❤️ for engineering leaders who need real-time visibility into their portfolio.**
