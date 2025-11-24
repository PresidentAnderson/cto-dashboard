/**
 * Authentication API - Vercel Serverless Function
 * JWT-based authentication with login, register, and session management
 */

const { Pool } = require('pg');
const crypto = require('crypto');

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

async function query(text, params) {
  const client = getPool();
  return await client.query(text, params);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Simple JWT implementation (in production, use jsonwebtoken library)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  Object.keys(corsHeaders).forEach(key => res.setHeader(key, corsHeaders[key]));

  const { method } = req;

  try {
    // Register new user
    if (req.url.includes('/auth/register') && method === 'POST') {
      const { email, password, name, role = 'engineer' } = req.body;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and name are required'
        });
      }

      // Check if user exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const passwordHash = hashPassword(password);

      // Create user
      const result = await query(
        'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING id, email, name, role',
        [email, name, role]
      );

      // Store password hash in audit_log (temporary - add password column in production)
      await query(
        'INSERT INTO audit_log (user_id, action, details) VALUES ($1, $2, $3)',
        [result.rows[0].id, 'password_set', { password_hash: passwordHash }]
      );

      // Create JWT token
      const token = createToken({
        userId: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      });

      return res.status(201).json({
        success: true,
        token,
        user: result.rows[0]
      });
    }

    // Login
    if (req.url.includes('/auth/login') && method === 'POST') {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Find user
      const userResult = await query(
        'SELECT id, email, name, role FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = userResult.rows[0];

      // Get password hash from audit_log
      const passwordResult = await query(
        `SELECT details FROM audit_log
         WHERE user_id = $1 AND action = 'password_set'
         ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );

      if (passwordResult.rows.length === 0) {
        // No password set - for demo, allow login
        // In production, this should return an error
      } else {
        const storedHash = passwordResult.rows[0].details.password_hash;
        const providedHash = hashPassword(password);

        if (storedHash !== providedHash) {
          return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }
      }

      // Create JWT token
      const token = createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      });

      // Log login
      await query(
        'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
        [user.id, 'user_login', { timestamp: new Date().toISOString() }, req.headers['x-forwarded-for'] || req.connection.remoteAddress]
      );

      return res.status(200).json({
        success: true,
        token,
        user
      });
    }

    // Verify token (get current user)
    if (req.url.includes('/auth/me') && method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Get fresh user data
      const userResult = await query(
        'SELECT id, email, name, role, avatar_url FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        user: userResult.rows[0]
      });
    }

    // Logout (client-side only - remove token)
    if (req.url.includes('/auth/logout') && method === 'POST') {
      // Log logout
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded) {
          await query(
            'INSERT INTO audit_log (user_id, action, details) VALUES ($1, $2, $3)',
            [decoded.userId, 'user_logout', { timestamp: new Date().toISOString() }]
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Auth endpoint not found'
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
