/**
 * CTO Dashboard API Server v2.0
 * Complete REST API with all routes integrated
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const {
  apiLimiter,
  errorHandler,
  responseHelpers,
  corsOptions
} = require('./lib/middleware');

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

// Security
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response helpers
app.use(responseHelpers);

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: 'disconnected',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'CTO Dashboard API',
    version: '2.0.0',
    description: 'REST API for bug tracking and portfolio management',
    documentation: '/api/docs',
    endpoints: {
      projects: '/api/projects',
      analytics: '/api/analytics',
      ingestion: '/api/ingest',
      metrics: '/api/metrics',
      webhooks: '/api/webhooks'
    }
  });
});

// Mount route modules with rate limiting
const projectsRouter = require('./routes/projects');
const analyticsRouter = require('./routes/analytics');
const ingestRouter = require('./routes/ingest');
const metricsRouter = require('./routes/metrics');
const webhooksRouter = require('./routes/webhooks');

app.use('/api/projects', apiLimiter, projectsRouter);
app.use('/api/analytics', apiLimiter, analyticsRouter);
app.use('/api/ingest', ingestRouter); // Has its own strict limiter
app.use('/api/metrics', metricsRouter);
app.use('/api/webhooks', webhooksRouter); // Has its own strict limiter

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json(require('./lib/openapi-spec'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
      path: req.path
    }
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          CTO Dashboard API v2.0 - RUNNING                ║
║                                                           ║
║  Port:        ${PORT.toString().padEnd(42)} ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(42)} ║
║  Docs:        http://localhost:${PORT}/api/docs${' '.repeat(16)} ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Available Endpoints:
  GET    /health                    - Health check
  GET    /api                       - API info
  GET    /api/docs                  - OpenAPI documentation

  Projects API:
  GET    /api/projects              - List projects
  GET    /api/projects/:id          - Get project details
  GET    /api/projects/:id/bugs     - Get project bugs
  GET    /api/projects/:id/metrics  - Get project metrics
  POST   /api/projects              - Create project (protected)
  PUT    /api/projects/:id          - Update project (protected)
  DELETE /api/projects/:id          - Delete project (protected)

  Analytics API:
  GET    /api/analytics/summary     - Dashboard overview
  GET    /api/analytics/project/:slug - Project analytics
  GET    /api/analytics/trends      - Trend analysis
  GET    /api/analytics/risks       - Risk assessment

  Ingestion API:
  POST   /api/ingest/csv            - Upload CSV (protected)
  POST   /api/sync/github           - Trigger GitHub sync (protected)
  GET    /api/sync/status           - Sync progress (protected)

  Metrics API:
  POST   /api/metrics/rebuild       - Rebuild metrics (protected)
  GET    /api/metrics/daily         - Daily metrics
  GET    /api/metrics/monthly       - Monthly metrics
  GET    /api/metrics/portfolio     - Portfolio metrics

  Webhooks API:
  POST   /api/webhooks/github       - GitHub webhook receiver
  POST   /api/webhooks/test         - Test webhook

Authentication:
  Protected endpoints require API key in header:
    - Authorization: Bearer YOUR_API_KEY
    - x-api-key: YOUR_API_KEY

Rate Limits:
  - General API: 10 requests/second per IP
  - Ingestion/Webhooks: 5 requests/minute per IP
    `);
  });
}

module.exports = app;
