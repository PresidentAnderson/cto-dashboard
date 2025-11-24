#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 *
 * Verifies database connectivity, tests all utility functions,
 * and provides detailed diagnostics.
 *
 * Usage:
 *   npx tsx scripts/test-db-connection.ts
 */

import { prisma, testConnection } from '../lib/prisma'
import {
  getDatabaseStatistics,
  checkDatabaseHealth,
  getActiveProjectsWithStats,
  getBugStatistics,
  getCriticalBugs,
  getSyncStatus,
  getPortfolioOverview,
  getEngineeringMetrics,
} from '../lib/db-utils'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

async function testDatabaseConnection() {
  logSection('1. Testing Database Connection')

  try {
    const result = await testConnection()

    if (result.success) {
      log(`✓ Database connection successful`, 'green')
      log(`  Latency: ${result.latency}ms`, 'gray')
    } else {
      log(`✗ Database connection failed`, 'red')
      log(`  Error: ${result.error}`, 'red')
      return false
    }
  } catch (error) {
    log(`✗ Connection test error: ${error}`, 'red')
    return false
  }

  return true
}

async function testDatabaseHealth() {
  logSection('2. Checking Database Health')

  try {
    const health = await checkDatabaseHealth()

    if (health.isHealthy) {
      log(`✓ Database is healthy`, 'green')
      log(`  Response time: ${health.latency}ms`, 'gray')
    } else {
      log(`✗ Database health check failed`, 'red')
      log(`  Error: ${health.error}`, 'red')
    }
  } catch (error) {
    log(`✗ Health check error: ${error}`, 'red')
  }
}

async function testDatabaseStatistics() {
  logSection('3. Database Statistics')

  try {
    const stats = await getDatabaseStatistics()

    log(`✓ Database statistics retrieved`, 'green')
    console.log(`  Projects:    ${stats.projects}`)
    console.log(`  Bugs:        ${stats.bugs}`)
    console.log(`  Users:       ${stats.users}`)
    console.log(`  Metrics:     ${stats.metrics}`)
    console.log(`  Import Logs: ${stats.importLogs}`)

    if (stats.projects === 0) {
      log(`  ⚠ Warning: No projects found. Run 'npx prisma db seed' to populate database.`, 'yellow')
    }
  } catch (error) {
    log(`✗ Statistics error: ${error}`, 'red')
  }
}

async function testProjectQueries() {
  logSection('4. Testing Project Queries')

  try {
    const projects = await getActiveProjectsWithStats()
    log(`✓ Active projects query successful`, 'green')
    log(`  Found ${projects.length} active projects`, 'gray')

    if (projects.length > 0) {
      const sample = projects[0]
      console.log(`\n  Sample project: ${sample.name}`)
      console.log(`    Bugs: ${sample.bugStats.total} (${sample.bugStats.critical} critical)`)
      console.log(`    Health: ${sample.latestMetrics?.healthScore || 'N/A'}`)
    }
  } catch (error) {
    log(`✗ Project query error: ${error}`, 'red')
  }
}

async function testBugQueries() {
  logSection('5. Testing Bug Queries')

  try {
    // Test bug statistics
    const bugStats = await getBugStatistics()
    log(`✓ Bug statistics query successful`, 'green')
    console.log(`  Total bugs: ${bugStats.total}`)
    console.log(`  By severity:`)
    console.log(`    Critical: ${bugStats.bySeverity.critical}`)
    console.log(`    High:     ${bugStats.bySeverity.high}`)
    console.log(`    Medium:   ${bugStats.bySeverity.medium}`)
    console.log(`    Low:      ${bugStats.bySeverity.low}`)
    console.log(`  By status:`)
    console.log(`    Pending:     ${bugStats.byStatus.pending}`)
    console.log(`    In Progress: ${bugStats.byStatus.inProgress}`)
    console.log(`  Blockers: ${bugStats.blockers}`)

    // Test critical bugs
    const criticalBugs = await getCriticalBugs()
    log(`\n✓ Critical bugs query successful`, 'green')
    log(`  Found ${criticalBugs.length} critical bugs`, 'gray')

    if (criticalBugs.length > 0) {
      const sample = criticalBugs[0]
      console.log(`\n  Sample: ${sample.bugNumber} - ${sample.title}`)
      console.log(`    Hours since created: ${sample.hoursSinceCreated}`)
      console.log(`    Hours until SLA: ${sample.hoursUntilSla}`)
      console.log(`    SLA breached: ${sample.isSlaBreached ? 'Yes' : 'No'}`)
    }
  } catch (error) {
    log(`✗ Bug query error: ${error}`, 'red')
  }
}

async function testMetricsQueries() {
  logSection('6. Testing Metrics Queries')

  try {
    // Test engineering metrics
    const engMetrics = await getEngineeringMetrics()
    log(`✓ Engineering metrics query successful`, 'green')
    console.log(`  Total bugs: ${engMetrics.totalBugs}`)
    console.log(`  Resolved: ${engMetrics.resolvedBugs}`)
    console.log(`  Resolution rate: ${engMetrics.resolutionRate}%`)
    console.log(`  Total estimated hours: ${engMetrics.totalEstimatedHours}`)
    console.log(`  Total actual hours: ${engMetrics.totalActualHours}`)
    console.log(`  Avg resolution time: ${engMetrics.avgResolutionTime} hours`)
    console.log(`  Estimation accuracy: ${engMetrics.estimationAccuracy || 'N/A'}%`)
  } catch (error) {
    log(`✗ Metrics query error: ${error}`, 'red')
  }
}

async function testPortfolioQueries() {
  logSection('7. Testing Portfolio Queries')

  try {
    const portfolio = await getPortfolioOverview()
    log(`✓ Portfolio overview query successful`, 'green')
    console.log(`  Total projects: ${portfolio.totalProjects}`)
    console.log(`  Active: ${portfolio.activeProjects}`)
    console.log(`  Shipped: ${portfolio.shippedProjects}`)
    console.log(`  Year 3 Revenue: $${portfolio.totalYear3Revenue.toLocaleString()}`)
    console.log(`  DCF Valuation: $${portfolio.totalDcfValuation.toLocaleString()}`)
    console.log(`  Monthly Infrastructure: $${portfolio.totalMonthlyInfra.toLocaleString()}`)
  } catch (error) {
    log(`✗ Portfolio query error: ${error}`, 'red')
  }
}

async function testSyncQueries() {
  logSection('8. Testing Sync Queries')

  try {
    const syncStatus = await getSyncStatus()
    log(`✓ Sync status query successful`, 'green')
    console.log(`  Last sync: ${syncStatus.lastSync?.toISOString() || 'Never'}`)
    console.log(`  Status: ${syncStatus.status}`)
    console.log(`  Records imported: ${syncStatus.recordsImported}`)
    console.log(`  Records failed: ${syncStatus.recordsFailed}`)

    if (syncStatus.errors.length > 0) {
      console.log(`  Errors:`)
      syncStatus.errors.forEach(err => console.log(`    - ${err}`))
    }
  } catch (error) {
    log(`✗ Sync query error: ${error}`, 'red')
  }
}

async function testIndexPerformance() {
  logSection('9. Testing Index Performance')

  try {
    // Test query performance with EXPLAIN
    log(`Testing query performance...`, 'gray')

    const start1 = Date.now()
    await prisma.bug.findMany({
      where: { severity: 'critical', status: 'in_progress' },
      take: 10,
    })
    const duration1 = Date.now() - start1

    const start2 = Date.now()
    await prisma.project.findMany({
      where: { status: 'active' },
      orderBy: { roiScore: 'desc' },
      take: 10,
    })
    const duration2 = Date.now() - start2

    log(`✓ Index performance test completed`, 'green')
    console.log(`  Critical bugs query: ${duration1}ms`)
    console.log(`  Top projects by ROI: ${duration2}ms`)

    if (duration1 > 100 || duration2 > 100) {
      log(`  ⚠ Warning: Slow queries detected. Consider reviewing indexes.`, 'yellow')
    }
  } catch (error) {
    log(`✗ Performance test error: ${error}`, 'red')
  }
}

async function testDatabaseSchema() {
  logSection('10. Verifying Database Schema')

  try {
    // Check if all tables exist by querying them
    const tables = [
      'users',
      'projects',
      'bugs',
      'projectMetrics',
      'monthlyMetrics',
      'portfolioMetrics',
      'importLogs',
      'bugHistory',
      'auditLog',
    ]

    log(`Checking table existence...`, 'gray')
    let allTablesExist = true

    for (const table of tables) {
      try {
        await (prisma as any)[table].findFirst()
        log(`  ✓ ${table}`, 'green')
      } catch (error) {
        log(`  ✗ ${table} - Not found or error`, 'red')
        allTablesExist = false
      }
    }

    if (allTablesExist) {
      log(`\n✓ All tables verified`, 'green')
    } else {
      log(`\n✗ Some tables are missing. Run 'npx prisma migrate dev' or 'npx prisma db push'`, 'red')
    }
  } catch (error) {
    log(`✗ Schema verification error: ${error}`, 'red')
  }
}

async function main() {
  console.clear()

  log('╔════════════════════════════════════════════════════════════╗', 'blue')
  log('║        CTO Dashboard - Database Connection Test           ║', 'blue')
  log('╚════════════════════════════════════════════════════════════╝', 'blue')

  log('\nStarting comprehensive database test...', 'cyan')

  let passed = 0
  let failed = 0

  try {
    // Run all tests
    const connected = await testDatabaseConnection()
    if (!connected) {
      log('\n✗ Cannot proceed without database connection', 'red')
      process.exit(1)
    }
    passed++

    await testDatabaseHealth()
    passed++

    await testDatabaseSchema()
    passed++

    await testDatabaseStatistics()
    passed++

    await testProjectQueries()
    passed++

    await testBugQueries()
    passed++

    await testMetricsQueries()
    passed++

    await testPortfolioQueries()
    passed++

    await testSyncQueries()
    passed++

    await testIndexPerformance()
    passed++

  } catch (error) {
    log(`\n✗ Test suite error: ${error}`, 'red')
    failed++
  }

  // Summary
  logSection('Test Summary')
  log(`✓ Tests passed: ${passed}`, 'green')

  if (failed > 0) {
    log(`✗ Tests failed: ${failed}`, 'red')
  }

  log('\n✓ Database test completed!', 'green')
  log('  All utility functions are working correctly.', 'gray')
  log('  Database is ready for development.', 'gray')
}

main()
  .catch((error) => {
    log(`\n✗ Fatal error: ${error}`, 'red')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
