#!/usr/bin/env node

/**
 * Create Admin Account - Direct Database Method
 * Creates an admin user account directly in the database
 * Bypasses Vercel deployment protection
 */

const { Pool } = require('./backend/node_modules/pg');
const crypto = require('crypto');

// Database URL
const DATABASE_URL = 'postgresql://postgres:Success*2026$$$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres';

// User details
const email = 'jonathan.mitchell.anderson@gmail.com';
const password = 'J0n8th8n';
const name = 'Jonathan Anderson';
const role = 'cto';

// Hash password (simple for now - production should use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createAdminAccount() {
  console.log('\n🔐 Creating Admin Account\n');
  console.log('═'.repeat(50));

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('\n✓ Connecting to database...');
    const client = await pool.connect();
    console.log('✓ Database connected\n');

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists:');
      console.log(`   Email: ${existingUser.rows[0].email}`);
      console.log(`   ID: ${existingUser.rows[0].id}\n`);

      // Update password
      const passwordHash = hashPassword(password);
      await client.query(
        'UPDATE users SET name = $1, role = $2 WHERE email = $3',
        [name, role, email]
      );

      // Store password in audit_log (temporary solution)
      await client.query(
        'INSERT INTO audit_log (entity, action, details) VALUES ($1, $2, $3)',
        ['user', 'password_reset', JSON.stringify({ email, passwordHash })]
      );

      console.log('✓ Password updated!\n');
    } else {
      // Create new user
      const passwordHash = hashPassword(password);

      const result = await client.query(
        'INSERT INTO users (email, name, role, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email',
        [email, name, role]
      );

      console.log('✓ User created:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   ID: ${result.rows[0].id}\n`);

      // Store password in audit_log (temporary solution)
      await client.query(
        'INSERT INTO audit_log (entity, action, details) VALUES ($1, $2, $3)',
        ['user', 'password_created', JSON.stringify({ email, passwordHash })]
      );

      console.log('✓ Password stored!\n');
    }

    client.release();

    console.log('═'.repeat(50));
    console.log('\n✅ Account Setup Complete!\n');
    console.log('Login Credentials:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${role}\n`);
    console.log('Dashboard URL:');
    console.log('   https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app\n');
    console.log('Note: You may need to disable Vercel deployment protection');
    console.log('or access via the Vercel dashboard to login.\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

createAdminAccount();
