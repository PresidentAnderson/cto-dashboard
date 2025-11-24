/**
 * Authentication API - Using Supabase REST API
 * No database connection needed - uses HTTP requests
 */

const crypto = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iithtbuedvwmtbagquxy.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35';
const JWT_SECRET = process.env.JWT_SECRET || '9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

async function supabaseQuery(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }

  return await response.json();
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  Object.keys(corsHeaders).forEach(key => res.setHeader(key, corsHeaders[key]));

  const { method } = req;

  try {
    // LOGIN
    if (req.url.includes('/auth/login') && method === 'POST') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Get user from Supabase
      const users = await supabaseQuery(`users?email=eq.${encodeURIComponent(email)}`);

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const user = users[0];

      // Get password hash from audit_log for this specific user
      const auditLogs = await supabaseQuery(
        `audit_log?action=eq.password_created&details->>email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
        {
          headers: {
            'Prefer': 'return=representation'
          }
        }
      );

      if (auditLogs.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const storedHash = auditLogs[0].details.password_hash;
      const providedHash = hashPassword(password);

      if (storedHash !== providedHash) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Create JWT token
      const token = createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url
        }
      });
    }

    // REGISTER
    if (req.url.includes('/auth/register') && method === 'POST') {
      const { email, password, name, role = 'engineer' } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and name are required'
        });
      }

      // Check if user exists
      const existingUsers = await supabaseQuery(`users?email=eq.${encodeURIComponent(email)}`);

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User already exists'
        });
      }

      // Create user
      const newUsers = await supabaseQuery('users', {
        method: 'POST',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          email,
          name,
          role
        })
      });

      const newUser = newUsers[0];

      // Store password hash in audit_log
      const passwordHash = hashPassword(password);
      await supabaseQuery('audit_log', {
        method: 'POST',
        body: JSON.stringify({
          action: 'password_created',
          entity_type: 'user',
          entity_id: newUser.id,
          details: {
            email,
            password_hash: passwordHash
          }
        })
      });

      // Create JWT token
      const token = createToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
