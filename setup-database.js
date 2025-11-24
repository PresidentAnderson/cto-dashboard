#!/usr/bin/env node

/**
 * Complete Database Setup Script
 * 1. Creates all database tables, indexes, views, functions
 * 2. Creates admin user account
 * 3. Verifies everything is working
 */

const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = 'postgresql://postgres:Success*2026$$$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres';
const JWT_SECRET = '9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=';

const ADMIN_EMAIL = 'jonathan.mitchell.anderson@gmail.com';
const ADMIN_PASSWORD = 'J0n8th8n';
const ADMIN_NAME = 'Jonathan Anderson';
const ADMIN_ROLE = 'cto';

// Hash password using same method as api/auth.js
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

async function main() {
  console.log('\n🚀 CTO Dashboard - Complete Database Setup\n');
  console.log('═'.repeat(60));

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Step 1: Connect to database
    console.log('\n📡 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 2: Read and execute schema.sql
    console.log('📋 Creating database schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('   • Executing schema.sql (409 lines)...');
    await client.query(schemaSQL);
    console.log('✅ Database schema created successfully!\n');

    // Step 3: Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`✅ Created ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    console.log('');

    // Step 4: Create admin user
    console.log('👤 Creating admin account...');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    let userId;
    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists, updating...');
      await client.query(
        'UPDATE users SET name = $1, role = $2, updated_at = NOW() WHERE email = $3 RETURNING id',
        [ADMIN_NAME, ADMIN_ROLE, ADMIN_EMAIL]
      );
      userId = existingUser.rows[0].id;
    } else {
      const userResult = await client.query(
        'INSERT INTO users (email, name, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
        [ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE]
      );
      userId = userResult.rows[0].id;
      console.log(`✅ User created with ID: ${userId}`);
    }

    // Step 5: Store password hash in audit_log
    const passwordHash = hashPassword(ADMIN_PASSWORD);
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        'password_created',
        'user',
        userId,
        JSON.stringify({ email: ADMIN_EMAIL, password_hash: passwordHash })
      ]
    );
    console.log('✅ Password hash stored securely\n');

    // Step 6: Verify admin user
    console.log('🔍 Verifying admin account...');
    const verifyUser = await client.query(
      'SELECT id, email, name, role, created_at FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (verifyUser.rows.length > 0) {
      const user = verifyUser.rows[0];
      console.log('✅ Admin account verified:');
      console.log(`   • ID:    ${user.id}`);
      console.log(`   • Email: ${user.email}`);
      console.log(`   • Name:  ${user.name}`);
      console.log(`   • Role:  ${user.role}`);
      console.log('');
    }

    // Step 7: Get database statistics
    console.log('📊 Database Statistics:');
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM projects) as project_count,
        (SELECT COUNT(*) FROM bugs) as bug_count,
        (SELECT COUNT(*) FROM audit_log) as audit_log_count
    `);

    const dbStats = stats.rows[0];
    console.log(`   • Users:     ${dbStats.user_count}`);
    console.log(`   • Projects:  ${dbStats.project_count}`);
    console.log(`   • Bugs:      ${dbStats.bug_count}`);
    console.log(`   • Audit Log: ${dbStats.audit_log_count}`);
    console.log('');

    // Success!
    console.log('═'.repeat(60));
    console.log('\n✨ Setup Complete! ✨\n');
    console.log('🎯 Login Credentials:');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     ${ADMIN_ROLE}\n`);
    console.log('🌐 Dashboard URL:');
    console.log('   https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app\n');
    console.log('📝 Next Steps:');
    console.log('   1. Login to the dashboard');
    console.log('   2. Import projects: ./import-via-supabase.sh');
    console.log('   3. Add team members');
    console.log('   4. Customize branding\n');

  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
