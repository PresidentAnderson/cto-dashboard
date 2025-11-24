/**
 * Database Seeder - Populate with realistic sample data
 * Run with: node seed.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cto_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
    console.log('🌱 Starting database seed...\n');

    try {
        // ====================================================================
        // 1. USERS
        // ====================================================================
        console.log('📝 Creating users...');
        const users = await pool.query(`
            INSERT INTO users (name, email, role, avatar_url) VALUES
            ('Sarah Chen', 'sarah@company.com', 'senior_engineer', 'https://i.pravatar.cc/150?img=1'),
            ('Mike Rodriguez', 'mike@company.com', 'engineer', 'https://i.pravatar.cc/150?img=2'),
            ('Alice Johnson', 'alice@company.com', 'senior_engineer', 'https://i.pravatar.cc/150?img=3'),
            ('David Kim', 'david@company.com', 'engineer', 'https://i.pravatar.cc/150?img=4'),
            ('Emily Watson', 'emily@company.com', 'qa_engineer', 'https://i.pravatar.cc/150?img=5'),
            ('CTO Admin', 'cto@company.com', 'cto', 'https://i.pravatar.cc/150?img=6')
            RETURNING id, name
        `);
        console.log(`✓ Created ${users.rows.length} users\n`);

        const [sarah, mike, alice, david, emily, cto] = users.rows;

        // ====================================================================
        // 2. PROJECTS
        // ====================================================================
        console.log('📊 Creating projects...');
        const projects = await pool.query(`
            INSERT INTO projects (
                name, description, status, complexity, client_appeal,
                current_milestone, total_milestones, arr, year1_revenue, year3_revenue,
                roi_score, tam, sam, som_year3, traction_mrr, margin_percent,
                dcf_valuation, monthly_infra_cost
            ) VALUES
            (
                'Feature X - Payment Gateway',
                'Enhanced payment processing with multi-currency support',
                'shipped', 2, 9, 4, 5, 200000, 400000, 4000000,
                44, 2500000000, 400000000, 8000000, 50000, 75,
                15000000, 2800
            ),
            (
                'Project Y - Enterprise Platform',
                'B2B enterprise SaaS platform with advanced analytics',
                'active', 4, 6, 1, 6, 80000, 0, 12000000,
                18, 8000000000, 1200000000, 24000000, 0, 70,
                50000000, 4200
            ),
            (
                'Project Z - Mobile App Refresh',
                'UI/UX redesign for mobile application',
                'deferred', 3, 3, 0, 4, 20000, 0, 1000000,
                0.2, 200000000, 40000000, 2000000, 0, 60,
                3000000, 1200
            )
            RETURNING id, name
        `);
        console.log(`✓ Created ${projects.rows.length} projects\n`);

        const [featureX, projectY, projectZ] = projects.rows;

        // ====================================================================
        // 3. BUGS
        // ====================================================================
        console.log('🐛 Creating bugs...');

        const bugData = [
            // CRITICAL BUGS (5)
            {
                title: 'Payments fail for Amex >$5k',
                description: 'American Express transactions above $5000 fail with declined error. Affects ~15% of high-value transactions.',
                severity: 'critical',
                status: 'in_progress',
                assigned_to: sarah.id,
                project_id: featureX.id,
                business_impact: '$2k/day revenue loss',
                revenue_impact_daily: 2000,
                is_blocker: true,
                estimated_hours: 8,
                actual_hours: 6,
                days_ago: 3
            },
            {
                title: 'Database connection pool exhausted',
                description: 'Production database connections maxing out during peak hours, causing 503 errors.',
                severity: 'critical',
                status: 'in_progress',
                assigned_to: alice.id,
                project_id: projectY.id,
                business_impact: 'Site downtime, affects all users',
                revenue_impact_daily: 5000,
                is_blocker: true,
                estimated_hours: 12,
                actual_hours: 8,
                days_ago: 2
            },
            {
                title: 'Security vulnerability in auth flow',
                description: 'XSS vulnerability discovered in login redirect parameter.',
                severity: 'critical',
                status: 'verified',
                assigned_to: mike.id,
                project_id: null,
                business_impact: 'Security breach risk',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 6,
                actual_hours: 5,
                days_ago: 5
            },
            {
                title: 'Data loss in transaction rollback',
                description: 'Transaction rollback not properly handling orphaned records.',
                severity: 'critical',
                status: 'pending',
                assigned_to: null,
                project_id: featureX.id,
                business_impact: 'Data integrity issues',
                revenue_impact_daily: 1000,
                is_blocker: false,
                estimated_hours: 10,
                actual_hours: 0,
                days_ago: 1
            },
            {
                title: 'API rate limiting broken',
                description: 'Rate limiter not enforcing limits, allowing potential DoS.',
                severity: 'critical',
                status: 'pending',
                assigned_to: null,
                project_id: projectY.id,
                business_impact: 'Service stability risk',
                revenue_impact_daily: 3000,
                is_blocker: false,
                estimated_hours: 8,
                actual_hours: 0,
                days_ago: 4
            },

            // HIGH BUGS (12)
            {
                title: 'Auth timeout crashes session',
                description: 'Session timeout causes hard crash instead of graceful logout. 15% user drop-off rate.',
                severity: 'high',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: '15% user drop-off rate',
                revenue_impact_daily: 800,
                is_blocker: true,
                estimated_hours: 6,
                actual_hours: 0,
                days_ago: 7
            },
            {
                title: 'Search endpoint times out',
                description: 'Product search taking >30s for large result sets. Affects 1,200 users.',
                severity: 'high',
                status: 'in_progress',
                assigned_to: alice.id,
                project_id: projectY.id,
                business_impact: 'Affects 1,200 users',
                revenue_impact_daily: 500,
                is_blocker: true,
                estimated_hours: 8,
                actual_hours: 4,
                days_ago: 5
            },
            {
                title: 'Email notifications delayed',
                description: 'Email queue backing up, notifications arriving 2-3 hours late.',
                severity: 'high',
                status: 'in_progress',
                assigned_to: david.id,
                project_id: null,
                business_impact: 'Customer satisfaction impact',
                revenue_impact_daily: 200,
                is_blocker: false,
                estimated_hours: 5,
                actual_hours: 3,
                days_ago: 4
            },
            {
                title: 'Export to CSV generates corrupt files',
                description: 'Large data exports (>10k rows) producing corrupted CSV files.',
                severity: 'high',
                status: 'pending',
                assigned_to: null,
                project_id: projectY.id,
                business_impact: 'Enterprise customer complaints',
                revenue_impact_daily: 400,
                is_blocker: false,
                estimated_hours: 6,
                actual_hours: 0,
                days_ago: 6
            },
            {
                title: 'Mobile app crashes on Android 13',
                description: 'App crashes on startup for Android 13 devices. 8% of mobile users affected.',
                severity: 'high',
                status: 'in_progress',
                assigned_to: mike.id,
                project_id: projectZ.id,
                business_impact: '8% of mobile users affected',
                revenue_impact_daily: 300,
                is_blocker: false,
                estimated_hours: 10,
                actual_hours: 6,
                days_ago: 8
            },
            {
                title: 'Webhook delivery failures',
                description: 'Webhooks failing silently, no retry mechanism in place.',
                severity: 'high',
                status: 'pending',
                assigned_to: null,
                project_id: featureX.id,
                business_impact: 'Integration partners affected',
                revenue_impact_daily: 600,
                is_blocker: false,
                estimated_hours: 8,
                actual_hours: 0,
                days_ago: 3
            },
            {
                title: 'Memory leak in background worker',
                description: 'Background job processor memory usage growing unbounded.',
                severity: 'high',
                status: 'verified',
                assigned_to: sarah.id,
                project_id: null,
                business_impact: 'Server restarts required',
                revenue_impact_daily: 250,
                is_blocker: false,
                estimated_hours: 12,
                actual_hours: 10,
                days_ago: 10
            },
            {
                title: 'SSO integration broken for Okta',
                description: 'Single sign-on failing for Okta users after recent update.',
                severity: 'high',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Enterprise customers blocked',
                revenue_impact_daily: 1000,
                is_blocker: true,
                estimated_hours: 6,
                actual_hours: 0,
                days_ago: 2
            },
            {
                title: 'Report generation timing out',
                description: 'Monthly reports failing to generate for accounts with high transaction volume.',
                severity: 'high',
                status: 'in_progress',
                assigned_to: alice.id,
                project_id: projectY.id,
                business_impact: 'Premium feature unavailable',
                revenue_impact_daily: 350,
                is_blocker: false,
                estimated_hours: 8,
                actual_hours: 5,
                days_ago: 9
            },
            {
                title: 'Bulk import fails for large files',
                description: 'CSV imports >50MB timing out or corrupting data.',
                severity: 'high',
                status: 'pending',
                assigned_to: null,
                project_id: projectY.id,
                business_impact: 'Onboarding friction',
                revenue_impact_daily: 200,
                is_blocker: false,
                estimated_hours: 10,
                actual_hours: 0,
                days_ago: 5
            },
            {
                title: 'Cache invalidation not working',
                description: 'Stale cache serving old data for up to 1 hour after updates.',
                severity: 'high',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Data accuracy issues',
                revenue_impact_daily: 150,
                is_blocker: false,
                estimated_hours: 6,
                actual_hours: 0,
                days_ago: 7
            },
            {
                title: 'File upload size limit too restrictive',
                description: 'Users unable to upload files >10MB, common use case blocked.',
                severity: 'high',
                status: 'in_progress',
                assigned_to: david.id,
                project_id: null,
                business_impact: 'User friction, support tickets',
                revenue_impact_daily: 100,
                is_blocker: false,
                estimated_hours: 4,
                actual_hours: 2,
                days_ago: 6
            },

            // MEDIUM BUGS (18)
            {
                title: 'Dashboard loads slow (5s)',
                description: 'Main dashboard taking 5+ seconds to load. Bad UX, low adoption.',
                severity: 'medium',
                status: 'in_progress',
                assigned_to: mike.id,
                project_id: null,
                business_impact: 'Bad UX, low adoption',
                revenue_impact_daily: 50,
                is_blocker: false,
                estimated_hours: 8,
                actual_hours: 5,
                days_ago: 14
            },
            {
                title: 'Pagination broken on search results',
                description: 'Search results pagination showing duplicate entries on page 2+.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: projectY.id,
                business_impact: 'User confusion',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 4,
                actual_hours: 0,
                days_ago: 12
            },
            {
                title: 'Dark mode colors inconsistent',
                description: 'Some UI elements not properly styled in dark mode.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Cosmetic issue',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 3,
                actual_hours: 0,
                days_ago: 20
            },
            {
                title: 'Autocomplete suggestions outdated',
                description: 'Search autocomplete showing deleted items.',
                severity: 'medium',
                status: 'in_progress',
                assigned_to: emily.id,
                project_id: null,
                business_impact: 'Minor UX issue',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 3,
                actual_hours: 2,
                days_ago: 8
            },
            {
                title: 'PDF export missing page numbers',
                description: 'Generated PDFs missing page numbers and table of contents.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: projectY.id,
                business_impact: 'Professional appearance',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 4,
                actual_hours: 0,
                days_ago: 15
            },
            {
                title: 'Notification badge count incorrect',
                description: 'Unread notification count not updating correctly.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Minor annoyance',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 18
            },
            {
                title: 'Timezone handling inconsistent',
                description: 'Timestamps showing in UTC instead of user timezone in some views.',
                severity: 'medium',
                status: 'in_progress',
                assigned_to: david.id,
                project_id: null,
                business_impact: 'User confusion',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 6,
                actual_hours: 4,
                days_ago: 11
            },
            {
                title: 'Keyboard shortcuts not documented',
                description: 'Power user keyboard shortcuts exist but not discoverable.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Hidden feature',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 25
            },
            {
                title: 'Filter reset button missing',
                description: 'No way to clear all filters at once, must clear individually.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'UX friction',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 16
            },
            {
                title: 'Tooltips appearing off-screen',
                description: 'Tooltips near edge of screen cut off or hidden.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Minor UX issue',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 3,
                actual_hours: 0,
                days_ago: 13
            },
            {
                title: 'Loading spinner too aggressive',
                description: 'Loading spinner showing for actions that take <200ms.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Perceived slowness',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 10
            },
            {
                title: 'Form validation messages unclear',
                description: 'Error messages not specific enough to fix issue.',
                severity: 'medium',
                status: 'in_progress',
                assigned_to: emily.id,
                project_id: null,
                business_impact: 'User frustration',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 4,
                actual_hours: 3,
                days_ago: 9
            },
            {
                title: 'Breadcrumb navigation inconsistent',
                description: 'Breadcrumbs missing on some pages.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Navigation UX',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 3,
                actual_hours: 0,
                days_ago: 17
            },
            {
                title: 'Print styles not optimized',
                description: 'Printed pages include navigation and sidebar.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Wasted paper',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 3,
                actual_hours: 0,
                days_ago: 22
            },
            {
                title: 'API response missing deprecation warnings',
                description: 'Deprecated API fields not marked in response headers.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: projectY.id,
                business_impact: 'Developer experience',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 19
            },
            {
                title: 'Accessibility: missing ARIA labels',
                description: 'Screen reader support incomplete for navigation.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Accessibility compliance',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 6,
                actual_hours: 0,
                days_ago: 24
            },
            {
                title: 'Mobile menu animation janky',
                description: 'Mobile hamburger menu animation stutters on low-end devices.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: projectZ.id,
                business_impact: 'Polish issue',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 4,
                actual_hours: 0,
                days_ago: 21
            },
            {
                title: 'Session timeout warning too short',
                description: 'User only gets 30s warning before session expires.',
                severity: 'medium',
                status: 'pending',
                assigned_to: null,
                project_id: null,
                business_impact: 'Lost work frustration',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 14
            },

            // LOW BUGS (15 shown, rest can be inferred)
            {
                title: 'Mobile button misaligned iOS 16',
                description: 'Button 2px off-center on iOS 16 Safari. Cosmetic only.',
                severity: 'low',
                status: 'deferred',
                assigned_to: null,
                project_id: null,
                business_impact: 'Cosmetic only',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 1,
                actual_hours: 0,
                days_ago: 2
            },
            {
                title: 'Logo pixelated on retina displays',
                description: 'Company logo not using 2x assets for high-DPI screens.',
                severity: 'low',
                status: 'deferred',
                assigned_to: null,
                project_id: null,
                business_impact: 'Brand appearance',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 1,
                actual_hours: 0,
                days_ago: 30
            },
            {
                title: 'Typo in welcome email',
                description: 'Spelling error in automated welcome email template.',
                severity: 'low',
                status: 'deferred',
                assigned_to: null,
                project_id: null,
                business_impact: 'Professional appearance',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 0.5,
                actual_hours: 0,
                days_ago: 45
            },
            {
                title: 'Footer links wrong color',
                description: 'Footer link color doesn\'t match design system.',
                severity: 'low',
                status: 'deferred',
                assigned_to: null,
                project_id: null,
                business_impact: 'Cosmetic',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 0.5,
                actual_hours: 0,
                days_ago: 60
            },
            {
                title: 'Unused CSS bloating bundle',
                description: 'Legacy CSS classes not tree-shaken from bundle.',
                severity: 'low',
                status: 'deferred',
                assigned_to: null,
                project_id: null,
                business_impact: 'Performance (minor)',
                revenue_impact_daily: 0,
                is_blocker: false,
                estimated_hours: 2,
                actual_hours: 0,
                days_ago: 35
            }
        ];

        for (const bug of bugData) {
            // Calculate created_at based on days_ago
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - bug.days_ago);

            await pool.query(`
                INSERT INTO bugs (
                    bug_number, title, description, severity, status,
                    assigned_to, project_id, business_impact, revenue_impact_daily,
                    is_blocker, estimated_hours, actual_hours, created_at
                )
                SELECT
                    'BUG-' || LPAD((COUNT(*) + 1)::TEXT, 3, '0'),
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                FROM bugs
            `, [
                bug.title, bug.description, bug.severity, bug.status,
                bug.assigned_to, bug.project_id, bug.business_impact,
                bug.revenue_impact_daily, bug.is_blocker, bug.estimated_hours,
                bug.actual_hours, createdAt
            ]);
        }

        const bugCount = await pool.query('SELECT COUNT(*) FROM bugs');
        console.log(`✓ Created ${bugCount.rows[0].count} bugs\n`);

        // ====================================================================
        // 4. MONTHLY METRICS (Last 12 months)
        // ====================================================================
        console.log('📈 Creating monthly metrics...');

        const monthlyData = [
            { month: '2024-02-01', bugs: 142, critical: 6, high: 18, medium: 38, low: 80, hours: 34, cost: 5100, impact: 9000, avg_days: 5.9, created: 38, resolved: 35 },
            { month: '2024-03-01', bugs: 148, critical: 7, high: 19, medium: 40, low: 82, hours: 36, cost: 5400, impact: 10000, avg_days: 6.0, created: 42, resolved: 38 },
            { month: '2024-04-01', bugs: 156, critical: 8, high: 22, medium: 42, low: 84, hours: 38, cost: 5700, impact: 12000, avg_days: 6.2, created: 45, resolved: 40 },
            { month: '2024-05-01', bugs: 163, critical: 9, high: 24, medium: 44, low: 86, hours: 42, cost: 6300, impact: 15000, avg_days: 6.8, created: 48, resolved: 44 },
            { month: '2024-06-01', bugs: 174, critical: 12, high: 28, medium: 46, low: 88, hours: 46, cost: 6900, impact: 18000, avg_days: 7.1, created: 52, resolved: 47 }
        ];

        for (const data of monthlyData) {
            await pool.query(`
                INSERT INTO monthly_metrics (
                    month, total_bugs, critical_bugs, high_bugs, medium_bugs, low_bugs,
                    eng_hours, total_cost, revenue_impact_daily, avg_resolution_days,
                    bugs_created, bugs_resolved
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                data.month, data.bugs, data.critical, data.high, data.medium, data.low,
                data.hours, data.cost, data.impact, data.avg_days, data.created, data.resolved
            ]);
        }

        console.log(`✓ Created ${monthlyData.length} monthly metric records\n`);

        // ====================================================================
        // 5. PORTFOLIO METRICS
        // ====================================================================
        console.log('💰 Creating portfolio metrics...');

        await pool.query(`
            INSERT INTO portfolio_metrics (
                total_projects, shipped_projects, year3_revenue_total,
                portfolio_dcf_total, monthly_deps_cost, snapshot_date
            ) VALUES (3, 1, 17000000, 68000000, 8200, CURRENT_DATE)
        `);

        console.log('✓ Created portfolio metrics snapshot\n');

        // ====================================================================
        // SUMMARY
        // ====================================================================
        console.log('═══════════════════════════════════════════════════════');
        console.log('✨ Database seeding completed successfully!\n');
        console.log('Summary:');
        console.log(`  • ${users.rows.length} users created`);
        console.log(`  • ${projects.rows.length} projects created`);
        console.log(`  • ${bugCount.rows[0].count} bugs created`);
        console.log(`    - ${bugData.filter(b => b.severity === 'critical').length} Critical`);
        console.log(`    - ${bugData.filter(b => b.severity === 'high').length} High`);
        console.log(`    - ${bugData.filter(b => b.severity === 'medium').length} Medium`);
        console.log(`    - ${bugData.filter(b => b.severity === 'low').length} Low`);
        console.log(`  • ${monthlyData.length} months of historical data`);
        console.log(`  • 1 portfolio snapshot\n`);
        console.log('🚀 Your dashboard is ready to use!');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the seeder
seed().catch(console.error);
