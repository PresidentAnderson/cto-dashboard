/**
 * Projects API Routes
 * CTO Dashboard v2.0
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  asyncHandler,
  optionalAuth,
  authenticateApiKey,
  validateRequest
} = require('../lib/middleware');

const {
  listProjectsSchema,
  createProjectSchema,
  updateProjectSchema,
  idParamSchema
} = require('../lib/validators');

// ============================================================================
// GET /api/projects - List all projects with filters
// ============================================================================

router.get('/',
  optionalAuth,
  validateRequest(listProjectsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const {
      status,
      language,
      complexity_min,
      complexity_max,
      client_appeal_min,
      client_appeal_max,
      has_github,
      search,
      sort_by,
      sort_order,
      page,
      limit
    } = req.query;

    // Build where clause
    const where = {};

    if (status) where.status = status;
    if (language) where.language = { contains: language, mode: 'insensitive' };
    if (has_github !== undefined) {
      where.githubUrl = has_github === true ? { not: null } : null;
    }

    // Complexity filter
    if (complexity_min || complexity_max) {
      where.complexity = {};
      if (complexity_min) where.complexity.gte = parseInt(complexity_min);
      if (complexity_max) where.complexity.lte = parseInt(complexity_max);
    }

    // Client appeal filter
    if (client_appeal_min || client_appeal_max) {
      where.clientAppeal = {};
      if (client_appeal_min) where.clientAppeal.gte = parseInt(client_appeal_min);
      if (client_appeal_max) where.clientAppeal.lte = parseInt(client_appeal_max);
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: {
          _count: {
            select: { bugs: true }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    // Format response
    const formattedProjects = projects.map(project => ({
      ...project,
      bug_count: project._count.bugs,
      _count: undefined
    }));

    return res.paginated(formattedProjects, {
      page,
      limit,
      total
    });
  })
);

// ============================================================================
// GET /api/projects/:id - Get single project with details
// ============================================================================

router.get('/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        bugs: {
          orderBy: { priorityScore: 'desc' },
          take: 10,
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            }
          }
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 30
        },
        _count: {
          select: { bugs: true }
        }
      }
    });

    if (!project) {
      return res.error('Project not found', 'PROJECT_NOT_FOUND', 404);
    }

    // Calculate additional metrics
    const criticalBugs = project.bugs.filter(b => b.severity === 'critical').length;
    const highBugs = project.bugs.filter(b => b.severity === 'high').length;
    const blockerBugs = project.bugs.filter(b => b.isBlocker).length;

    const response = {
      ...project,
      bug_summary: {
        total: project._count.bugs,
        critical: criticalBugs,
        high: highBugs,
        blockers: blockerBugs
      },
      _count: undefined
    };

    return res.success(response);
  })
);

// ============================================================================
// GET /api/projects/:id/bugs - Get project bugs
// ============================================================================

router.get('/:id/bugs',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { severity, status, page = 1, limit = 20 } = req.query;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!project) {
      return res.error('Project not found', 'PROJECT_NOT_FOUND', 404);
    }

    // Build where clause
    const where = { projectId: id };
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bugs
    const [bugs, total] = await Promise.all([
      prisma.bug.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { priorityScore: 'desc' },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, avatarUrl: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.bug.count({ where })
    ]);

    return res.paginated(bugs, {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    });
  })
);

// ============================================================================
// GET /api/projects/:id/metrics - Get project metrics
// ============================================================================

router.get('/:id/metrics',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { days = 30 } = req.query;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!project) {
      return res.error('Project not found', 'PROJECT_NOT_FOUND', 404);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get metrics
    const metrics = await prisma.projectMetric.findMany({
      where: {
        projectId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get bug statistics for the period
    const bugStats = await prisma.bug.groupBy({
      by: ['severity'],
      where: {
        projectId: id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true
    });

    return res.success({
      project: {
        id: project.id,
        name: project.name
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: parseInt(days)
      },
      metrics,
      bug_stats: bugStats
    });
  })
);

// ============================================================================
// POST /api/projects - Create new project (Protected)
// ============================================================================

router.post('/',
  authenticateApiKey,
  validateRequest(createProjectSchema, 'body'),
  asyncHandler(async (req, res) => {
    const projectData = req.body;

    // Check for duplicate GitHub URL
    if (projectData.github_url) {
      const existing = await prisma.project.findUnique({
        where: { githubUrl: projectData.github_url }
      });

      if (existing) {
        return res.error('Project with this GitHub URL already exists', 'DUPLICATE_GITHUB_URL', 409);
      }
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        githubUrl: projectData.github_url,
        demoUrl: projectData.demo_url,
        language: projectData.language,
        tags: projectData.tags || [],
        status: projectData.status,
        complexity: projectData.complexity,
        clientAppeal: projectData.client_appeal,
        currentMilestone: projectData.current_milestone,
        totalMilestones: projectData.total_milestones,
        arr: projectData.arr,
        year1Revenue: projectData.year1_revenue,
        year3Revenue: projectData.year3_revenue,
        monthlyInfraCost: projectData.monthly_infra_cost
      }
    });

    return res.status(201).success(project);
  })
);

// ============================================================================
// PUT /api/projects/:id - Update project (Protected)
// ============================================================================

router.put('/:id',
  authenticateApiKey,
  validateRequest(updateProjectSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.error('Project not found', 'PROJECT_NOT_FOUND', 404);
    }

    // Check for duplicate GitHub URL
    if (updateData.github_url && updateData.github_url !== existing.githubUrl) {
      const duplicate = await prisma.project.findUnique({
        where: { githubUrl: updateData.github_url }
      });

      if (duplicate) {
        return res.error('Project with this GitHub URL already exists', 'DUPLICATE_GITHUB_URL', 409);
      }
    }

    // Update project
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.github_url !== undefined && { githubUrl: updateData.github_url }),
        ...(updateData.demo_url !== undefined && { demoUrl: updateData.demo_url }),
        ...(updateData.language !== undefined && { language: updateData.language }),
        ...(updateData.tags && { tags: updateData.tags }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.complexity !== undefined && { complexity: updateData.complexity }),
        ...(updateData.client_appeal !== undefined && { clientAppeal: updateData.client_appeal }),
        ...(updateData.current_milestone !== undefined && { currentMilestone: updateData.current_milestone }),
        ...(updateData.total_milestones !== undefined && { totalMilestones: updateData.total_milestones }),
        ...(updateData.arr !== undefined && { arr: updateData.arr }),
        ...(updateData.year1_revenue !== undefined && { year1Revenue: updateData.year1_revenue }),
        ...(updateData.year3_revenue !== undefined && { year3Revenue: updateData.year3_revenue }),
        ...(updateData.monthly_infra_cost !== undefined && { monthlyInfraCost: updateData.monthly_infra_cost })
      }
    });

    return res.success(project);
  })
);

// ============================================================================
// DELETE /api/projects/:id - Delete project (Protected)
// ============================================================================

router.delete('/:id',
  authenticateApiKey,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if project exists
    const existing = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bugs: true }
        }
      }
    });

    if (!existing) {
      return res.error('Project not found', 'PROJECT_NOT_FOUND', 404);
    }

    // Warn if project has bugs
    if (existing._count.bugs > 0) {
      const { force } = req.query;
      if (!force) {
        return res.error(
          `Project has ${existing._count.bugs} bugs. Use ?force=true to delete anyway`,
          'PROJECT_HAS_BUGS',
          409
        );
      }
    }

    // Delete project (cascades to bugs and metrics)
    await prisma.project.delete({
      where: { id }
    });

    return res.success({ message: 'Project deleted successfully' });
  })
);

module.exports = router;
