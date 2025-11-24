# Import Your Data - Quick Guide

Your dashboard now has a powerful CSV import feature that automatically detects and parses GitHub repository data!

## 🚀 **How to Import Your GitHub Repos CSV**

### **Step 1: Wait for Deployment**
Your changes are deploying to Vercel now. Wait ~2-3 minutes, then refresh:
https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app

### **Step 2: Complete Authentication Setup**
If you haven't already, complete the authentication setup (see AUTHENTICATION_SETUP.md):
1. Add JWT_SECRET to Vercel environment variables
2. Redeploy
3. Create your admin user
4. Login

### **Step 3: Import Your Projects**

1. **Navigate to Projects Tab**
   - Click on "📁 Projects" in the top navigation

2. **Click Import Button**
   - Look for the green "Import Projects" button in the top-right corner

3. **Select Your CSV File**
   - Click "Select File" and choose your file:
     `/Users/president/Desktop/github_repos.csv`

4. **Import Automatically**
   - The system will auto-detect it's a GitHub repos CSV
   - Click "Import Projects"
   - Wait for the import to complete (~5-10 seconds for 180 repos)

5. **View Your Portfolio**
   - All 180+ GitHub repositories will appear as projects
   - View in Matrix, Table, or Valuation modes
   - Filter, sort, and analyze your portfolio

## 📊 **What Gets Imported**

From your `github_repos.csv`, the system extracts and maps:

| CSV Column | → | Project Field |
|------------|---|---------------|
| Repository name | → | Project name |
| Description | → | Project description |
| Visibility (PUBLIC/PRIVATE) | → | Status (shipped/active) |
| Created date | → | Metadata |
| Website URL | → | Used in appeal scoring |
| Git URL | → | Stored in description |

### **Intelligent Scoring**

The system automatically calculates:

- **Complexity (1-5)**: Based on keywords in description
  - "enterprise", "platform", "ai" → Complexity 5
  - "system", "management" → Complexity 4
  - Default → Complexity 3

- **Client Appeal (1-10)**: Based on description quality and deployment
  - Long description (>100 chars) → Appeal 8
  - Medium description (>50 chars) → Appeal 6
  - Has Vercel URL → +1 bonus
  - Default → Appeal 5

- **Status**:
  - PUBLIC repos → "shipped" (actively deployed)
  - PRIVATE/INTERNAL → "active" (in development)

- **Infrastructure Cost**:
  - PUBLIC repos → $0/month (free hosting)
  - PRIVATE repos → $50/month (estimated server costs)

## 🐛 **Import Bugs Too**

The import feature also works for bugs!

### **Standard Bug CSV Format:**
```csv
title,description,severity,status,assigned_to_email,business_impact,is_blocker,estimated_hours
Login failing,Users can't login,critical,pending,dev@company.com,$5k/day loss,true,8
Slow loading,Dashboard slow,medium,in_progress,sarah@company.com,Bad UX,false,4
```

### **To Import Bugs:**
1. Go to "🐛 Bug Tracker" tab
2. Click "Import Bugs" button
3. Select your bugs CSV file
4. Import automatically

## 📝 **Alternative Import Methods**

### **1. JSON Import**
Create a JSON file with array of projects:
```json
[
  {
    "name": "Project Name",
    "description": "Project description",
    "status": "active",
    "complexity": 3,
    "client_appeal": 7,
    "year3_revenue": 3000000
  }
]
```

### **2. API Import (Advanced)**
Use the REST API directly:
```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/import/projects \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "projects": [...]
  }'
```

### **3. GitHub Issues Import**
Import bugs directly from GitHub:
```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/import/github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "PresidentAnderson",
    "repo": "your-repo-name",
    "token": "ghp_your_github_token"
  }'
```

## ✅ **After Import**

Your dashboard will show:

### **Portfolio Overview**
- Total projects: 180+
- Year-3 revenue projections
- Portfolio DCF valuation
- Monthly infrastructure costs

### **Prioritization Matrix**
- Projects plotted by complexity vs. client appeal
- Color-coded by status
- Interactive visualization

### **Detailed Table**
- Full list with all metrics
- ROI scores
- Market data (TAM/SAM/SOM)
- Sortable columns

### **Valuation View**
- DCF valuations
- Revenue projections
- Investment recommendations

## 🔧 **Troubleshooting**

### Import fails with "No token provided"
- Make sure you're logged in
- Token should be automatically included
- Try logging out and back in

### CSV parsing errors
- Ensure CSV is properly formatted
- Check for special characters in descriptions
- Try removing commas from description fields

### No projects showing after import
- Check the import success message
- Look for errors in the error list
- Try refreshing the page
- Check browser console for errors

### Import button not visible
- Ensure deployment is complete (check Vercel)
- Clear browser cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## 📚 **Next Steps**

After importing your data:

1. **Analyze Your Portfolio**
   - Use the Prioritization Matrix to identify high-value projects
   - Review ROI scores and investment recommendations
   - Filter by status to see active vs. shipped projects

2. **Add Financial Data**
   - Update revenue projections for key projects
   - Add market data (TAM/SAM/SOM) for growth analysis
   - Set infrastructure costs for cost management

3. **Track Progress**
   - Use Bug Tracker to monitor issues
   - Update project milestones
   - Review Analytics for trends

4. **Export Reports**
   - Generate CSV exports for stakeholders
   - Share dashboard URL for real-time visibility
   - Create presentations from portfolio data

---

**Your 180+ GitHub repositories are now trackable in a professional CTO dashboard!** 🎉

Need help? Check the other guides:
- `AUTHENTICATION_SETUP.md` - Login and security setup
- `CUSTOMIZATION_GUIDE.md` - Branding and features
- `HANDOFF.md` - Complete deployment guide
