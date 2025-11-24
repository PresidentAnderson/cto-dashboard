/**
 * GitHub Synchronization API Routes
 * POST /api/sync-github - Trigger GitHub repository sync
 * GET /api/sync-github/status - Get sync status and history
 */

const express = require('express');
const router = express.Router();
const { syncGitHubRepos } = require('../lib/github-sync');
const { Pool } = require('pg');

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

// In-memory tracking of ongoing syncs (to prevent duplicate runs)
const activeSyncs = new Map();

/**
 * POST /api/sync-github
 * Trigger a GitHub repository sync
 *
 * Body:
 * {
 *   "username": "PresidentAnderson",
 *   "token": "optional_github_token"
 * }
 */
router.post('/', async (req, res) => {
    const { username, token } = req.body;

    // Validation
    if (!username) {
        return res.status(400).json({
            success: false,
            error: 'Username is required'
        });
    }

    // Check if sync is already running for this user
    if (activeSyncs.has(username)) {
        const syncInfo = activeSyncs.get(username);
        return res.status(409).json({
            success: false,
            error: 'Sync already in progress',
            startedAt: syncInfo.startedAt,
            currentStats: syncInfo.stats
        });
    }

    // Start sync
    const syncInfo = {
        username,
        startedAt: new Date().toISOString(),
        stats: { total: 0, imported: 0, updated: 0, failed: 0 }
    };
    activeSyncs.set(username, syncInfo);

    // Return immediately - sync runs in background
    res.json({
        success: true,
        message: 'GitHub sync started',
        username,
        startedAt: syncInfo.startedAt
    });

    // Run sync asynchronously
    try {
        console.log(`Starting background sync for ${username}`);

        const result = await syncGitHubRepos(
            username,
            token || process.env.GITHUB_TOKEN || null
        );

        // Update sync info
        syncInfo.completedAt = new Date().toISOString();
        syncInfo.result = result;
        syncInfo.stats = result.stats;

        console.log(`Sync completed for ${username}:`, result.stats);

        // Clean up after 5 minutes
        setTimeout(() => {
            activeSyncs.delete(username);
            console.log(`Cleaned up sync tracking for ${username}`);
        }, 5 * 60 * 1000);

    } catch (error) {
        console.error(`Sync failed for ${username}:`, error);
        syncInfo.error = error.message;
        syncInfo.completedAt = new Date().toISOString();

        // Clean up after 5 minutes
        setTimeout(() => {
            activeSyncs.delete(username);
        }, 5 * 60 * 1000);
    }
});

/**
 * GET /api/sync-github/status
 * Get current sync status and recent history
 *
 * Query params:
 * - username: Filter by specific username
 */
router.get('/status', async (req, res) => {
    try {
        const { username } = req.query;

        // Check for active sync
        let activeSync = null;
        if (username && activeSyncs.has(username)) {
            activeSync = activeSyncs.get(username);
        } else if (!username && activeSyncs.size > 0) {
            // Get first active sync
            activeSync = Array.from(activeSyncs.values())[0];
        }

        // Get recent sync history from database
        const historyQuery = username
            ? `SELECT * FROM import_logs
               WHERE import_type = 'github_sync'
               AND source = $1
               ORDER BY created_at DESC
               LIMIT 10`
            : `SELECT * FROM import_logs
               WHERE import_type = 'github_sync'
               ORDER BY created_at DESC
               LIMIT 10`;

        const params = username ? [`github:${username}`] : [];
        const historyResult = await pool.query(historyQuery, params);

        res.json({
            success: true,
            activeSync: activeSync || null,
            recentSyncs: historyResult.rows,
            activeSyncCount: activeSyncs.size
        });

    } catch (error) {
        console.error('Error fetching sync status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sync-github/history
 * Get detailed sync history
 */
router.get('/history', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const result = await pool.query(`
            SELECT
                id, import_type, source, status,
                total_items, successful_items, failed_items,
                errors, duration_ms, created_at
            FROM import_logs
            WHERE import_type = 'github_sync'
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), parseInt(offset)]);

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM import_logs WHERE import_type = 'github_sync'`
        );

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
        console.error('Error fetching sync history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/sync-github/cancel
 * Cancel an ongoing sync (best effort - may not stop immediately)
 */
router.post('/cancel', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({
            success: false,
            error: 'Username is required'
        });
    }

    if (!activeSyncs.has(username)) {
        return res.status(404).json({
            success: false,
            error: 'No active sync found for this user'
        });
    }

    // Remove from active syncs (sync will continue but won't be tracked)
    activeSyncs.delete(username);

    res.json({
        success: true,
        message: 'Sync tracking cancelled (sync may continue in background)'
    });
});

module.exports = router;
