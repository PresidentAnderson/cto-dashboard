/**
 * GitHub Repository Synchronization System
 * Fetches and syncs all repositories from a GitHub user into the CTO Dashboard
 *
 * Features:
 * - Pagination handling for 200+ repos
 * - Intelligent data normalization
 * - Health score calculation
 * - Retry logic with exponential backoff
 * - Rate limiting protection
 * - Detailed sync logging
 */

const { Pool } = require('pg');

// Database connection pool (shared with server.js)
let pool;

function initializePool() {
    if (!pool) {
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'cto_dashboard',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    return pool;
}

/**
 * Parse GitHub Link header for pagination
 * @param {string} linkHeader - Link header from GitHub API response
 * @returns {Object} - Object with next, prev, first, last URLs
 */
function parseLinkHeader(linkHeader) {
    if (!linkHeader) return {};

    const links = {};
    const parts = linkHeader.split(',');

    parts.forEach(part => {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match) {
            links[match[2]] = match[1];
        }
    });

    return links;
}

/**
 * Fetch with retry logic and exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
    try {
        const response = await fetch(url, options);

        // Handle rate limiting
        if (response.status === 403) {
            const resetTime = response.headers.get('X-RateLimit-Reset');
            const remaining = response.headers.get('X-RateLimit-Remaining');

            if (remaining === '0' && resetTime) {
                const waitTime = (parseInt(resetTime) * 1000) - Date.now();
                if (waitTime > 0 && waitTime < 3600000) { // Max 1 hour wait
                    console.log(`Rate limit hit. Waiting ${Math.ceil(waitTime / 1000)}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
                    return fetchWithRetry(url, options, retries);
                }
            }
        }

        // Handle server errors with retry
        if (response.status >= 500 && retries > 0) {
            const waitTime = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
            console.log(`Server error. Retrying in ${waitTime}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return fetchWithRetry(url, options, retries - 1);
        }

        return response;
    } catch (error) {
        if (retries > 0) {
            const waitTime = Math.pow(2, 3 - retries) * 1000;
            console.log(`Network error. Retrying in ${waitTime}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

/**
 * Calculate repository health score based on activity and metrics
 * @param {Object} repo - GitHub repository object
 * @returns {number} - Health score 0-100
 */
function calculateHealthScore(repo) {
    let score = 50; // Base score

    // Recent activity (last push within 90 days)
    const daysSinceLastPush = (Date.now() - new Date(repo.pushed_at)) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPush < 7) score += 20;
    else if (daysSinceLastPush < 30) score += 15;
    else if (daysSinceLastPush < 90) score += 10;
    else if (daysSinceLastPush > 365) score -= 20;

    // Stars indicate popularity/quality
    if (repo.stargazers_count > 100) score += 15;
    else if (repo.stargazers_count > 50) score += 10;
    else if (repo.stargazers_count > 10) score += 5;

    // Forks indicate usefulness
    if (repo.forks_count > 50) score += 10;
    else if (repo.forks_count > 10) score += 5;

    // Has description
    if (repo.description && repo.description.length > 20) score += 5;

    // Open issues (too many might indicate problems)
    if (repo.open_issues_count > 50) score -= 10;
    else if (repo.open_issues_count > 20) score -= 5;

    // Has homepage/demo
    if (repo.homepage && repo.homepage.length > 0) score += 5;

    // Archived projects are unmaintained
    if (repo.archived) score -= 30;

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Determine project complexity based on language and size
 * @param {Object} repo - GitHub repository object
 * @returns {number} - Complexity 1-5
 */
function determineComplexity(repo) {
    const language = repo.language ? repo.language.toLowerCase() : '';
    const size = repo.size || 0; // Size in KB

    // Base complexity on language
    const complexLanguages = ['c++', 'rust', 'go', 'java', 'scala', 'haskell'];
    const mediumLanguages = ['python', 'javascript', 'typescript', 'ruby', 'php', 'c#'];

    let complexity = 2; // Default medium

    if (complexLanguages.some(l => language.includes(l))) {
        complexity = 4;
    } else if (mediumLanguages.some(l => language.includes(l))) {
        complexity = 3;
    } else if (['html', 'css', 'markdown'].some(l => language.includes(l))) {
        complexity = 1;
    }

    // Adjust based on size
    if (size > 10000) complexity = Math.min(5, complexity + 1); // Large project
    else if (size < 100) complexity = Math.max(1, complexity - 1); // Small project

    return complexity;
}

/**
 * Extract tech stack from topics and language
 * @param {Object} repo - GitHub repository object
 * @returns {Array<string>} - Array of technologies
 */
function extractTechStack(repo) {
    const techStack = [];

    // Add primary language
    if (repo.language) {
        techStack.push(repo.language);
    }

    // Add topics (GitHub tags)
    if (repo.topics && Array.isArray(repo.topics)) {
        techStack.push(...repo.topics.filter(t => t.length > 0));
    }

    // Deduplicate and limit to 10
    return [...new Set(techStack)].slice(0, 10);
}

/**
 * Map GitHub visibility to project status
 * @param {Object} repo - GitHub repository object
 * @returns {string} - Project status
 */
function mapRepoStatus(repo) {
    if (repo.archived) return 'deferred';
    if (repo.private) return 'active';

    // Public repos with recent activity are likely shipped
    const daysSinceLastPush = (Date.now() - new Date(repo.pushed_at)) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPush < 30) return 'active';

    return 'shipped';
}

/**
 * Normalize GitHub repository data to match database schema
 * @param {Object} repo - GitHub repository object
 * @returns {Object} - Normalized project data
 */
function normalizeRepoData(repo) {
    const healthScore = calculateHealthScore(repo);
    const complexity = determineComplexity(repo);
    const techStack = extractTechStack(repo);
    const status = mapRepoStatus(repo);

    return {
        name: repo.name,
        description: repo.description || 'GitHub repository',
        status: status,
        complexity: complexity,
        client_appeal: Math.min(10, Math.floor(repo.stargazers_count / 10)), // Stars/10, max 10

        // GitHub-specific fields (store as metadata)
        github_url: repo.html_url,
        github_id: repo.id,
        demo_url: repo.homepage || null,
        tags: techStack,

        // Language and metrics
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        open_issues: repo.open_issues_count || 0,

        // Dates
        last_commit: repo.pushed_at,
        created_at: repo.created_at,
        updated_at: repo.updated_at,

        // Calculated fields
        health_score: healthScore,

        // Financial estimates (placeholder values - can be updated manually)
        arr: 0,
        year1_revenue: 0,
        year3_revenue: 0,
        roi_score: 0,
        tam: 0,
        sam: 0,
        som_year3: 0,
        traction_mrr: 0,
        margin_percent: 0,
        dcf_valuation: 0,
        monthly_infra_cost: 0,

        // Set milestones based on repo state
        current_milestone: repo.archived ? 0 : (status === 'shipped' ? 10 : 5),
        total_milestones: 10
    };
}

/**
 * Upsert project into database
 * @param {Pool} pool - Database connection pool
 * @param {Object} projectData - Normalized project data
 * @returns {Promise<Object>} - Result with success flag and project ID
 */
async function upsertProject(pool, projectData) {
    const client = await pool.connect();
    try {
        // Check if project exists by name (GitHub repo name is unique per user)
        const existingResult = await client.query(
            'SELECT id, name FROM projects WHERE name = $1',
            [projectData.name]
        );

        if (existingResult.rows.length > 0) {
            // Update existing project
            const projectId = existingResult.rows[0].id;

            await client.query(`
                UPDATE projects SET
                    description = $2,
                    status = $3,
                    complexity = $4,
                    client_appeal = $5,
                    current_milestone = $6,
                    total_milestones = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [
                projectId,
                projectData.description,
                projectData.status,
                projectData.complexity,
                projectData.client_appeal,
                projectData.current_milestone,
                projectData.total_milestones
            ]);

            return { success: true, projectId, action: 'updated' };
        } else {
            // Insert new project
            const insertResult = await client.query(`
                INSERT INTO projects (
                    name, description, status, complexity, client_appeal,
                    current_milestone, total_milestones, arr, year1_revenue,
                    year3_revenue, roi_score, tam, sam, som_year3, traction_mrr,
                    margin_percent, dcf_valuation, monthly_infra_cost
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING id
            `, [
                projectData.name,
                projectData.description,
                projectData.status,
                projectData.complexity,
                projectData.client_appeal,
                projectData.current_milestone,
                projectData.total_milestones,
                projectData.arr,
                projectData.year1_revenue,
                projectData.year3_revenue,
                projectData.roi_score,
                projectData.tam,
                projectData.sam,
                projectData.som_year3,
                projectData.traction_mrr,
                projectData.margin_percent,
                projectData.dcf_valuation,
                projectData.monthly_infra_cost
            ]);

            return { success: true, projectId: insertResult.rows[0].id, action: 'created' };
        }
    } catch (error) {
        console.error(`Error upserting project ${projectData.name}:`, error);
        return { success: false, error: error.message, projectName: projectData.name };
    } finally {
        client.release();
    }
}

/**
 * Log import operation to database
 * @param {Pool} pool - Database connection pool
 * @param {Object} logData - Log data
 */
async function logImport(pool, logData) {
    try {
        await pool.query(`
            INSERT INTO import_logs (
                import_type, source, status, total_items,
                successful_items, failed_items, errors, duration_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            'github_sync',
            logData.source,
            logData.status,
            logData.total_items,
            logData.successful_items,
            logData.failed_items,
            JSON.stringify(logData.errors || []),
            logData.duration_ms
        ]);
    } catch (error) {
        console.error('Error logging import:', error);
    }
}

/**
 * Fetch all repositories from GitHub user with pagination
 * @param {string} username - GitHub username
 * @param {string} token - Optional GitHub token for higher rate limits
 * @returns {Promise<Array>} - Array of all repositories
 */
async function fetchAllRepos(username, token = null) {
    const repos = [];
    let nextUrl = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;

    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CTO-Dashboard-Sync'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`Fetching repositories for user: ${username}`);

    while (nextUrl) {
        console.log(`Fetching page: ${nextUrl}`);

        const response = await fetchWithRetry(nextUrl, { headers });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
        }

        // Check rate limit
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const limit = response.headers.get('X-RateLimit-Limit');
        console.log(`Rate limit: ${remaining}/${limit} remaining`);

        const pageRepos = await response.json();
        repos.push(...pageRepos);

        console.log(`Fetched ${pageRepos.length} repositories (total: ${repos.length})`);

        // Get next page URL from Link header
        const linkHeader = response.headers.get('Link');
        const links = parseLinkHeader(linkHeader);
        nextUrl = links.next || null;

        // Small delay to avoid hammering the API
        if (nextUrl) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return repos;
}

/**
 * Main sync function - Fetch and sync GitHub repositories
 * @param {string} username - GitHub username to sync
 * @param {string} token - Optional GitHub token
 * @returns {Promise<Object>} - Sync statistics
 */
async function syncGitHubRepos(username, token = null) {
    const startTime = Date.now();
    const pool = initializePool();

    const stats = {
        total: 0,
        imported: 0,
        updated: 0,
        failed: 0,
        errors: []
    };

    try {
        console.log(`Starting GitHub sync for user: ${username}`);

        // Fetch all repositories
        const repos = await fetchAllRepos(username, token);
        stats.total = repos.length;

        console.log(`Found ${repos.length} repositories. Starting import...`);

        // Process each repository
        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];
            console.log(`[${i + 1}/${repos.length}] Processing: ${repo.name}`);

            try {
                const projectData = normalizeRepoData(repo);
                const result = await upsertProject(pool, projectData);

                if (result.success) {
                    if (result.action === 'created') {
                        stats.imported++;
                        console.log(`  ✓ Imported: ${repo.name}`);
                    } else {
                        stats.updated++;
                        console.log(`  ✓ Updated: ${repo.name}`);
                    }
                } else {
                    stats.failed++;
                    stats.errors.push({
                        repo: repo.name,
                        error: result.error
                    });
                    console.log(`  ✗ Failed: ${repo.name} - ${result.error}`);
                }
            } catch (error) {
                stats.failed++;
                stats.errors.push({
                    repo: repo.name,
                    error: error.message
                });
                console.log(`  ✗ Failed: ${repo.name} - ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;

        // Log the import operation
        await logImport(pool, {
            source: `github:${username}`,
            status: stats.failed === 0 ? 'success' : 'partial',
            total_items: stats.total,
            successful_items: stats.imported + stats.updated,
            failed_items: stats.failed,
            errors: stats.errors,
            duration_ms: duration
        });

        console.log(`\nSync completed in ${(duration / 1000).toFixed(2)}s`);
        console.log(`Total: ${stats.total} | Imported: ${stats.imported} | Updated: ${stats.updated} | Failed: ${stats.failed}`);

        return {
            success: true,
            stats,
            duration_ms: duration
        };

    } catch (error) {
        const duration = Date.now() - startTime;

        console.error('Sync failed:', error);

        // Log the failed import
        await logImport(pool, {
            source: `github:${username}`,
            status: 'failed',
            total_items: stats.total,
            successful_items: stats.imported + stats.updated,
            failed_items: stats.failed,
            errors: [{ error: error.message }],
            duration_ms: duration
        });

        return {
            success: false,
            error: error.message,
            stats,
            duration_ms: duration
        };
    }
}

module.exports = {
    syncGitHubRepos,
    fetchAllRepos,
    normalizeRepoData,
    calculateHealthScore,
    determineComplexity,
    extractTechStack
};
