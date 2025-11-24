/**
 * Data Import API - Vercel Serverless Function
 * Import bugs and projects from CSV, JSON, or external APIs
 */

const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return await client.query(text, params);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Parse CSV data
function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i];
    });
    return obj;
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  Object.keys(corsHeaders).forEach(key => res.setHeader(key, corsHeaders[key]));

  const { method } = req;

  try {
    // Import bugs from JSON array
    if (req.url.includes('/import/bugs') && method === 'POST') {
      const { bugs, format = 'json' } = req.body;

      let bugsToImport = [];

      if (format === 'csv') {
        // Parse CSV
        bugsToImport = parseCSV(bugs);
      } else if (format === 'json') {
        bugsToImport = Array.isArray(bugs) ? bugs : [bugs];
      }

      const imported = [];
      const errors = [];

      for (const bug of bugsToImport) {
        try {
          // Find or create user by email
          let assignedTo = null;
          if (bug.assigned_to_email) {
            let userResult = await query(
              'SELECT id FROM users WHERE email = $1',
              [bug.assigned_to_email]
            );

            if (userResult.rows.length === 0) {
              // Create user if doesn't exist
              const createUser = await query(
                'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id',
                [bug.assigned_to_name || bug.assigned_to_email.split('@')[0], bug.assigned_to_email, 'engineer']
              );
              assignedTo = createUser.rows[0].id;
            } else {
              assignedTo = userResult.rows[0].id;
            }
          }

          // Find project by name
          let projectId = null;
          if (bug.project_name) {
            const projectResult = await query(
              'SELECT id FROM projects WHERE name = $1',
              [bug.project_name]
            );
            if (projectResult.rows.length > 0) {
              projectId = projectResult.rows[0].id;
            }
          }

          // Generate bug number
          const countResult = await query('SELECT COUNT(*) FROM bugs');
          const bugCount = parseInt(countResult.rows[0].count) + 1;
          const bug_number = `BUG-${bugCount.toString().padStart(3, '0')}`;

          // Insert bug
          const result = await query(`
            INSERT INTO bugs (
              bug_number, title, description, severity, status,
              assigned_to, project_id, business_impact, revenue_impact_daily,
              is_blocker, estimated_hours
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `, [
            bug_number,
            bug.title,
            bug.description || '',
            bug.severity || 'medium',
            bug.status || 'pending',
            assignedTo,
            projectId,
            bug.business_impact || '',
            parseFloat(bug.revenue_impact_daily || 0),
            bug.is_blocker === 'true' || bug.is_blocker === true,
            parseFloat(bug.estimated_hours || 0)
          ]);

          imported.push(result.rows[0]);
        } catch (error) {
          errors.push({ bug: bug.title, error: error.message });
        }
      }

      return res.status(200).json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        data: { imported, errors }
      });
    }

    // Import projects from JSON array
    if (req.url.includes('/import/projects') && method === 'POST') {
      const { projects, format = 'json' } = req.body;

      let projectsToImport = [];

      if (format === 'csv') {
        projectsToImport = parseCSV(projects);
      } else if (format === 'json') {
        projectsToImport = Array.isArray(projects) ? projects : [projects];
      }

      const imported = [];
      const errors = [];

      for (const project of projectsToImport) {
        try {
          const result = await query(`
            INSERT INTO projects (
              name, description, status, complexity, client_appeal,
              current_milestone, total_milestones, arr, year1_revenue,
              year3_revenue, roi_score, tam, sam, som_year3, traction_mrr,
              margin_percent, dcf_valuation, monthly_infra_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
          `, [
            project.name,
            project.description || '',
            project.status || 'active',
            parseInt(project.complexity || 3),
            parseInt(project.client_appeal || 5),
            parseInt(project.current_milestone || 0),
            parseInt(project.total_milestones || 0),
            parseFloat(project.arr || 0),
            parseFloat(project.year1_revenue || 0),
            parseFloat(project.year3_revenue || 0),
            parseFloat(project.roi_score || 0),
            parseFloat(project.tam || 0),
            parseFloat(project.sam || 0),
            parseFloat(project.som_year3 || 0),
            parseFloat(project.traction_mrr || 0),
            parseFloat(project.margin_percent || 0),
            parseFloat(project.dcf_valuation || 0),
            parseFloat(project.monthly_infra_cost || 0)
          ]);

          imported.push(result.rows[0]);
        } catch (error) {
          errors.push({ project: project.name, error: error.message });
        }
      }

      return res.status(200).json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        data: { imported, errors }
      });
    }

    // Import from GitHub Issues
    if (req.url.includes('/import/github') && method === 'POST') {
      const { owner, repo, token } = req.body;

      // Fetch issues from GitHub
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch GitHub issues');
      }

      const issues = await response.json();
      const imported = [];
      const errors = [];

      for (const issue of issues) {
        try {
          // Determine severity from labels
          let severity = 'medium';
          const labels = issue.labels.map(l => l.name.toLowerCase());
          if (labels.includes('critical') || labels.includes('urgent')) severity = 'critical';
          else if (labels.includes('high') || labels.includes('important')) severity = 'high';
          else if (labels.includes('low') || labels.includes('minor')) severity = 'low';

          // Determine status
          let status = issue.state === 'closed' ? 'closed' : 'pending';
          if (issue.assignee) status = 'in_progress';

          // Find or create assignee
          let assignedTo = null;
          if (issue.assignee) {
            let userResult = await query(
              'SELECT id FROM users WHERE email = $1',
              [issue.assignee.login + '@github.com']
            );

            if (userResult.rows.length === 0) {
              const createUser = await query(
                'INSERT INTO users (name, email, role, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id',
                [issue.assignee.login, issue.assignee.login + '@github.com', 'engineer', issue.assignee.avatar_url]
              );
              assignedTo = createUser.rows[0].id;
            } else {
              assignedTo = userResult.rows[0].id;
            }
          }

          // Generate bug number
          const countResult = await query('SELECT COUNT(*) FROM bugs');
          const bugCount = parseInt(countResult.rows[0].count) + 1;
          const bug_number = `BUG-${bugCount.toString().padStart(3, '0')}`;

          const result = await query(`
            INSERT INTO bugs (
              bug_number, title, description, severity, status,
              assigned_to, business_impact, is_blocker
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `, [
            bug_number,
            issue.title,
            issue.body || '',
            severity,
            status,
            assignedTo,
            `GitHub Issue #${issue.number}`,
            labels.includes('blocker')
          ]);

          imported.push(result.rows[0]);
        } catch (error) {
          errors.push({ issue: issue.title, error: error.message });
        }
      }

      return res.status(200).json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        data: { imported, errors }
      });
    }

    // Get import templates
    if (req.url.includes('/import/templates') && method === 'GET') {
      return res.status(200).json({
        success: true,
        templates: {
          bugs_csv: `title,description,severity,status,assigned_to_email,project_name,business_impact,revenue_impact_daily,is_blocker,estimated_hours
Login bug,Users can't login,critical,pending,sarah@company.com,Feature X,$5k/day,5000,true,8
Slow dashboard,Dashboard loads slow,medium,in_progress,mike@company.com,Project Y,Bad UX,0,false,4`,
          projects_csv: `name,description,status,complexity,client_appeal,year3_revenue,roi_score
Feature A,New feature,active,2,8,5000000,35
Feature B,Enhancement,shipped,3,6,2000000,20`,
          bugs_json: [
            {
              title: "Example bug",
              description: "Bug description here",
              severity: "high",
              status: "pending",
              assigned_to_email: "dev@company.com",
              project_name: "Project Name",
              business_impact: "Customer impact",
              revenue_impact_daily: 1000,
              is_blocker: false,
              estimated_hours: 6
            }
          ],
          projects_json: [
            {
              name: "Example Project",
              description: "Project description",
              status: "active",
              complexity: 3,
              client_appeal: 7,
              year3_revenue: 3000000,
              roi_score: 25
            }
          ]
        }
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Import endpoint not found'
    });

  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
