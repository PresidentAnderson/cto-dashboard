# 🎨 CUSTOMIZATION GUIDE

**Complete guide to customizing your CTO Dashboard**

---

## 📊 **PART 1: IMPORTING YOUR REAL DATA**

### **Method 1: CSV Import (Easiest)**

#### **Import Bugs from CSV**

1. Create a CSV file (`bugs.csv`):
```csv
title,description,severity,status,assigned_to_email,project_name,business_impact,revenue_impact_daily,is_blocker,estimated_hours
Login timeout,Users timing out,critical,pending,dev@company.com,Auth Project,$10k/day,10000,true,12
Slow API,API response >2s,high,in_progress,sarah@company.com,Backend,Performance issue,500,false,8
UI bug,Button misaligned,low,deferred,,,Cosmetic,0,false,1
```

2. Use the import API:
```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/import/bugs \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "bugs": "title,description,severity,status,assigned_to_email,project_name,business_impact,revenue_impact_daily,is_blocker,estimated_hours\nLogin timeout,Users timing out,critical,pending,dev@company.com,Auth Project,$10k/day,10000,true,12"
  }'
```

#### **Import Projects from CSV**

1. Create `projects.csv`:
```csv
name,description,status,complexity,client_appeal,year3_revenue,roi_score,tam,sam,dcf_valuation
Mobile App 2.0,Complete redesign,active,4,9,8000000,42,5000000000,800000000,25000000
API Gateway,Microservices,shipped,3,7,3000000,28,2000000000,400000000,10000000
```

2. Import:
```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/import/projects \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "projects": "name,description,status,complexity,client_appeal,year3_revenue,roi_score\nMobile App 2.0,Complete redesign,active,4,9,8000000,42"
  }'
```

### **Method 2: JSON Import**

```javascript
// Import bugs as JSON
fetch('https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/import/bugs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    format: 'json',
    bugs: [
      {
        title: "Critical payment bug",
        description: "Payment gateway failing",
        severity: "critical",
        status: "pending",
        assigned_to_email: "dev@company.com",
        business_impact: "$20k/day revenue loss",
        revenue_impact_daily: 20000,
        is_blocker: true,
        estimated_hours: 16
      },
      // ... more bugs
    ]
  })
})
.then(r => r.json())
.then(data => console.log(`Imported ${data.imported} bugs`));
```

### **Method 3: GitHub Issues Import**

Import bugs directly from your GitHub repository:

```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/import/github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "yourusername",
    "repo": "your-repo",
    "token": "ghp_your_github_personal_access_token"
  }'
```

**What this does:**
- Fetches all issues from your repo
- Maps GitHub labels to severity levels
- Creates users for assignees
- Imports as bugs in your dashboard

### **Method 4: Direct Database Insert (Advanced)**

For bulk imports, use Supabase SQL Editor:

```sql
-- Insert multiple bugs at once
INSERT INTO bugs (title, severity, status, business_impact) VALUES
  ('Bug 1', 'high', 'pending', 'Customer impact'),
  ('Bug 2', 'medium', 'in_progress', 'Performance'),
  ('Bug 3', 'critical', 'pending', '$5k/day loss');

-- Insert multiple projects
INSERT INTO projects (name, status, complexity, client_appeal, year3_revenue, dcf_valuation) VALUES
  ('Project Alpha', 'active', 3, 8, 5000000, 15000000),
  ('Project Beta', 'shipped', 2, 9, 3000000, 10000000);
```

---

## 🎨 **PART 2: CUSTOMIZING BRANDING & COLORS**

### **Step 1: Update Configuration File**

Edit `frontend/src/config.js`:

```javascript
export const config = {
  // Your Company Branding
  branding: {
    companyName: 'Your Company Name',        // Change this
    dashboardTitle: 'Engineering Dashboard', // Change this
    tagline: 'Your custom tagline here',     // Change this
    logo: '/logo.png',                       // Add your logo
  },

  // Custom Colors
  theme: {
    primary: {
      500: '#your-brand-color', // Main color (hex)
    },
    severity: {
      critical: '#dc2626', // Keep or customize
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    },
  },

  // Feature Toggles
  features: {
    showAnalytics: true,      // Show/hide Analytics tab
    showPortfolio: true,      // Show/hide Projects tab
    showBugTracker: true,     // Show/hide Bug Tracker
    enableExport: true,       // Enable CSV export
    showRecommendations: true, // Show AI recommendations
  },
};
```

### **Step 2: Add Your Logo**

1. Place your logo file in `frontend/public/logo.png`

2. Update the App to use it:

```jsx
// In App.jsx, add to header:
<img src="/logo.png" alt={config.branding.companyName} className="h-10" />
```

### **Step 3: Custom CSS (Optional)**

Edit `frontend/src/App.css`:

```css
/* Custom brand colors */
:root {
  --brand-primary: #your-color;
  --brand-secondary: #your-color;
}

/* Custom button styles */
.btn-primary {
  background-color: var(--brand-primary);
  /* ... more styles */
}
```

### **Step 4: Deploy Changes**

```bash
cd cto-dashboard
git add .
git commit -m "Customize branding and colors"
git push

# Auto-deploys to Vercel
```

---

## 🔐 **PART 3: ADDING AUTHENTICATION**

### **Step 1: Set JWT Secret in Vercel**

1. Go to https://vercel.com/axaiinovation/cto-dashboard/settings/environment-variables

2. Add new variable:
   - **Key:** `JWT_SECRET`
   - **Value:** (generate strong random string)
   - **Environments:** All

```bash
# Generate a secure secret:
openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

3. Click "Save" and redeploy

### **Step 2: Create Login Page**

Create `frontend/src/Login.jsx`:

```jsx
import { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6">Login to CTO Dashboard</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
```

### **Step 3: Protect the Dashboard**

Update `App.jsx` to require login:

```jsx
import { useState, useEffect } from 'react';
import Login from './Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setUser(data.user);
          } else {
            localStorage.removeItem('token');
          }
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // ... rest of your dashboard code
}
```

### **Step 4: Add Logout Button**

```jsx
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setUser(null);
};

// In your header:
<button onClick={handleLogout} className="btn">Logout</button>
```

### **Step 5: Create First User**

Register via API:

```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "your-secure-password",
    "name": "Admin User",
    "role": "cto"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "...", "email": "...", "role": "cto" }
}
```

---

## 👥 **PART 4: ROLE-BASED ACCESS CONTROL (RBAC)**

### **Roles:**
- **cto** - Full access (view, create, edit, delete)
- **manager** - View all, edit bugs/projects
- **engineer** - View all, edit assigned bugs
- **qa_engineer** - View all, create bugs
- **viewer** - Read-only access

### **Implementation:**

Add to your API endpoints:

```javascript
// In api/index.js, add auth middleware
function requireAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('No token provided');

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token); // Use same verify from auth.js

  if (!decoded) throw new Error('Invalid token');
  return decoded;
}

function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
}

// Example: Protect delete endpoint
if (path.startsWith('/bugs/') && method === 'DELETE') {
  const user = requireAuth(req);
  requireRole(user, ['cto', 'manager']); // Only CTO/Manager can delete

  // ... delete logic
}
```

---

## 🤖 **PART 5: DEPLOYING AGENTS FOR PARALLEL DEVELOPMENT**

Now that you have the foundation, deploy agents to add features in parallel:

### **Agent Team Assignments:**

#### **AGENT 1: Dark Mode (2 hours)**
```
Task: Add dark mode toggle to the dashboard

Files to modify:
- frontend/src/App.jsx (add theme context)
- frontend/src/App.css (add dark mode classes)
- frontend/src/config.js (enable dark mode feature flag)

Implementation:
1. Add theme context with useState('light' or 'dark')
2. Add toggle button in header
3. Store preference in localStorage
4. Apply dark mode classes conditionally
5. Use Tailwind dark: variants

Deliverable: Working dark mode toggle that persists
```

#### **AGENT 2: CSV Export (1 hour)**
```
Task: Add CSV export functionality for bugs and projects

Files to create/modify:
- frontend/src/utils/export.js (export logic)
- frontend/src/App.jsx (add export buttons)

Implementation:
1. Create exportToCSV() function
2. Add "Export to CSV" button on Bug Tracker tab
3. Add "Export to CSV" button on Projects tab
4. Download file with current date in filename

Deliverable: Working CSV export for bugs and projects
```

#### **AGENT 3: Advanced Filtering (2 hours)**
```
Task: Add advanced filtering with date ranges, search, and multi-select

Files to modify:
- frontend/src/App.jsx (BugTracker component)

Implementation:
1. Add date range picker (created_at filter)
2. Add search box (title/description)
3. Add multi-select for status (select multiple statuses)
4. Add "Clear all filters" button
5. Show active filter count

Deliverable: Advanced filtering UI with all features working
```

#### **AGENT 4: Slack Notifications (3 hours)**
```
Task: Add Slack webhook integration for SLA breach alerts

Files to create:
- api/notifications.js (Slack webhook sender)
- Add Slack integration to bug updates

Implementation:
1. Create Slack webhook endpoint
2. Trigger notification when bug breaches SLA
3. Format message with bug details, link to dashboard
4. Add SLACK_WEBHOOK_URL to Vercel env vars
5. Test with sample bug

Deliverable: Working Slack notifications for SLA breaches
```

#### **AGENT 5: Mobile App (React Native) (8 hours)**
```
Task: Create React Native mobile app for iOS/Android

Files to create:
- mobile/ directory with React Native project
- Reuse API endpoints (already built)

Implementation:
1. Initialize React Native project
2. Create login screen
3. Create dashboard tabs (same structure as web)
4. Add push notifications
5. Build for iOS and Android

Deliverable: Working mobile app that uses same API
```

### **How to Deploy Agents:**

1. **Choose which features you want** from the list above

2. **Give each agent their task** - Copy the task description to your agent

3. **Run agents in parallel** - All agents work simultaneously

4. **Merge results** - Each agent commits to separate branch, you merge

**Total time with 5 agents:** 4-8 hours → Production-ready dashboard with all features

---

## ✅ **QUICK REFERENCE**

### **Import Data:**
```bash
# Bugs
POST /api/import/bugs

# Projects
POST /api/import/projects

# GitHub Issues
POST /api/import/github
```

### **Authentication:**
```bash
# Register
POST /api/auth/register

# Login
POST /api/auth/login

# Get current user
GET /api/auth/me (with Bearer token)
```

### **Configuration:**
Edit `frontend/src/config.js` for all customizations

### **Deploy Changes:**
```bash
git add .
git commit -m "Your changes"
git push
# Auto-deploys to Vercel
```

---

**Your dashboard is now fully customizable!** Choose which enhancements you want to implement first.

Would you like me to:
1. ✅ Implement one of these features right now?
2. ✅ Deploy multiple agents in parallel?
3. ✅ Create more agent task descriptions?
