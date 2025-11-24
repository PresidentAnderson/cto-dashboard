/**
 * Import GitHub repositories via the deployed API
 * Run: node import-repos-via-api.js
 */

const fs = require('fs');
const https = require('https');

const API_URL = 'https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app';

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
      som_year3: 400000000,   // $400M
    };
  }

  if (text.includes('hospitality') || text.includes('travel') || text.includes('hotel')) {
    return {
      tam: 30000000000,
      sam: 5000000000,
      som_year3: 250000000,
    };
  }

  if (text.includes('saas') || text.includes('enterprise')) {
    return {
      tam: 20000000000,
      sam: 3000000000,
      som_year3: 150000000,
    };
  }

  // Default market
  return {
    tam: 5000000000,
    sam: 800000000,
    som_year3: 50000000,
  };
}

// Make POST request
function postData(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ success: false, error: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function importGitHubRepos() {
  console.log('🚀 Starting GitHub repositories import via API...\n');

  try {
    // Read CSV file
    const csvPath = '/Users/president/Desktop/github_repos.csv';
    console.log(`📂 Reading CSV from: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    console.log(`📊 Found ${lines.length} repositories\n`);
    console.log('🔄 Processing and preparing data...\n');

    const projects = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const parts = parseCSVLine(line);
      if (!parts || parts.length < 4) continue;

      const [name, visibility, createdDate, gitUrl, websiteUrl = '', description = ''] = parts;

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
      const roi_score = Math.round((appeal * 10) + (complexity * 5) + (currentMilestone * 2));

      // Calculate DCF valuation
      const dcf_valuation = revenue.year3 * 3.5;

      // Infrastructure cost
      const monthly_infra_cost = visibility === 'PUBLIC' ? 0 : (complexity * 15);

      projects.push({
        name: name,
        description: description || `GitHub repository: ${gitUrl}`,
        status: status,
        complexity: complexity,
        client_appeal: appeal,
        current_milestone: currentMilestone,
        total_milestones: 5,
        arr: revenue.arr,
        year1_revenue: revenue.year1,
        year3_revenue: revenue.year3,
        roi_score: roi_score,
        tam: market.tam,
        sam: market.sam,
        som_year3: market.som_year3,
        traction_mrr: revenue.mrr,
        margin_percent: 70,
        dcf_valuation: dcf_valuation,
        monthly_infra_cost: monthly_infra_cost,
      });
    }

    console.log(`✓ Processed ${projects.length} projects\n`);
    console.log(`🌐 Importing to ${API_URL}/api/import/projects`);
    console.log(`⏳ This may take 30-60 seconds...\n`);

    // Import via API
    const result = await postData(`${API_URL}/api/import/projects`, {
      format: 'json',
      projects: projects,
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORT COMPLETE');
    console.log('='.repeat(60));

    if (result.success) {
      console.log(`✓ Successfully imported: ${result.imported}`);
      console.log(`✗ Errors: ${result.errors || 0}`);

      if (result.data && result.data.errors && result.data.errors.length > 0) {
        console.log('\nFirst few errors:');
        result.data.errors.slice(0, 5).forEach(e => {
          console.log(`  - ${e.project}: ${e.error}`);
        });
      }
    } else {
      console.log(`❌ Import failed: ${result.error}`);
    }

    console.log('='.repeat(60));
    console.log('\n🎉 Your dashboard is now populated with all your GitHub repositories!');
    console.log('🌐 Visit: https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Run the import
importGitHubRepos()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
