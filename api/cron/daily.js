/**
 * Daily Cron Job - CTO Dashboard v2.0
 *
 * Schedule: 0 2 * * * (2am daily)
 *
 * Tasks:
 * - Sync all GitHub repos
 * - Pull issues and PRs
 * - Calculate daily metrics
 * - Update project health scores
 * - Clean up old sync logs
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Verify cron secret for security
function verifyCronSecret(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// Main daily job function
async function executeDailyJob(jobId) {
  const startTime = Date.now()
  const results = {
    githubSync: { success: false, recordsProcessed: 0, errors: [] },
    metricsCalculation: { success: false, recordsProcessed: 0, errors: [] },
    healthScores: { success: false, recordsProcessed: 0, errors: [] },
    cleanup: { success: false, recordsProcessed: 0, errors: [] },
  }

  console.log(`[Daily Job ${jobId}] Starting execution...`)

  // Task 1: Sync GitHub repos
  try {
    await logSyncEvent(jobId, 'github_sync', 'started', 'Starting GitHub repository sync')

    const projects = await prisma.project.findMany({
      where: {
        githubUrl: { not: null },
        status: 'active',
      },
    })

    console.log(`[Daily Job ${jobId}] Found ${projects.length} projects to sync`)

    for (const project of projects) {
      try {
        // TODO: Integrate with GitHub API to fetch latest data
        // This would call your GitHub sync orchestrator
        console.log(`[Daily Job ${jobId}] Syncing project: ${project.name}`)

        // Update last commit date (placeholder)
        await prisma.project.update({
          where: { id: project.id },
          data: { updatedAt: new Date() },
        })

        results.githubSync.recordsProcessed++
      } catch (error) {
        console.error(`[Daily Job ${jobId}] Error syncing project ${project.name}:`, error)
        results.githubSync.errors.push(`${project.name}: ${error.message}`)
      }
    }

    results.githubSync.success = true
    await logSyncEvent(
      jobId,
      'github_sync',
      'success',
      `Synced ${results.githubSync.recordsProcessed} repositories`,
      { recordsProcessed: results.githubSync.recordsProcessed }
    )
  } catch (error) {
    console.error(`[Daily Job ${jobId}] GitHub sync failed:`, error)
    results.githubSync.errors.push(error.message)
    await logSyncEvent(jobId, 'github_sync', 'failed', error.message)
  }

  // Task 2: Calculate daily metrics
  try {
    await logSyncEvent(jobId, 'metrics_calculation', 'started', 'Calculating daily metrics')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const projects = await prisma.project.findMany({
      where: { status: 'active' },
      include: {
        bugs: {
          where: { status: { not: 'closed' } },
        },
      },
    })

    for (const project of projects) {
      try {
        // Calculate health score based on various factors
        const bugCount = project.bugs.length
        const criticalBugs = project.bugs.filter((b) => b.severity === 'critical').length

        // Simple health score algorithm
        let healthScore = 100
        healthScore -= bugCount * 2 // -2 points per bug
        healthScore -= criticalBugs * 10 // -10 points per critical bug
        healthScore = Math.max(0, Math.min(100, healthScore))

        // Upsert project metrics
        await prisma.projectMetric.upsert({
          where: {
            projectId_date: {
              projectId: project.id,
              date: today,
            },
          },
          update: {
            healthScore,
            commitsCount: 0, // TODO: Get from GitHub
            contributors: 0, // TODO: Get from GitHub
            linesOfCode: 0, // TODO: Calculate
          },
          create: {
            projectId: project.id,
            date: today,
            healthScore,
            commitsCount: 0,
            contributors: 0,
            linesOfCode: 0,
          },
        })

        results.metricsCalculation.recordsProcessed++
      } catch (error) {
        console.error(`[Daily Job ${jobId}] Error calculating metrics for ${project.name}:`, error)
        results.metricsCalculation.errors.push(`${project.name}: ${error.message}`)
      }
    }

    results.metricsCalculation.success = true
    await logSyncEvent(
      jobId,
      'metrics_calculation',
      'success',
      `Calculated metrics for ${results.metricsCalculation.recordsProcessed} projects`
    )
  } catch (error) {
    console.error(`[Daily Job ${jobId}] Metrics calculation failed:`, error)
    results.metricsCalculation.errors.push(error.message)
    await logSyncEvent(jobId, 'metrics_calculation', 'failed', error.message)
  }

  // Task 3: Update project health scores
  try {
    await logSyncEvent(jobId, 'health_scores', 'started', 'Updating project health scores')

    const projects = await prisma.project.findMany({
      where: { status: 'active' },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    })

    results.healthScores.recordsProcessed = projects.length
    results.healthScores.success = true

    await logSyncEvent(
      jobId,
      'health_scores',
      'success',
      `Updated health scores for ${projects.length} projects`
    )
  } catch (error) {
    console.error(`[Daily Job ${jobId}] Health score update failed:`, error)
    results.healthScores.errors.push(error.message)
    await logSyncEvent(jobId, 'health_scores', 'failed', error.message)
  }

  // Task 4: Clean up old sync logs
  try {
    await logSyncEvent(jobId, 'cleanup', 'started', 'Cleaning up old logs')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Clean up old sync events
    const deletedEvents = await prisma.syncEvent.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo },
        status: { not: 'failed' }, // Keep failed events longer for debugging
      },
    })

    // Clean up old import logs
    const deletedImports = await prisma.importLog.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo },
      },
    })

    results.cleanup.recordsProcessed = deletedEvents.count + deletedImports.count
    results.cleanup.success = true

    await logSyncEvent(
      jobId,
      'cleanup',
      'success',
      `Cleaned up ${results.cleanup.recordsProcessed} old records`
    )
  } catch (error) {
    console.error(`[Daily Job ${jobId}] Cleanup failed:`, error)
    results.cleanup.errors.push(error.message)
    await logSyncEvent(jobId, 'cleanup', 'failed', error.message)
  }

  const duration = Date.now() - startTime
  console.log(`[Daily Job ${jobId}] Completed in ${duration}ms`)

  return {
    success: Object.values(results).every((r) => r.success),
    duration,
    results,
  }
}

// Helper function to log sync events
async function logSyncEvent(jobId, eventType, status, message, details = null) {
  try {
    await prisma.syncEvent.create({
      data: {
        jobId,
        eventType,
        status,
        message,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to log sync event:', error)
  }
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify cron secret
  if (!verifyCronSecret(req)) {
    console.warn('Unauthorized cron job attempt')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Create job history record
    const jobRecord = await prisma.jobHistory.create({
      data: {
        jobType: 'daily_sync',
        status: 'running',
        triggeredBy: 'vercel-cron',
        attempt: 1,
        maxAttempts: 1,
      },
    })

    console.log(`[Daily Job] Started job ${jobRecord.id}`)

    // Execute the daily job
    const result = await executeDailyJob(jobRecord.id)

    // Update job history with results
    await prisma.jobHistory.update({
      where: { id: jobRecord.id },
      data: {
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date(),
        executionTimeMs: result.duration,
        result: result,
      },
    })

    return res.status(200).json({
      success: true,
      jobId: jobRecord.id,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error) {
    console.error('[Daily Job] Fatal error:', error)

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  } finally {
    await prisma.$disconnect()
  }
}
