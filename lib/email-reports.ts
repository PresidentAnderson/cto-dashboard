/**
 * Email Reports for CTO Dashboard v2.0
 *
 * Generate and send HTML email reports with:
 * - Weekly CTO summary
 * - Key metrics and KPIs
 * - Project health updates
 * - Bug tracking alerts
 * - Charts and visualizations
 */

import { prisma } from './prisma'

export interface EmailConfig {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
}

export interface ReportData {
  period: { start: Date; end: Date }
  summary: {
    totalProjects: number
    activeProjects: number
    shippedProjects: number
    totalBugs: number
    criticalBugs: number
    highBugs: number
    bugsResolved: number
    avgResolutionTime: number
    engineeringVelocity: number
    revenueAtRisk: number
  }
  topProjects: Array<{
    name: string
    status: string
    healthScore: number
    progress: number
    issues: number
  }>
  criticalBugs: Array<{
    bugNumber: string
    title: string
    severity: string
    status: string
    assignedTo?: string
    daysOpen: number
    revenueImpact?: number
  }>
  metrics: {
    jobExecutions: number
    successRate: number
    avgJobTime: number
  }
}

/**
 * Email Reports class for generating and sending reports
 */
export class EmailReports {
  private config: EmailConfig

  constructor(config?: Partial<EmailConfig>) {
    this.config = {
      from: process.env.EMAIL_FROM || 'cto-dashboard@example.com',
      to: (process.env.REPORT_EMAILS?.split(',') || []).filter(Boolean),
      ...config,
    }
  }

  /**
   * Generate weekly CTO report
   */
  async generateWeeklyReport(): Promise<ReportData> {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get projects data
    const [
      allProjects,
      activeProjects,
      shippedProjects,
      allBugs,
      criticalBugs,
      highBugs,
      resolvedBugs,
      topProjectsData,
      criticalBugsData,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'active' } }),
      prisma.project.count({ where: { status: 'shipped' } }),
      prisma.bug.count({ where: { status: { not: 'closed' } } }),
      prisma.bug.count({ where: { severity: 'critical', status: { not: 'closed' } } }),
      prisma.bug.count({ where: { severity: 'high', status: { not: 'closed' } } }),
      prisma.bug.count({
        where: {
          resolvedAt: { gte: weekAgo },
        },
      }),
      this.getTopProjects(),
      this.getCriticalBugs(),
    ])

    // Calculate average resolution time
    const avgResolution = await prisma.bug.aggregate({
      where: {
        resolvedAt: { gte: weekAgo },
        status: { in: ['verified', 'shipped', 'closed'] },
      },
      _avg: {
        actualHours: true,
      },
    })

    // Calculate revenue at risk
    const revenueAtRisk = await prisma.bug.aggregate({
      where: {
        status: { not: 'closed' },
        revenueImpact: { not: null },
      },
      _sum: {
        revenueImpact: true,
      },
    })

    // Get job execution metrics
    const jobMetrics = await this.getJobMetrics(weekAgo)

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
        engineeringVelocity: resolvedBugs,
        revenueAtRisk: Number(revenueAtRisk._sum.revenueImpact || 0),
      },
      topProjects: topProjectsData,
      criticalBugs: criticalBugsData,
      metrics: jobMetrics,
    }
  }

  /**
   * Get top projects by health score
   */
  private async getTopProjects() {
    const projects = await prisma.project.findMany({
      where: { status: 'active' },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        bugs: {
          where: { status: { not: 'closed' } },
        },
      },
      take: 10,
    })

    return projects.map((project) => ({
      name: project.name,
      status: project.status,
      healthScore: project.metrics[0]?.healthScore || 50,
      progress: project.totalMilestones > 0
        ? Math.round((project.currentMilestone / project.totalMilestones) * 100)
        : 0,
      issues: project.bugs.length,
    }))
  }

  /**
   * Get critical bugs
   */
  private async getCriticalBugs() {
    const bugs = await prisma.bug.findMany({
      where: {
        severity: 'critical',
        status: { not: 'closed' },
      },
      include: {
        assignedTo: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    return bugs.map((bug) => ({
      bugNumber: bug.bugNumber,
      title: bug.title,
      severity: bug.severity,
      status: bug.status,
      assignedTo: bug.assignedTo?.name,
      daysOpen: Math.floor((Date.now() - bug.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      revenueImpact: bug.revenueImpact ? Number(bug.revenueImpact) : undefined,
    }))
  }

  /**
   * Get job execution metrics
   */
  private async getJobMetrics(since: Date) {
    const [total, successful, avgTime] = await Promise.all([
      prisma.jobHistory.count({ where: { startedAt: { gte: since } } }),
      prisma.jobHistory.count({
        where: { startedAt: { gte: since }, status: 'completed' },
      }),
      prisma.jobHistory.aggregate({
        where: {
          startedAt: { gte: since },
          status: 'completed',
          executionTimeMs: { not: null },
        },
        _avg: { executionTimeMs: true },
      }),
    ])

    return {
      jobExecutions: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgJobTime: Math.round((avgTime._avg.executionTimeMs || 0) / 1000), // Convert to seconds
    }
  }

  /**
   * Generate HTML email template
   */
  generateEmailHTML(data: ReportData): string {
    const { period, summary, topProjects, criticalBugs, metrics } = data

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CTO Dashboard Weekly Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1a1a1a; margin-top: 0; border-bottom: 3px solid #0070f3; padding-bottom: 15px; }
    h2 { color: #0070f3; margin-top: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #0070f3; }
    .metric-value { font-size: 28px; font-weight: bold; color: #0070f3; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .critical { background: #f8d7da; border-left-color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #0070f3; color: white; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; }
    tr:hover { background: #f8f9fa; }
    .status-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-active { background: #d4edda; color: #155724; }
    .status-critical { background: #f8d7da; color: #721c24; }
    .status-high { background: #fff3cd; color: #856404; }
    .health-score { font-weight: bold; }
    .health-good { color: #28a745; }
    .health-warning { color: #ffc107; }
    .health-danger { color: #dc3545; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0; color: #666; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CTO Dashboard Weekly Report</h1>
    <p style="color: #666;">
      <strong>Report Period:</strong>
      ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}
    </p>

    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="metric-card">
        <div class="metric-value">${summary.activeProjects}</div>
        <div class="metric-label">Active Projects</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${summary.totalBugs}</div>
        <div class="metric-label">Open Bugs</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${summary.bugsResolved}</div>
        <div class="metric-label">Bugs Resolved</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${summary.avgResolutionTime.toFixed(1)}h</div>
        <div class="metric-label">Avg Resolution Time</div>
      </div>
    </div>

    ${summary.criticalBugs > 0 ? `
    <div class="alert critical">
      <strong>⚠️ Critical Alert:</strong> ${summary.criticalBugs} critical bug${summary.criticalBugs > 1 ? 's' : ''} require${summary.criticalBugs === 1 ? 's' : ''} immediate attention!
    </div>
    ` : ''}

    ${summary.revenueAtRisk > 0 ? `
    <div class="alert">
      <strong>💰 Revenue at Risk:</strong> $${summary.revenueAtRisk.toLocaleString()} daily revenue impacted by open bugs
    </div>
    ` : ''}

    <h2>Top Projects</h2>
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Health Score</th>
          <th>Progress</th>
          <th>Issues</th>
        </tr>
      </thead>
      <tbody>
        ${topProjects.map(project => `
        <tr>
          <td><strong>${project.name}</strong></td>
          <td>
            <span class="health-score ${
              project.healthScore >= 80 ? 'health-good' :
              project.healthScore >= 60 ? 'health-warning' :
              'health-danger'
            }">${project.healthScore}/100</span>
          </td>
          <td>${project.progress}%</td>
          <td>${project.issues}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    ${criticalBugs.length > 0 ? `
    <h2>Critical Bugs</h2>
    <table>
      <thead>
        <tr>
          <th>Bug #</th>
          <th>Title</th>
          <th>Assigned To</th>
          <th>Days Open</th>
          <th>Revenue Impact</th>
        </tr>
      </thead>
      <tbody>
        ${criticalBugs.map(bug => `
        <tr>
          <td><strong>${bug.bugNumber}</strong></td>
          <td>${bug.title}</td>
          <td>${bug.assignedTo || 'Unassigned'}</td>
          <td>${bug.daysOpen}</td>
          <td>${bug.revenueImpact ? '$' + bug.revenueImpact.toLocaleString() : '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <h2>System Health</h2>
    <div class="summary-grid">
      <div class="metric-card">
        <div class="metric-value">${metrics.jobExecutions}</div>
        <div class="metric-label">Job Executions</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.successRate.toFixed(1)}%</div>
        <div class="metric-label">Success Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.avgJobTime}s</div>
        <div class="metric-label">Avg Job Time</div>
      </div>
    </div>

    <div class="footer">
      <p>CTO Dashboard v2.0 - Automated Weekly Report</p>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Send email report (placeholder - integrate with Resend or SendGrid)
   */
  async sendReport(reportData: ReportData): Promise<boolean> {
    if (this.config.to.length === 0) {
      console.warn('No email recipients configured. Skipping email send.')
      return false
    }

    const html = this.generateEmailHTML(reportData)
    const subject = `CTO Dashboard Weekly Report - ${reportData.period.end.toLocaleDateString()}`

    console.log('Email Report Generated:')
    console.log(`To: ${this.config.to.join(', ')}`)
    console.log(`Subject: ${subject}`)
    console.log(`Length: ${html.length} characters`)

    // TODO: Implement actual email sending
    // Integration options:
    // 1. Resend: https://resend.com/docs/send-with-nodejs
    // 2. SendGrid: https://docs.sendgrid.com/for-developers/sending-email/v3-nodejs-code-example
    // 3. AWS SES: https://aws.amazon.com/ses/

    /*
    Example Resend integration:

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: this.config.from,
      to: this.config.to,
      subject: subject,
      html: html,
    });
    */

    return true
  }

  /**
   * Generate and send weekly report
   */
  async sendWeeklyReport(): Promise<boolean> {
    const reportData = await this.generateWeeklyReport()
    return this.sendReport(reportData)
  }
}

// Singleton instance
export const emailReports = new EmailReports()
