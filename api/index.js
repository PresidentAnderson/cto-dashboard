/**
 * Vercel Serverless Function - Main API Entry Point
 * Handles all API routes for the CTO Dashboard
 */

const { Pool } = require('pg');

// Database connection pool (reused across invocations)
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

// Helper function to execute queries
async function query(text, params) {
  const client = getPool();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main handler
module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  const { url, method } = req;
  const path = url.replace('/api', '');

  try {
    // Health check
    if (path === '/health') {
      try {
        await query('SELECT 1');
        return res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected'
        });
      } catch (error) {
        return res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: error.message
        });
      }
    }

    // Dashboard KPIs
    if (path === '/dashboard/kpis' && method === 'GET') {
      const result = await query('SELECT * FROM dashboard_kpis');
      return res.status(200).json({ success: true, data: result.rows[0] || {} });
    }

    // Get all bugs
    if (path.startsWith('/bugs') && method === 'GET' && !path.includes('/analytics')) {
      const { severity, status, is_blocker, limit = 100, offset = 0 } = req.query;

      let whereClause = [];
      let params = [];
      let paramCount = 1;

      if (severity) {
        whereClause.push(`severity = $${paramCount++}`);
        params.push(severity);
      }
      if (status) {
        whereClause.push(`status = $${paramCount++}`);
        params.push(status);
      }
      if (is_blocker === 'true') {
        whereClause.push(`is_blocker = TRUE`);
      }

      const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const queryText = `
        SELECT * FROM bugs_with_users
        ${whereSQL}
        ORDER BY priority_score DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(queryText, params);
      const countResult = await query(`SELECT COUNT(*) FROM bugs_with_users ${whereSQL}`, params.slice(0, -2));

      return res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    }

    // Bug cost analysis
    if (path === '/bugs/analytics/cost' && method === 'GET') {
      const { start_date, end_date } = req.query;
      const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = end_date || new Date().toISOString();

      const result = await query('SELECT * FROM get_bug_cost_analysis($1, $2)', [startDate, endDate]);

      const severityResult = await query(`
        SELECT
          severity,
          COUNT(*) as count,
          SUM(actual_hours) as hours,
          SUM(revenue_impact_daily * days_open) as revenue_impact
        FROM bugs
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY severity
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `, [startDate, endDate]);

      return res.status(200).json({
        success: true,
        data: {
          summary: result.rows[0],
          by_severity: severityResult.rows,
          period: { start_date: startDate, end_date: endDate }
        }
      });
    }

    // Get all projects
    if (path === '/projects' && method === 'GET') {
      const { status, limit = 100, offset = 0 } = req.query;

      let whereClause = status ? 'WHERE status = $1' : '';
      const params = status ? [status, parseInt(limit), parseInt(offset)] : [parseInt(limit), parseInt(offset)];

      const queryText = `
        SELECT * FROM project_portfolio_view
        ${whereClause}
        ORDER BY roi_score DESC
        LIMIT $${status ? 2 : 1} OFFSET $${status ? 3 : 2}
      `;

      const result = await query(queryText, params);
      return res.status(200).json({ success: true, data: result.rows });
    }

    // Monthly metrics
    if (path === '/analytics/monthly' && method === 'GET') {
      const { months = 12 } = req.query;
      const result = await query(`
        SELECT * FROM monthly_metrics
        ORDER BY month DESC
        LIMIT $1
      `, [parseInt(months)]);

      return res.status(200).json({ success: true, data: result.rows.reverse() });
    }

    // Portfolio metrics
    if (path === '/analytics/portfolio' && method === 'GET') {
      const result = await query(`
        SELECT * FROM portfolio_metrics
        ORDER BY snapshot_date DESC
        LIMIT 1
      `);

      return res.status(200).json({ success: true, data: result.rows[0] || {} });
    }

    // AI Recommendations
    if (path === '/analytics/recommendations' && method === 'GET') {
      const kpisResult = await query('SELECT * FROM dashboard_kpis');
      const kpis = kpisResult.rows[0];

      const recommendations = [];

      if (kpis.critical_bugs > 5) {
        recommendations.push({
          type: 'CRITICAL_BUG_ALERT',
          severity: 'high',
          title: 'Critical Bug Alert',
          message: `You have ${kpis.critical_bugs} critical bugs (above safe threshold of 5). Recommend immediate triage and resource allocation.`,
          action: 'Review and assign critical bugs immediately'
        });
      }

      if (kpis.sla_breached_count > 2) {
        recommendations.push({
          type: 'SLA_BREACH',
          severity: 'high',
          title: 'SLA Breaches Detected',
          message: `${kpis.sla_breached_count} bugs have breached their SLA. Review resolution process and resource allocation.`,
          action: 'Escalate overdue bugs and review team capacity'
        });
      }

      if (kpis.high_bugs > 15) {
        recommendations.push({
          type: 'HIGH_BUG_COUNT',
          severity: 'medium',
          title: 'High Bug Volume',
          message: `${kpis.high_bugs} high-severity bugs detected. Consider QA automation investment.`,
          action: 'Evaluate QA automation tools and processes'
        });
      }

      if (kpis.blocker_bugs > 0) {
        recommendations.push({
          type: 'BLOCKER_BUGS',
          severity: 'critical',
          title: 'Project Blockers Detected',
          message: `${kpis.blocker_bugs} blocker bugs are preventing project milestones. Immediate action required.`,
          action: 'Prioritize blocker bug resolution'
        });
      }

      return res.status(200).json({ success: true, data: recommendations });
    }

    // Get all users
    if (path === '/users' && method === 'GET') {
      const result = await query('SELECT id, name, email, role, avatar_url FROM users ORDER BY name');
      return res.status(200).json({ success: true, data: result.rows });
    }

    // 404 - Route not found
    return res.status(404).json({
      success: false,
      error: 'Route not found',
      path: path,
      method: method
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};
