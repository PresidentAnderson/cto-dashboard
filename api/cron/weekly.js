/**
 * Weekly Cron Job - CTO Dashboard v2.0
 *
 * Schedule: 0 9 * * 1 (Monday 9am)
 *
 * Tasks:
 * - Generate CTO report (summary of all metrics)
 * - Email to configured recipients
 * - Archive old data
 * - Health check all projects
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

// Main weekly job function
async function executeWeeklyJob(jobId) {
  const startTime = Date.now()
  const results = {
    reportGeneration: { success: false, reportData: null, errors: [] },
    emailSent: { success: false, recipients: [], errors: [] },
    dataArchival: { success: false, recordsArchived: 0, errors: [] },
    healthCheck: { success: false, projectsChecked: 0, errors: [] },
  }

  console.log(`[Weekly Job ${jobId}] Starting execution...`)

  // Task 1: Generate CTO Report
  try {
    await logSyncEvent(jobId, 'report_generation', 'started', 'Generating weekly CTO report')

    const reportData = await generateWeeklyReport()
    results.reportGeneration.reportData = reportData
    results.reportGeneration.success = true

    console.log(
      `[Weekly Job ${jobId}] Report generated: ${reportData.summary.activeProjects} active projects, ${reportData.summary.totalBugs} open bugs`
    )

    await logSyncEvent(
      jobId,
      'report_generation',
      'success',
      'Weekly report generated successfully',
      { summary: reportData.summary }
    )
  } catch (error) {
    console.error(`[Weekly Job ${jobId}] Report generation failed:`, error)
    results.reportGeneration.errors.push(error.message)
    await logSyncEvent(jobId, 'report_generation', 'failed', error.message)
  }

  // Task 2: Send Email Report
  try {
    await logSyncEvent(jobId, 'email_report', 'started', 'Sending email report')

    const recipients = (process.env.REPORT_EMAILS || '').split(',').filter(Boolean)

    if (recipients.length > 0 && results.reportGeneration.success) {
      const emailHTML = generateEmailHTML(results.reportGeneration.reportData)

      // Log email generation (actual sending would be via Resend/SendGrid)
      console.log(`[Weekly Job ${jobId}] Email report ready for ${recipients.length} recipient(s)`)
      console.log(`[Weekly Job ${jobId}] Recipients: ${recipients.join(', ')}`)
      console.log(`[Weekly Job ${jobId}] Email size: ${emailHTML.length} characters`)

      // TODO: Integrate with email service
      // await sendEmail({ to: recipients, subject: '...', html: emailHTML })

      results.emailSent.recipients = recipients
      results.emailSent.success = true

      await logSyncEvent(
        jobId,
        'email_report',
        'success',
        `Email prepared for ${recipients.length} recipient(s)`,
        { recipients }
      )
    } else {
      console.log(`[Weekly Job ${jobId}] No email recipients configured, skipping email`)
      results.emailSent.success = true

      await logSyncEvent(jobId, 'email_report', 'success', 'No recipients configured, skipped')
    }
  } catch (error) {
    console.error(`[Weekly Job ${jobId}] Email sending failed:`, error)
    results.emailSent.errors.push(error.message)
    await logSyncEvent(jobId, 'email_report', 'failed', error.message)
  }

  // Task 3: Archive Old Data
  try {
    await logSyncEvent(jobId, 'data_archival', 'started', 'Archiving old data')

    let totalArchived = 0

    // Archive old sync events (keep last 10,000)
    const oldSyncEvents = await prisma.syncEvent.findMany({
      orderBy: { timestamp: 'desc' },
      skip: 10000,
      take: 1,
      select: { timestamp: true },
    })

    if (oldSyncEvents.length > 0) {
      const deletedEvents = await prisma.syncEvent.deleteMany({
        where: {
          timestamp: { lt: oldSyncEvents[0].timestamp },
        },
      })
      totalArchived += deletedEvents.count
      console.log(`[Weekly Job ${jobId}] Archived ${deletedEvents.count} sync events`)
    }

    // Archive old job history (keep last 1,000)
    const oldJobHistory = await prisma.jobHistory.findMany({
      orderBy: { startedAt: 'desc' },
      skip: 1000,
      take: 1,
      select: { startedAt: true },
    })

    if (oldJobHistory.length > 0) {
      const deletedJobs = await prisma.jobHistory.deleteMany({
        where: {
          startedAt: { lt: oldJobHistory[0].startedAt },
        },
      })
      totalArchived += deletedJobs.count
      console.log(`[Weekly Job ${jobId}] Archived ${deletedJobs.count} job history records`)
    }

    // Archive old import logs (older than 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const deletedImports = await prisma.importLog.deleteMany({
      where: {
        timestamp: { lt: ninetyDaysAgo },
      },
    })
    totalArchived += deletedImports.count
    console.log(`[Weekly Job ${jobId}] Archived ${deletedImports.count} import logs`)

    results.dataArchival.recordsArchived = totalArchived
    results.dataArchival.success = true

    await logSyncEvent(
      jobId,
      'data_archival',
      'success',
      `Archived ${totalArchived} old record(s)`,
      { totalArchived }
    )
  } catch (error) {
    console.error(`[Weekly Job ${jobId}] Data archival failed:`, error)
    results.dataArchival.errors.push(error.message)
    await logSyncEvent(jobId, 'data_archival', 'failed', error.message)
  }

  // Task 4: Health Check All Projects
  try {
    await logSyncEvent(jobId, 'health_check', 'started', 'Running health checks on all projects')

    const projects = await prisma.project.findMany({
      include: {
        bugs: {
          where: { status: { not: 'closed' } },
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    })

    const healthReport = {
      total: projects.length,
      healthy: 0,
      warning: 0,
      critical: 0,
      projects: [],
    }

    for (const project of projects) {
      const latestMetric = project.metrics[0]
      const healthScore = latestMetric?.healthScore || 50
      const openBugs = project.bugs.length
      const criticalBugs = project.bugs.filter((b) => b.severity === 'critical').length

      let status = 'healthy'
      if (criticalBugs > 0 || healthScore < 50) {
        status = 'critical'
        healthReport.critical++
      } else if (openBugs > 5 || healthScore < 70) {
        status = 'warning'
        healthReport.warning++
      } else {
        healthReport.healthy++
      }

      healthReport.projects.push({
        id: project.id,
        name: project.name,
        status,
        healthScore,
        openBugs,
        criticalBugs,
      })
    }

    results.healthCheck.projectsChecked = projects.length
    results.healthCheck.success = true

    console.log(
      `[Weekly Job ${jobId}] Health check: ${healthReport.healthy} healthy, ${healthReport.warning} warning, ${healthReport.critical} critical`
    )

    await logSyncEvent(
      jobId,
      'health_check',
      'success',
      `Health check completed for ${projects.length} project(s)`,
      healthReport
    )
  } catch (error) {
    console.error(`[Weekly Job ${jobId}] Health check failed:`, error)
    results.healthCheck.errors.push(error.message)
    await logSyncEvent(jobId, 'health_check', 'failed', error.message)
  }

  const duration = Date.now() - startTime
  console.log(`[Weekly Job ${jobId}] Completed in ${duration}ms`)

  return {
    success: Object.values(results).every((r) => r.success),
    duration,
    results,
  }
}

// Generate weekly report data
async function generateWeeklyReport() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get summary metrics
  const [
    allProjects,
    activeProjects,
    shippedProjects,
    allBugs,
    criticalBugs,
    highBugs,
    resolvedBugs,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'active' } }),
    prisma.project.count({ where: { status: 'shipped' } }),
    prisma.bug.count({ where: { status: { not: 'closed' } } }),
    prisma.bug.count({ where: { severity: 'critical', status: { not: 'closed' } } }),
    prisma.bug.count({ where: { severity: 'high', status: { not: 'closed' } } }),
    prisma.bug.count({ where: { resolvedAt: { gte: weekAgo } } }),
  ])

  // Calculate metrics
  const avgResolution = await prisma.bug.aggregate({
    where: {
      resolvedAt: { gte: weekAgo },
      actualHours: { not: null },
    },
    _avg: { actualHours: true },
  })

  const revenueAtRisk = await prisma.bug.aggregate({
    where: {
      status: { not: 'closed' },
      revenueImpact: { not: null },
    },
    _sum: { revenueImpact: true },
  })

  // Get top projects
  const topProjects = await prisma.project.findMany({
    where: { status: 'active' },
    include: {
      metrics: { orderBy: { date: 'desc' }, take: 1 },
      bugs: { where: { status: { not: 'closed' } } },
    },
    take: 10,
  })

  // Get critical bugs
  const criticalBugsList = await prisma.bug.findMany({
    where: { severity: 'critical', status: { not: 'closed' } },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  })

  return {
    period: { start: weekAgo, end: now },
    summary: {
      totalProjects: allProjects,
      activeProjects,
      shippedProjects,
      totalBugs: allBugs,
      criticalBugs,
      highBugs,
      bugsResolved: resolvedBugs,
      avgResolutionTime: avgResolution._avg.actualHours || 0,
      revenueAtRisk: Number(revenueAtRisk._sum.revenueImpact || 0),
    },
    topProjects: topProjects.map((p) => ({
      name: p.name,
      healthScore: p.metrics[0]?.healthScore || 50,
      openBugs: p.bugs.length,
    })),
    criticalBugs: criticalBugsList.map((b) => ({
      bugNumber: b.bugNumber,
      title: b.title,
      assignedTo: b.assignedTo?.name || 'Unassigned',
      daysOpen: Math.floor((now.getTime() - b.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  }
}

// Generate HTML email template
function generateEmailHTML(data) {
  const { period, summary, topProjects, criticalBugs } = data

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CTO Dashboard Weekly Report</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #0070f3; border-bottom: 2px solid #0070f3; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 25px; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #0070f3; }
    .metric-label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #0070f3; color: white; padding: 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
    .critical { background: #f8d7da; border-left-color: #dc3545; }
  </style>
</head>
<body>
  <h1>CTO Dashboard Weekly Report</h1>
  <p><strong>Period:</strong> ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}</p>

  <div class="summary">
    <div class="metric">
      <div class="metric-value">${summary.activeProjects}</div>
      <div class="metric-label">Active Projects</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.totalBugs}</div>
      <div class="metric-label">Open Bugs</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.bugsResolved}</div>
      <div class="metric-label">Resolved This Week</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.avgResolutionTime.toFixed(1)}h</div>
      <div class="metric-label">Avg Resolution Time</div>
    </div>
  </div>

  ${
    summary.criticalBugs > 0
      ? `<div class="alert critical"><strong>⚠️ ${summary.criticalBugs} critical bug(s) require immediate attention!</strong></div>`
      : ''
  }

  <h2>Top Projects</h2>
  <table>
    <tr><th>Project</th><th>Health Score</th><th>Open Bugs</th></tr>
    ${topProjects.map((p) => `<tr><td>${p.name}</td><td>${p.healthScore}/100</td><td>${p.openBugs}</td></tr>`).join('')}
  </table>

  ${
    criticalBugs.length > 0
      ? `
  <h2>Critical Bugs</h2>
  <table>
    <tr><th>Bug #</th><th>Title</th><th>Assigned To</th><th>Days Open</th></tr>
    ${criticalBugs.map((b) => `<tr><td>${b.bugNumber}</td><td>${b.title}</td><td>${b.assignedTo}</td><td>${b.daysOpen}</td></tr>`).join('')}
  </table>
  `
      : ''
  }

  <p style="margin-top: 30px; color: #666; font-size: 12px;">
    CTO Dashboard v2.0 - Generated ${new Date().toLocaleString()}
  </p>
</body>
</html>
  `.trim()
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
        jobType: 'weekly_report',
        status: 'running',
        triggeredBy: 'vercel-cron',
        attempt: 1,
        maxAttempts: 1,
      },
    })

    console.log(`[Weekly Job] Started job ${jobRecord.id}`)

    // Execute the weekly job
    const result = await executeWeeklyJob(jobRecord.id)

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
    console.error('[Weekly Job] Fatal error:', error)

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  } finally {
    await prisma.$disconnect()
  }
}
