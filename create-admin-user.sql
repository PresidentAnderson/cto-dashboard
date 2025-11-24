-- Create Admin User Account
-- Execute this in Supabase SQL Editor or via psql

-- Create user with hashed password
INSERT INTO users (email, name, role, created_at, updated_at)
VALUES (
  'jonathan.mitchell.anderson@gmail.com',
  'Jonathan Anderson',
  'cto',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Store password hash in audit_log (temporary solution until password_hash column is added)
-- SHA-256 hash of 'J0n8th8n'
INSERT INTO audit_log (entity, action, details, created_at)
VALUES (
  'user',
  'password_created',
  jsonb_build_object(
    'email', 'jonathan.mitchell.anderson@gmail.com',
    'passwordHash', encode(digest('J0n8th8n', 'sha256'), 'hex')
  ),
  NOW()
);

-- Verify user was created
SELECT id, email, name, role, created_at
FROM users
WHERE email = 'jonathan.mitchell.anderson@gmail.com';
