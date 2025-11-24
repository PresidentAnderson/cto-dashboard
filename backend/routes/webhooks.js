/**
 * Webhooks API Routes - GitHub Webhook Receiver
 * CTO Dashboard v2.0
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const {
  asyncHandler,
  verifyGithubSignature,
  strictLimiter
} = require('../lib/middleware');

// ============================================================================
// POST /api/webhooks/github - GitHub webhook receiver
// ============================================================================

router.post('/github',
  strictLimiter,
  express.json({ verify: storeRawBody }), // Store raw body for signature verification
  verifyGithubSignature,
  asyncHandler(async (req, res) => {
    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];
    const payload = req.body;

    console.log(`GitHub webhook received: ${event} (${delivery})`);

    try {
      let result;

      switch (event) {
        case 'push':
          result = await handlePushEvent(payload);
          break;

        case 'issues':
          result = await handleIssuesEvent(payload);
          break;

        case 'pull_request':
          result = await handlePullRequestEvent(payload);
          break;

        case 'repository':
          result = await handleRepositoryEvent(payload);
          break;

        case 'ping':
          result = { message: 'Pong! Webhook configured successfully.' };
          break;

        default:
          console.log(`Unhandled GitHub event: ${event}`);
          result = { message: `Event ${event} received but not processed` };
      }

      // Log webhook event
      await prisma.auditLog.create({
        data: {
          action: `webhook:${event}`,
          entityType: 'webhook',
          details: {
            event,
            delivery,
            repository: payload.repository?.full_name,
            action: payload.action,
            result
          }
        }
      });

      return res.success({
        message: 'Webhook processed successfully',
        event,
        delivery,
        result
      });

    } catch (err) {
      console.error('Webhook processing error:', err);

      // Log error
      await prisma.auditLog.create({
        data: {
          action: `webhook:${event}:error`,
          entityType: 'webhook',
          details: {
            event,
            delivery,
            error: err.message,
            repository: payload.repository?.full_name
          }
        }
      });

      return res.error(
        `Webhook processing failed: ${err.message}`,
        'WEBHOOK_ERROR',
        500
      );
    }
  })
);

// ============================================================================
// POST /api/webhooks/test - Test webhook endpoint (no signature required)
// ============================================================================

router.post('/test',
  asyncHandler(async (req, res) => {
    const { event_type, test_data } = req.body;

    return res.success({
      message: 'Test webhook received',
      event_type,
      test_data,
      timestamp: new Date().toISOString()
    });
  })
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle push event - Update project metrics
 */
async function handlePushEvent(payload) {
  const { repository, commits, pusher, ref } = payload;

  // Find project by GitHub URL
  const project = await prisma.project.findFirst({
    where: {
      githubUrl: { contains: repository.full_name }
    }
  });

  if (!project) {
    return { message: 'Project not found, skipping update' };
  }

  // Update project with latest commit info
  const lastCommit = commits[commits.length - 1];
  if (lastCommit) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        lastCommit: new Date(lastCommit.timestamp)
      }
    });
  }

  // Update or create project metric for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingMetric = await prisma.projectMetric.findUnique({
    where: {
      projectId_date: {
        projectId: project.id,
        date: today
      }
    }
  });

  if (existingMetric) {
    await prisma.projectMetric.update({
      where: {
        projectId_date: {
          projectId: project.id,
          date: today
        }
      },
      data: {
        commitsCount: existingMetric.commitsCount + commits.length
      }
    });
  } else {
    await prisma.projectMetric.create({
      data: {
        projectId: project.id,
        date: today,
        commitsCount: commits.length,
        contributors: 1,
        linesOfCode: 0,
        healthScore: 75,
        techStack: []
      }
    });
  }

  return {
    message: 'Push event processed',
    project: project.name,
    commits: commits.length,
    branch: ref
  };
}

/**
 * Handle issues event - Create or update bug
 */
async function handleIssuesEvent(payload) {
  const { action, issue, repository } = payload;

  // Find project by GitHub URL
  const project = await prisma.project.findFirst({
    where: {
      githubUrl: { contains: repository.full_name }
    }
  });

  if (!project) {
    return { message: 'Project not found, skipping issue processing' };
  }

  // Check if bug already exists
  const existingBug = await prisma.bug.findFirst({
    where: {
      title: issue.title,
      projectId: project.id
    }
  });

  if (action === 'opened' && !existingBug) {
    // Create new bug from issue
    const bugNumber = await generateBugNumber();

    // Determine severity from labels
    const severity = determineSeverityFromLabels(issue.labels);

    // Calculate SLA hours
    const slaHours = {
      critical: 4,
      high: 24,
      medium: 72,
      low: 168
    }[severity];

    // Calculate priority score
    const severityScore = { critical: 100, high: 75, medium: 50, low: 25 }[severity];
    const priorityScore = severityScore;

    await prisma.bug.create({
      data: {
        bugNumber,
        title: issue.title,
        description: issue.body || '',
        severity,
        status: 'pending',
        projectId: project.id,
        slaHours,
        priorityScore,
        businessImpact: `GitHub Issue #${issue.number}`,
        isBlocker: issue.labels.some(l => l.name.toLowerCase().includes('blocker'))
      }
    });

    return {
      message: 'Bug created from GitHub issue',
      bug_number: bugNumber,
      issue_number: issue.number
    };
  }

  if (action === 'closed' && existingBug) {
    // Update bug status
    await prisma.bug.update({
      where: { id: existingBug.id },
      data: {
        status: 'closed',
        resolvedAt: new Date()
      }
    });

    return {
      message: 'Bug closed from GitHub issue',
      bug_id: existingBug.id,
      issue_number: issue.number
    };
  }

  if (action === 'reopened' && existingBug) {
    // Reopen bug
    await prisma.bug.update({
      where: { id: existingBug.id },
      data: {
        status: 'pending',
        resolvedAt: null
      }
    });

    return {
      message: 'Bug reopened from GitHub issue',
      bug_id: existingBug.id,
      issue_number: issue.number
    };
  }

  return { message: `Issue ${action} event received but not processed` };
}

/**
 * Handle pull request event
 */
async function handlePullRequestEvent(payload) {
  const { action, pull_request, repository } = payload;

  // Find project by GitHub URL
  const project = await prisma.project.findFirst({
    where: {
      githubUrl: { contains: repository.full_name }
    }
  });

  if (!project) {
    return { message: 'Project not found, skipping PR processing' };
  }

  // Check if PR is related to a bug (by parsing title or description)
  const bugNumberMatch = pull_request.title.match(/BUG-\d+/) ||
                         pull_request.body?.match(/BUG-\d+/);

  if (bugNumberMatch) {
    const bugNumber = bugNumberMatch[0];

    const bug = await prisma.bug.findUnique({
      where: { bugNumber }
    });

    if (bug) {
      if (action === 'opened') {
        // Update bug to in_progress
        await prisma.bug.update({
          where: { id: bug.id },
          data: {
            status: 'in_progress'
          }
        });

        // Create history entry
        await prisma.bugHistory.create({
          data: {
            bugId: bug.id,
            fieldChanged: 'status',
            oldValue: bug.status,
            newValue: 'in_progress'
          }
        });
      }

      if (action === 'closed' && pull_request.merged) {
        // Update bug to verified
        await prisma.bug.update({
          where: { id: bug.id },
          data: {
            status: 'verified'
          }
        });

        // Create history entry
        await prisma.bugHistory.create({
          data: {
            bugId: bug.id,
            fieldChanged: 'status',
            oldValue: bug.status,
            newValue: 'verified'
          }
        });
      }

      return {
        message: 'Bug status updated from PR',
        bug_number: bugNumber,
        pr_number: pull_request.number,
        pr_action: action
      };
    }
  }

  return {
    message: 'PR event received but no bug association found',
    pr_number: pull_request.number
  };
}

/**
 * Handle repository event - Create or update project
 */
async function handleRepositoryEvent(payload) {
  const { action, repository } = payload;

  if (action === 'created') {
    // Create new project
    const project = await prisma.project.create({
      data: {
        name: repository.name,
        description: repository.description,
        githubUrl: repository.html_url,
        language: repository.language,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        tags: repository.topics || [],
        status: 'active'
      }
    });

    return {
      message: 'Project created from repository',
      project_id: project.id,
      repository: repository.full_name
    };
  }

  if (action === 'deleted') {
    // Archive or delete project
    const project = await prisma.project.findFirst({
      where: {
        githubUrl: { contains: repository.full_name }
      }
    });

    if (project) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'cancelled'
        }
      });

      return {
        message: 'Project archived from repository deletion',
        project_id: project.id,
        repository: repository.full_name
      };
    }
  }

  return { message: `Repository ${action} event received but not processed` };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Store raw body for signature verification
 */
function storeRawBody(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

/**
 * Generate unique bug number
 */
async function generateBugNumber() {
  const count = await prisma.bug.count();
  return `BUG-${(count + 1).toString().padStart(5, '0')}`;
}

/**
 * Determine bug severity from GitHub issue labels
 */
function determineSeverityFromLabels(labels) {
  const labelNames = labels.map(l => l.name.toLowerCase());

  if (labelNames.some(l => l.includes('critical') || l.includes('urgent'))) {
    return 'critical';
  }
  if (labelNames.some(l => l.includes('high') || l.includes('important'))) {
    return 'high';
  }
  if (labelNames.some(l => l.includes('low') || l.includes('minor'))) {
    return 'low';
  }

  return 'medium'; // default
}

module.exports = router;
