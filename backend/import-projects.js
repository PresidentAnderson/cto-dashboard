#!/usr/bin/env node

/**
 * Import Local Project Data
 * Imports project data from github-repos-data.json directly to database
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env.local from parent directory
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const DATABASE_URL = envVars.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in .env.local');
  process.exit(1);
}

// Database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function importProjects() {
  console.log('\n🚀 CTO Dashboard - Local Data Import\n');
  console.log('═'.repeat(50));

  try {
    // Read JSON file from parent directory
    const dataPath = path.join(__dirname, '..', 'github-repos-data.json');
    console.log(`\n📖 Reading: ${dataPath}`);

    if (!fs.existsSync(dataPath)) {
      console.error('❌ Error: github-repos-data.json not found');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const projects = data.projects || [];

    console.log(`✅ Found ${projects.length} projects to import\n`);

    // Test database connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected\n');

    // Import projects one by one
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    console.log('📊 Importing projects:\n');

    for (const project of projects) {
      try {
        // Check if project exists
        const existing = await client.query(
          'SELECT id FROM projects WHERE name = $1',
          [project.name]
        );

        if (existing.rows.length > 0) {
          // Update existing project
          await client.query(`
            UPDATE projects
            SET
              description = $2,
              status = $3,
              complexity = $4,
              client_appeal = $5,
              year3_revenue = $6,
              roi_score = $7,
              tam = $8,
              sam = $9,
              som_year3 = $10,
              updated_at = NOW()
            WHERE name = $1
          `, [
            project.name,
            project.description,
            project.status,
            project.complexity,
            project.client_appeal,
            project.year3_revenue,
            project.roi_score,
            project.tam,
            project.sam,
            project.som_year3
          ]);

          updated++;
          console.log(`  ✏️  Updated: ${project.name}`);
        } else {
          // Insert new project
          await client.query(`
            INSERT INTO projects (
              name, description, status, complexity, client_appeal,
              year3_revenue, roi_score, tam, sam, som_year3,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
            )
          `, [
            project.name,
            project.description,
            project.status,
            project.complexity,
            project.client_appeal,
            project.year3_revenue,
            project.roi_score,
            project.tam,
            project.sam,
            project.som_year3
          ]);

          imported++;
          console.log(`  ✅ Imported: ${project.name}`);
        }

      } catch (error) {
        failed++;
        errors.push({ project: project.name, error: error.message });
        console.log(`  ❌ Failed: ${project.name} - ${error.message}`);
      }
    }

    client.release();

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('\n📈 Import Summary:\n');
    console.log(`  ✅ Imported: ${imported}`);
    console.log(`  ✏️  Updated:  ${updated}`);
    console.log(`  ❌ Failed:   ${failed}`);
    console.log(`  📊 Total:    ${projects.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(e => {
        console.log(`  - ${e.project}: ${e.error}`);
      });
    }

    console.log('\n✨ Import complete!\n');

    // Show verification query
    console.log('To verify, run this query in Supabase SQL Editor:');
    console.log('  SELECT COUNT(*) FROM projects;\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

// Run import
importProjects();
