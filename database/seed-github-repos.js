/**
 * Seed script to import GitHub repositories from CSV into projects table
 * Run: node database/seed-github-repos.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Parse CSV line handling quoted values
function parseCSVLine(line) {
  const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
  if (!matches) return null;
  return matches.map(m => m.replace(/^"(.*)"$/, '$1').trim());
}

// Calculate complexity based on description
function calculateComplexity(description, name) {
  const text = `${description} ${name}`.toLowerCase();

  if (text.includes('enterprise') || text.includes('platform') || text.includes('saas')) {
    return 5;
  } else if (text.includes('ai') || text.includes('system') || text.includes('management')) {
    return 4;
  } else if (text.includes('api') || text.includes('backend') || text.includes('dashboard')) {
    return 3;
  } else if (text.includes('website') || text.includes('frontend')) {
    return 2;
  }
  return 3; // default
}

// Calculate client appeal
function calculateAppeal(description, websiteUrl) {
  let appeal = 5; // base

  if (description && description.length > 150) {
    appeal = 9;
  } else if (description && description.length > 100) {
    appeal = 8;
  } else if (description && description.length > 50) {
    appeal = 7;
  } else if (description && description.length > 20) {
    appeal = 6;
  }

  // Bonus for deployed projects
  if (websiteUrl && (websiteUrl.includes('vercel.app') || websiteUrl.includes('http'))) {
    appeal = Math.min(10, appeal + 1);
  }

  return appeal;
}

// Estimate revenue based on project characteristics
function estimateRevenue(name, description, visibility, complexity, appeal) {
  const text = `${name} ${description}`.toLowerCase();

  // High-value SaaS platforms
  if (text.includes('saas') || text.includes('platform')) {
    return {
      year1: 100000,
      year3: 5000000,
      arr: 50000,
      mrr: 4000,
    };
  }

  // Enterprise solutions
  if (text.includes('enterprise') || text.includes('management')) {
    return {
      year1: 75000,
      year3: 3000000,
      arr: 40000,
      mrr: 3000,
    };
  }

  // AI/Tech products
  if (text.includes('ai') || text.includes('automation')) {
    return {
      year1: 50000,
      year3: 2000000,
      arr: 30000,
      mrr: 2500,
    };
  }

  // PUBLIC repos with deployments
  if (visibility === 'PUBLIC' && complexity >= 3 && appeal >= 7) {
    return {
      year1: 25000,
      year3: 500000,
      arr: 15000,
      mrr: 1200,
    };
  }

  // Default for other projects
  return {
    year1: 0,
    year3: 0,
    arr: 0,
    mrr: 0,
  };
}

// Calculate market data
function estimateMarketData(name, description) {
  const text = `${name} ${description}`.toLowerCase();

  // Large markets
  if (text.includes('legal') || text.includes('healthcare') || text.includes('finance')) {
    return {
      tam: 50000000000, // $50B
      sam: 8000000000,  // $8B
      som: 400000000,   // $400M
    };
  }

  if (text.includes('hospitality') || text.includes('travel') || text.includes('hotel')) {
    return {
      tam: 30000000000,
      sam: 5000000000,
      som: 250000000,
    };
  }

  if (text.includes('saas') || text.includes('enterprise')) {
    return {
      tam: 20000000000,
      sam: 3000000000,
      som: 150000000,
    };
  }

  // Default market
  return {
    tam: 5000000000,
    sam: 800000000,
    som: 50000000,
  };
}

async function importGitHubRepos() {
  console.log('🚀 Starting GitHub repositories import...\n');

  try {
    // Read CSV file
    const csvPath = '/Users/president/Desktop/github_repos.csv';
    console.log(`📂 Reading CSV from: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    console.log(`📊 Found ${lines.length} repositories\n`);

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const parts = parseCSVLine(line);
      if (!parts || parts.length < 4) {
        skipped++;
        continue;
      }

      const [name, visibility, createdDate, gitUrl, websiteUrl = '', description = ''] = parts;

      try {
        // Calculate metrics
        const complexity = calculateComplexity(description, name);
        const appeal = calculateAppeal(description, websiteUrl);
        const revenue = estimateRevenue(name, description, visibility, complexity, appeal);
        const market = estimateMarketData(name, description);

        // Determine status
        let status = 'active';
        let currentMilestone = 3;

        if (visibility === 'PUBLIC') {
          status = websiteUrl ? 'shipped' : 'active';
          currentMilestone = websiteUrl ? 5 : 4;
        }

        // Calculate ROI score
        const roiScore = Math.round((appeal * 10) + (complexity * 5) + (currentMilestone * 2));

        // Calculate DCF valuation (simplified)
        const dcfValuation = revenue.year3 * 3.5; // Simple 3.5x multiple

        // Infrastructure cost
        const monthlyInfraCost = visibility === 'PUBLIC' ? 0 : (complexity * 15);

        // Insert into database
        await pool.query(`
          INSERT INTO projects (
            name, description, status, complexity, client_appeal,
            current_milestone, total_milestones,
            arr, year1_revenue, year3_revenue, roi_score,
            tam, sam, som_year3, traction_mrr,
            margin_percent, dcf_valuation, monthly_infra_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
          name,
          description || `GitHub repository: ${gitUrl}`,
          status,
          complexity,
          appeal,
          currentMilestone,
          5, // total milestones
          revenue.arr,
          revenue.year1,
          revenue.year3,
          roiScore,
          market.tam,
          market.sam,
          market.som,
          revenue.mrr,
          70, // margin percent
          dcfValuation,
          monthlyInfraCost
        ]);

        imported++;

        // Progress indicator
        if (imported % 20 === 0) {
          console.log(`✓ Imported ${imported} projects...`);
        }

      } catch (error) {
        errors.push({ name, error: error.message });
        console.error(`✗ Error importing ${name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Total repositories: ${lines.length}`);
    console.log(`✓ Successfully imported: ${imported}`);
    console.log(`⊘ Skipped: ${skipped}`);
    console.log(`✗ Errors: ${errors.length}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    }

    // Show summary statistics
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        SUM(year3_revenue) as total_year3_revenue,
        SUM(dcf_valuation) as total_valuation,
        AVG(complexity) as avg_complexity,
        AVG(client_appeal) as avg_appeal
      FROM projects
    `);

    const summary = stats.rows[0];

    console.log('\n' + '='.repeat(60));
    console.log('📈 PORTFOLIO SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Projects: ${summary.total_projects}`);
    console.log(`Shipped: ${summary.shipped}`);
    console.log(`Active: ${summary.active}`);
    console.log(`Year-3 Revenue: $${(parseFloat(summary.total_year3_revenue) / 1000000).toFixed(2)}M`);
    console.log(`Portfolio Valuation: $${(parseFloat(summary.total_valuation) / 1000000).toFixed(2)}M`);
    console.log(`Avg Complexity: ${parseFloat(summary.avg_complexity).toFixed(2)}/5`);
    console.log(`Avg Client Appeal: ${parseFloat(summary.avg_appeal).toFixed(2)}/10`);
    console.log('='.repeat(60));

    console.log('\n🎉 Your dashboard is now populated with all your GitHub repositories!');
    console.log('🌐 Visit: https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importGitHubRepos()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
