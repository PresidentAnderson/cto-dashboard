/**
 * CTO Dashboard API Server
 * Full-featured REST API for bug tracking and portfolio management
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const winston = require('winston');
require('dotenv').config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cto_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Logger configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(compression()); // Response compression
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// ----------------------------------------------------------------------------
// DASHBOARD KPIs
// ----------------------------------------------------------------------------

app.get('/api/dashboard/kpis', async (req, res) => {
    try {
        const result = await query('SELECT * FROM dashboard_kpis');
        res.json({ success: true, data: result.rows[0] || {} });
    } catch (error) {
        logger.error('Error fetching dashboard KPIs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------------------
// BUGS ENDPOINTS
// ----------------------------------------------------------------------------

// Get all bugs with filters
app.get('/api/bugs', async (req, res) => {
    try {
        const {
            severity,
            status,
            assigned_to,
            project_id,
            is_blocker,
            sla_breached,
            limit = 100,
            offset = 0,
            sort_by = 'priority_score',
            sort_order = 'DESC'
        } = req.query;

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
        if (assigned_to) {
            whereClause.push(`assigned_to = $${paramCount++}`);
            params.push(assigned_to);
        }
        if (project_id) {
            whereClause.push(`project_id = $${paramCount++}`);
            params.push(project_id);
        }
        if (is_blocker === 'true') {
            whereClause.push(`is_blocker = TRUE`);
        }
        if (sla_breached === 'true') {
            whereClause.push(`sla_breached = TRUE`);
        }

        const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
        const validSortColumns = ['priority_score', 'created_at', 'days_open', 'severity'];
        const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'priority_score';
        const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const queryText = `
            SELECT * FROM bugs_with_users
            ${whereSQL}
            ORDER BY ${sortColumn} ${order}
            LIMIT $${paramCount++} OFFSET $${paramCount}
        `;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM bugs_with_users ${whereSQL}`;
        const countResult = await query(countQuery, params.slice(0, -2));

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        logger.error('Error fetching bugs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single bug by ID
app.get('/api/bugs/:id', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM bugs_with_users WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bug not found' });
        }

        // Get bug history
        const historyResult = await query(
            `SELECT bh.*, u.name as changed_by_name
             FROM bug_history bh
             LEFT JOIN users u ON bh.changed_by = u.id
             WHERE bh.bug_id = $1
             ORDER BY bh.changed_at DESC`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                history: historyResult.rows
            }
        });
    } catch (error) {
        logger.error('Error fetching bug:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new bug
app.post('/api/bugs', async (req, res) => {
    try {
        const {
            title,
            description,
            severity,
            status = 'pending',
            assigned_to,
            project_id,
            business_impact,
            revenue_impact_daily = 0,
            is_blocker = false,
            estimated_hours,
            created_by
        } = req.body;

        // Validation
        if (!title || !severity) {
            return res.status(400).json({
                success: false,
                error: 'Title and severity are required'
            });
        }

        // Generate bug number (BUG-XXX format)
        const countResult = await query('SELECT COUNT(*) FROM bugs');
        const bugCount = parseInt(countResult.rows[0].count) + 1;
        const bug_number = `BUG-${bugCount.toString().padStart(3, '0')}`;

        // Calculate priority score
        const priorityResult = await query(
            'SELECT calculate_bug_priority_score($1, $2, $3, 0) as score',
            [severity, revenue_impact_daily || 0, is_blocker]
        );
        const priority_score = priorityResult.rows[0].score;

        const result = await query(
            `INSERT INTO bugs (
                bug_number, title, description, severity, status,
                assigned_to, project_id, business_impact, revenue_impact_daily,
                is_blocker, priority_score, estimated_hours, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                bug_number, title, description, severity, status,
                assigned_to, project_id, business_impact, revenue_impact_daily,
                is_blocker, priority_score, estimated_hours, created_by
            ]
        );

        logger.info(`Bug created: ${bug_number}`);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error('Error creating bug:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update bug
app.put('/api/bugs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const allowedFields = [
            'title', 'description', 'severity', 'status', 'assigned_to',
            'project_id', 'business_impact', 'revenue_impact_daily',
            'is_blocker', 'estimated_hours', 'actual_hours'
        ];

        const setClause = [];
        const params = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramCount++}`);
                params.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields to update' });
        }

        // If status is being changed to 'shipped' or 'closed', set resolved_at
        if (updates.status && ['shipped', 'closed'].includes(updates.status)) {
            setClause.push(`resolved_at = CURRENT_TIMESTAMP`);
        }

        params.push(id);
        const queryText = `
            UPDATE bugs
            SET ${setClause.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(queryText, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bug not found' });
        }

        logger.info(`Bug updated: ${id}`);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error('Error updating bug:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete bug
app.delete('/api/bugs/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM bugs WHERE id = $1 RETURNING *', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bug not found' });
        }

        logger.info(`Bug deleted: ${req.params.id}`);
        res.json({ success: true, message: 'Bug deleted successfully' });
    } catch (error) {
        logger.error('Error deleting bug:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bug cost analysis
app.get('/api/bugs/analytics/cost', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = end_date || new Date().toISOString();

        const result = await query(
            'SELECT * FROM get_bug_cost_analysis($1, $2)',
            [startDate, endDate]
        );

        // Get bugs by severity breakdown
        const severityResult = await query(
            `SELECT
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
                END`,
            [startDate, endDate]
        );

        res.json({
            success: true,
            data: {
                summary: result.rows[0],
                by_severity: severityResult.rows,
                period: { start_date: startDate, end_date: endDate }
            }
        });
    } catch (error) {
        logger.error('Error fetching bug cost analysis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------------------
// PROJECTS ENDPOINTS
// ----------------------------------------------------------------------------

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const { status, limit = 100, offset = 0 } = req.query;

        let whereClause = '';
        const params = [];
        if (status) {
            whereClause = 'WHERE status = $1';
            params.push(status);
        }

        const queryText = `
            SELECT * FROM project_portfolio_view
            ${whereClause}
            ORDER BY roi_score DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, params);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error('Error fetching projects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single project
app.get('/api/projects/:id', async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM project_portfolio_view WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        // Get associated bugs
        const bugsResult = await query(
            'SELECT * FROM bugs_with_users WHERE project_id = $1 ORDER BY priority_score DESC',
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                bugs: bugsResult.rows
            }
        });
    } catch (error) {
        logger.error('Error fetching project:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create project
app.post('/api/projects', async (req, res) => {
    try {
        const {
            name,
            description,
            status = 'active',
            complexity,
            client_appeal,
            current_milestone = 0,
            total_milestones,
            arr,
            year1_revenue,
            year3_revenue,
            roi_score,
            tam,
            sam,
            som_year3,
            traction_mrr,
            margin_percent,
            dcf_valuation,
            monthly_infra_cost
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Project name is required' });
        }

        const result = await query(
            `INSERT INTO projects (
                name, description, status, complexity, client_appeal,
                current_milestone, total_milestones, arr, year1_revenue,
                year3_revenue, roi_score, tam, sam, som_year3, traction_mrr,
                margin_percent, dcf_valuation, monthly_infra_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *`,
            [
                name, description, status, complexity, client_appeal,
                current_milestone, total_milestones, arr, year1_revenue,
                year3_revenue, roi_score, tam, sam, som_year3, traction_mrr,
                margin_percent, dcf_valuation, monthly_infra_cost
            ]
        );

        logger.info(`Project created: ${name}`);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error('Error creating project:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const allowedFields = [
            'name', 'description', 'status', 'complexity', 'client_appeal',
            'current_milestone', 'total_milestones', 'arr', 'year1_revenue',
            'year3_revenue', 'roi_score', 'tam', 'sam', 'som_year3',
            'traction_mrr', 'margin_percent', 'dcf_valuation', 'monthly_infra_cost'
        ];

        const setClause = [];
        const params = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramCount++}`);
                params.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields to update' });
        }

        params.push(id);
        const queryText = `
            UPDATE projects
            SET ${setClause.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(queryText, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        logger.info(`Project updated: ${id}`);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error('Error updating project:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------------------
// ANALYTICS ENDPOINTS
// ----------------------------------------------------------------------------

// Get monthly metrics
app.get('/api/analytics/monthly', async (req, res) => {
    try {
        const { months = 12 } = req.query;

        const result = await query(
            `SELECT * FROM monthly_metrics
             ORDER BY month DESC
             LIMIT $1`,
            [parseInt(months)]
        );

        res.json({ success: true, data: result.rows.reverse() }); // Oldest to newest
    } catch (error) {
        logger.error('Error fetching monthly metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get portfolio metrics
app.get('/api/analytics/portfolio', async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM portfolio_metrics
             ORDER BY snapshot_date DESC
             LIMIT 1`
        );

        res.json({ success: true, data: result.rows[0] || {} });
    } catch (error) {
        logger.error('Error fetching portfolio metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recommendations (AI-powered insights)
app.get('/api/analytics/recommendations', async (req, res) => {
    try {
        const kpisResult = await query('SELECT * FROM dashboard_kpis');
        const kpis = kpisResult.rows[0];

        const recommendations = [];

        // Critical bug alert
        if (kpis.critical_bugs > 5) {
            recommendations.push({
                type: 'CRITICAL_BUG_ALERT',
                severity: 'high',
                title: 'Critical Bug Alert',
                message: `You have ${kpis.critical_bugs} critical bugs (above safe threshold of 5). Recommend immediate triage and resource allocation.`,
                action: 'Review and assign critical bugs immediately'
            });
        }

        // SLA breach alert
        if (kpis.sla_breached_count > 2) {
            recommendations.push({
                type: 'SLA_BREACH',
                severity: 'high',
                title: 'SLA Breaches Detected',
                message: `${kpis.sla_breached_count} bugs have breached their SLA. Review resolution process and resource allocation.`,
                action: 'Escalate overdue bugs and review team capacity'
            });
        }

        // High bug count
        if (kpis.high_bugs > 15) {
            recommendations.push({
                type: 'HIGH_BUG_COUNT',
                severity: 'medium',
                title: 'High Bug Volume',
                message: `${kpis.high_bugs} high-severity bugs detected. Consider QA automation investment.`,
                action: 'Evaluate QA automation tools and processes'
            });
        }

        // Blocker bugs
        if (kpis.blocker_bugs > 0) {
            recommendations.push({
                type: 'BLOCKER_BUGS',
                severity: 'critical',
                title: 'Project Blockers Detected',
                message: `${kpis.blocker_bugs} blocker bugs are preventing project milestones. Immediate action required.`,
                action: 'Prioritize blocker bug resolution'
            });
        }

        res.json({ success: true, data: recommendations });
    } catch (error) {
        logger.error('Error generating recommendations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------------------
// USERS ENDPOINTS
// ----------------------------------------------------------------------------

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await query('SELECT id, name, email, role, avatar_url FROM users ORDER BY name');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
    logger.info(`CTO Dashboard API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});
