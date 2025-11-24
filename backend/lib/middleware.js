/**
 * API Middleware - Authentication, Rate Limiting, Validation
 * CTO Dashboard v2.0
 */

const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * General API rate limiter - 10 requests per second per IP
 */
const apiLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  }
});

/**
 * Strict rate limiter for expensive operations (webhooks, imports)
 * 5 requests per minute
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Rate limit exceeded for this operation',
      code: 'STRICT_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * API Key Authentication Middleware
 * Checks for valid API key in Authorization header or x-api-key header
 */
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] ||
                 (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'API key required',
        code: 'API_KEY_MISSING'
      }
    });
  }

  // Check if API key is valid
  const validApiKeys = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid API key',
        code: 'API_KEY_INVALID'
      }
    });
  }

  // Attach API key info to request
  req.apiKey = apiKey;
  next();
}

/**
 * Optional Authentication - allows both authenticated and public access
 */
function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] ||
                 (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

  if (apiKey) {
    const validApiKeys = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
    req.authenticated = validApiKeys.includes(apiKey);
    req.apiKey = apiKey;
  } else {
    req.authenticated = false;
  }

  next();
}

// ============================================================================
// GITHUB WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify GitHub webhook signature
 * Ensures webhook requests are genuinely from GitHub
 */
function verifyGithubSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: {
        message: 'Webhook secret not configured',
        code: 'WEBHOOK_CONFIG_ERROR'
      }
    });
  }

  if (!signature) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Missing webhook signature',
        code: 'SIGNATURE_MISSING'
      }
    });
  }

  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', secret);
  const body = JSON.stringify(req.body);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid webhook signature',
        code: 'SIGNATURE_INVALID'
      }
    });
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid webhook signature',
        code: 'SIGNATURE_INVALID'
      }
    });
  }

  next();
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate request using Joi schema
 */
function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        }
      });
    }

    // Replace request data with validated/sanitized data
    req[source] = value;
    next();
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Async error handler wrapper
 * Catches errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  console.error('API Error:', err);

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'VALIDATION_ERROR'
      }
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Add standard response helpers to res object
 */
function responseHelpers(req, res, next) {
  // Success response
  res.success = (data, meta = null) => {
    const response = { success: true, data };
    if (meta) response.meta = meta;
    return res.json(response);
  };

  // Error response
  res.error = (message, code = 'ERROR', status = 400) => {
    return res.status(status).json({
      success: false,
      error: { message, code }
    });
  };

  // Paginated response
  res.paginated = (data, pagination) => {
    return res.json({
      success: true,
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit)
      }
    });
  };

  next();
}

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  apiLimiter,
  strictLimiter,
  authenticateApiKey,
  optionalAuth,
  verifyGithubSignature,
  validateRequest,
  asyncHandler,
  errorHandler,
  responseHelpers,
  corsOptions
};
