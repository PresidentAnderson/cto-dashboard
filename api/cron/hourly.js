/**
 * Hourly Cron Job - CTO Dashboard v2.0
 *
 * Schedule: 0 * * * * (Every hour)
 *
 * Tasks:
 * - Recalculate revenue at risk
 * - Update engineering velocity
 * - Check for SLA breaches
 * - Send alerts if needed
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

// Main hourly job function
async function executeHourlyJob(jobId) {
  const startTime = Date.now()
  const results = {
    revenueAtRisk: { success: false, value: 0, errors: [] },
    engineeringVelocity: { success: false, value: 0, errors: [] },
    slaBreaches: { success: false, breaches: [], errors: [] },
    alerts: { success: false, alertsSent: 0, errors: [] },
  }

  console.log(`[Hourly Job ${jobId}] Starting execution...`)

  // Task 1: Recalculate revenue at risk
  try {
    await logSyncEvent(jobId, 'revenue_at_risk', 'started', 'Calculating revenue at risk')

    // Get all open bugs with revenue impact
    const bugsWithImpact = await prisma.bug.findMany({
      where: {
        status: { notIn: ['closed', 'shipped', 'verified'] },
        revenueImpact: { not: null },
      },
      select: {
        id: true,
        bugNumber: true,
        revenueImpact: true,
        severity: true,
        createdAt: true,
      },
    })

    // Calculate total daily revenue at risk
    const totalRevenueAtRisk = bugsWithImpact.reduce(
      (sum, bug) => sum + Number(bug.revenueImpact || 0),
      0
    )

    results.revenueAtRisk.value = totalRevenueAtRisk
    results.revenueAtRisk.success = true

    console.log(`[Hourly Job ${jobId}] Revenue at risk: $${totalRevenueAtRisk.toLocaleString()}/day`)

    await logSyncEvent(
      jobId,
      'revenue_at_risk',
      'success',
      `Revenue at risk: $${totalRevenueAtRisk.toFixed(2)}/day`,
      {
        totalRevenueAtRisk,
        bugCount: bugsWithImpact.length,
        criticalBugs: bugsWithImpact.filter((b) => b.severity === 'critical').length,
      }
    )
  } catch (error) {
    console.error(`[Hourly Job ${jobId}] Revenue calculation failed:`, error)
    results.revenueAtRisk.errors.push(error.message)
    await logSyncEvent(jobId, 'revenue_at_risk', 'failed', error.message)
  }

  // Task 2: Update engineering velocity
  try {
    await logSyncEvent(jobId, 'eng_velocity', 'started', 'Calculating engineering velocity')

    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)

    // Count bugs resolved in last 7 days
    const resolvedBugs = await prisma.bug.count({
      where: {
        resolvedAt: { gte: last7Days },
        status: { in: ['verified', 'shipped', 'closed'] },
      },
    })

    // Calculate average resolution time
    const avgResolutionTime = await prisma.bug.aggregate({
      where: {
        resolvedAt: { gte: last7Days },
        status: { in: ['verified', 'shipped', 'closed'] },
        actualHours: { not: null },
      },
      _avg: {
        actualHours: true,
      },
    })

    const velocity = {
      bugsResolvedLast7Days: resolvedBugs,
      avgResolutionHours: avgResolutionTime._avg.actualHours || 0,
      velocityScore: resolvedBugs, // bugs per week
    }

    results.engineeringVelocity.value = velocity.velocityScore
    results.engineeringVelocity.success = true

    console.log(`[Hourly Job ${jobId}] Engineering velocity: ${velocity.velocityScore} bugs/week`)

    await logSyncEvent(
      jobId,
      'eng_velocity',
      'success',
      `Velocity: ${velocity.velocityScore} bugs/week`,
      velocity
    )
  } catch (error) {
    console.error(`[Hourly Job ${jobId}] Velocity calculation failed:`, error)
    results.engineeringVelocity.errors.push(error.message)
    await logSyncEvent(jobId, 'eng_velocity', 'failed', error.message)
  }

  // Task 3: Check for SLA breaches
  try {
    await logSyncEvent(jobId, 'sla_check', 'started', 'Checking for SLA breaches')

    const now = new Date()
    const bugs = await prisma.bug.findMany({
      where: {
        status: { notIn: ['closed', 'shipped', 'verified'] },
      },
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
        project: {
          select: { name: true },
        },
      },
    })

    const breaches = []

    for (const bug of bugs) {
      const ageHours = (now.getTime() - bug.createdAt.getTime()) / (1000 * 60 * 60)
      const slaHours = bug.slaHours

      if (ageHours > slaHours) {
        const breach = {
          bugId: bug.id,
          bugNumber: bug.bugNumber,
          title: bug.title,
          severity: bug.severity,
          slaHours,
          ageHours: Math.round(ageHours),
          breachHours: Math.round(ageHours - slaHours),
          assignedTo: bug.assignedTo?.name || 'Unassigned',
          project: bug.project?.name || 'No Project',
          revenueImpact: bug.revenueImpact ? Number(bug.revenueImpact) : 0,
        }

        breaches.push(breach)
        console.log(
          `[Hourly Job ${jobId}] SLA BREACH: ${bug.bugNumber} - ${breach.breachHours}h overdue`
        )
      }
    }

    results.slaBreaches.breaches = breaches
    results.slaBreaches.success = true

    if (breaches.length > 0) {
      await logSyncEvent(
        jobId,
        'sla_check',
        'warning',
        `Found ${breaches.length} SLA breach(es)`,
        { breaches }
      )
    } else {
      await logSyncEvent(jobId, 'sla_check', 'success', 'No SLA breaches found')
    }
  } catch (error) {
    console.error(`[Hourly Job ${jobId}] SLA check failed:`, error)
    results.slaBreaches.errors.push(error.message)
    await logSyncEvent(jobId, 'sla_check', 'failed', error.message)
  }

  // Task 4: Send alerts if needed
  try {
    await logSyncEvent(jobId, 'alerts', 'started', 'Processing alerts')

    let alertsSent = 0

    // Alert on critical bugs without assignment
    const unassignedCritical = await prisma.bug.count({
      where: {
        severity: 'critical',
        status: { notIn: ['closed', 'shipped', 'verified'] },
        assignedToId: null,
      },
    })

    if (unassignedCritical > 0) {
      console.log(`[Hourly Job ${jobId}] ALERT: ${unassignedCritical} unassigned critical bugs`)
      await logSyncEvent(
        jobId,
        'alert_unassigned_critical',
        'warning',
        `${unassignedCritical} critical bug(s) without assignment`,
        { count: unassignedCritical }
      )
      alertsSent++
    }

    // Alert on SLA breaches
    if (results.slaBreaches.breaches.length > 0) {
      const criticalBreaches = results.slaBreaches.breaches.filter(
        (b) => b.severity === 'critical'
      )
      if (criticalBreaches.length > 0) {
        console.log(
          `[Hourly Job ${jobId}] ALERT: ${criticalBreaches.length} critical bugs in SLA breach`
        )
        await logSyncEvent(
          jobId,
          'alert_sla_breach',
          'warning',
          `${criticalBreaches.length} critical bug(s) in SLA breach`,
          { breaches: criticalBreaches }
        )
        alertsSent++
      }
    }

    // Alert on high revenue at risk
    if (results.revenueAtRisk.value > 10000) {
      // $10k/day threshold
      console.log(
        `[Hourly Job ${jobId}] ALERT: High revenue at risk ($${results.revenueAtRisk.value.toLocaleString()}/day)`
      )
      await logSyncEvent(
        jobId,
        'alert_revenue_risk',
        'warning',
        `High revenue at risk: $${results.revenueAtRisk.value.toFixed(2)}/day`,
        { revenueAtRisk: results.revenueAtRisk.value }
      )
      alertsSent++
    }

    results.alerts.alertsSent = alertsSent
    results.alerts.success = true

    await logSyncEvent(
      jobId,
      'alerts',
      'success',
      alertsSent > 0 ? `Sent ${alertsSent} alert(s)` : 'No alerts needed'
    )
  } catch (error) {
    console.error(`[Hourly Job ${jobId}] Alert processing failed:`, error)
    results.alerts.errors.push(error.message)
    await logSyncEvent(jobId, 'alerts', 'failed', error.message)
  }

  const duration = Date.now() - startTime
  console.log(`[Hourly Job ${jobId}] Completed in ${duration}ms`)

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
  // Only allow POST and GET requests
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
        jobType: 'hourly_metrics',
        status: 'running',
        triggeredBy: 'vercel-cron',
        attempt: 1,
        maxAttempts: 1,
      },
    })

    console.log(`[Hourly Job] Started job ${jobRecord.id}`)

    // Execute the hourly job
    const result = await executeHourlyJob(jobRecord.id)

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
    console.error('[Hourly Job] Fatal error:', error)

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  } finally {
    await prisma.$disconnect()
  }
}
