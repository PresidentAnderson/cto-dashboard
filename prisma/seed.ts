/**
 * Prisma Database Seeding Script
 * Populates CTO Dashboard with sample data for testing and development
 */

import { PrismaClient, BugSeverity, BugStatus, ProjectStatus, UserRole, ImportSource } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data (in reverse order of dependencies)
  console.log('🗑️  Clearing existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.bugHistory.deleteMany()
  await prisma.projectMetric.deleteMany()
  await prisma.monthlyMetric.deleteMany()
  await prisma.portfolioMetric.deleteMany()
  await prisma.importLog.deleteMany()
  await prisma.bug.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('👥 Creating users...')

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'cto@company.com',
        name: 'President Anderson',
        role: UserRole.cto,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cto',
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah@company.com',
        name: 'Sarah Chen',
        role: UserRole.senior_engineer,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike@company.com',
        name: 'Mike Rodriguez',
        role: UserRole.engineer,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
      },
    }),
    prisma.user.create({
      data: {
        email: 'alice@company.com',
        name: 'Alice Johnson',
        role: UserRole.senior_engineer,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      },
    }),
    prisma.user.create({
      data: {
        email: 'david@company.com',
        name: 'David Kim',
        role: UserRole.engineer,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
      },
    }),
    prisma.user.create({
      data: {
        email: 'emily@company.com',
        name: 'Emily Watson',
        role: UserRole.qa_engineer,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
      },
    }),
  ])

  console.log(`✅ Created ${users.length} users`)

  // ============================================================================
  // PROJECTS
  // ============================================================================
  console.log('🚀 Creating projects...')

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'AI-Powered Analytics Platform',
        description: 'Real-time analytics dashboard with ML-driven insights',
        githubUrl: 'https://github.com/company/analytics-platform',
        demoUrl: 'https://demo.analytics-platform.com',
        language: 'TypeScript',
        tags: ['AI', 'Analytics', 'Dashboard', 'ML'],
        stars: 247,
        forks: 32,
        lastCommit: new Date('2024-11-20'),
        status: ProjectStatus.active,
        complexity: 4,
        clientAppeal: 9,
        currentMilestone: 3,
        totalMilestones: 5,
        arr: 480000,
        year1Revenue: 240000,
        year3Revenue: 1200000,
        roiScore: 8.5,
        tam: 10000000000,
        sam: 500000000,
        somYear3: 5000000,
        tractionMrr: 40000,
        marginPercent: 75,
        dcfValuation: 4500000,
        monthlyInfraCost: 2500,
      },
    }),
    prisma.project.create({
      data: {
        name: 'E-Commerce Mobile App',
        description: 'Cross-platform mobile shopping experience',
        githubUrl: 'https://github.com/company/ecommerce-app',
        demoUrl: 'https://demo.shop-app.com',
        language: 'React Native',
        tags: ['Mobile', 'E-Commerce', 'iOS', 'Android'],
        stars: 189,
        forks: 23,
        lastCommit: new Date('2024-11-22'),
        status: ProjectStatus.active,
        complexity: 3,
        clientAppeal: 8,
        currentMilestone: 4,
        totalMilestones: 6,
        arr: 360000,
        year1Revenue: 180000,
        year3Revenue: 900000,
        roiScore: 7.2,
        tam: 5000000000,
        sam: 250000000,
        somYear3: 3000000,
        tractionMrr: 30000,
        marginPercent: 68,
        dcfValuation: 3200000,
        monthlyInfraCost: 1800,
      },
    }),
    prisma.project.create({
      data: {
        name: 'DevOps Automation Suite',
        description: 'Infrastructure as Code with automated deployment pipelines',
        githubUrl: 'https://github.com/company/devops-suite',
        language: 'Python',
        tags: ['DevOps', 'Automation', 'CI/CD', 'Infrastructure'],
        stars: 412,
        forks: 67,
        lastCommit: new Date('2024-11-23'),
        status: ProjectStatus.shipped,
        complexity: 5,
        clientAppeal: 6,
        currentMilestone: 8,
        totalMilestones: 8,
        arr: 240000,
        year1Revenue: 120000,
        year3Revenue: 600000,
        roiScore: 6.8,
        tam: 2000000000,
        sam: 100000000,
        somYear3: 1500000,
        tractionMrr: 20000,
        marginPercent: 82,
        dcfValuation: 2100000,
        monthlyInfraCost: 800,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Customer Support Chatbot',
        description: 'AI chatbot for automated customer service',
        githubUrl: 'https://github.com/company/support-chatbot',
        demoUrl: 'https://demo.chatbot.com',
        language: 'Python',
        tags: ['AI', 'Chatbot', 'NLP', 'Customer Support'],
        stars: 156,
        forks: 19,
        lastCommit: new Date('2024-11-15'),
        status: ProjectStatus.active,
        complexity: 3,
        clientAppeal: 7,
        currentMilestone: 2,
        totalMilestones: 4,
        arr: 180000,
        year1Revenue: 90000,
        year3Revenue: 450000,
        roiScore: 5.5,
        tam: 3000000000,
        sam: 150000000,
        somYear3: 1800000,
        tractionMrr: 15000,
        marginPercent: 72,
        dcfValuation: 1600000,
        monthlyInfraCost: 1200,
      },
    }),
    prisma.project.create({
      data: {
        name: 'Blockchain Payment Gateway',
        description: 'Secure cryptocurrency payment processing',
        githubUrl: 'https://github.com/company/crypto-gateway',
        language: 'Go',
        tags: ['Blockchain', 'Payments', 'Crypto', 'Security'],
        stars: 89,
        forks: 12,
        lastCommit: new Date('2024-10-30'),
        status: ProjectStatus.deferred,
        complexity: 5,
        clientAppeal: 4,
        currentMilestone: 1,
        totalMilestones: 6,
        year1Revenue: 50000,
        year3Revenue: 250000,
        roiScore: 3.2,
        tam: 8000000000,
        sam: 400000000,
        somYear3: 800000,
        marginPercent: 65,
        dcfValuation: 900000,
        monthlyInfraCost: 1500,
      },
    }),
  ])

  console.log(`✅ Created ${projects.length} projects`)

  // ============================================================================
  // BUGS
  // ============================================================================
  console.log('🐛 Creating bugs...')

  const bugs = await Promise.all([
    // Critical bugs
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-1001',
        title: 'Database connection pool exhaustion causing service downtime',
        description: 'Production database hitting max connections (100/100). Causing 503 errors for 20% of requests during peak hours.',
        severity: BugSeverity.critical,
        status: BugStatus.in_progress,
        assignedToId: users[1].id, // Sarah
        projectId: projects[0].id,
        slaHours: 4,
        businessImpact: 'Service downtime affecting 10,000 active users. $5k/hour revenue loss.',
        revenueImpact: 120000,
        isBlocker: true,
        priorityScore: 95,
        estimatedHours: 8,
        actualHours: 6,
        createdAt: new Date('2024-11-23T08:00:00Z'),
      },
    }),
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-1002',
        title: 'Payment processing failures on checkout',
        description: 'Stripe webhook timeout causing failed payments. 15% failure rate on checkout.',
        severity: BugSeverity.critical,
        status: BugStatus.verified,
        assignedToId: users[2].id, // Mike
        projectId: projects[1].id,
        slaHours: 4,
        businessImpact: 'Lost sales. Estimated $3k/day in abandoned carts.',
        revenueImpact: 3000,
        isBlocker: true,
        priorityScore: 92,
        estimatedHours: 6,
        actualHours: 5,
        createdAt: new Date('2024-11-22T14:30:00Z'),
      },
    }),
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-1003',
        title: 'Security vulnerability in authentication middleware',
        description: 'JWT token validation bypass allowing unauthorized access to admin endpoints.',
        severity: BugSeverity.critical,
        status: BugStatus.shipped,
        assignedToId: users[3].id, // Alice
        projectId: projects[0].id,
        slaHours: 4,
        businessImpact: 'Critical security risk. Potential data breach.',
        revenueImpact: 0,
        isBlocker: true,
        priorityScore: 98,
        estimatedHours: 12,
        actualHours: 10,
        createdAt: new Date('2024-11-20T10:00:00Z'),
        resolvedAt: new Date('2024-11-21T18:00:00Z'),
      },
    }),

    // High priority bugs
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-2001',
        title: 'Dashboard loading time exceeds 10 seconds',
        description: 'Analytics dashboard taking 12-15 seconds to load due to inefficient queries.',
        severity: BugSeverity.high,
        status: BugStatus.pending,
        assignedToId: users[1].id,
        projectId: projects[0].id,
        slaHours: 24,
        businessImpact: 'Poor user experience. 30% bounce rate on dashboard.',
        revenueImpact: 500,
        isBlocker: false,
        priorityScore: 75,
        estimatedHours: 8,
        createdAt: new Date('2024-11-21T09:00:00Z'),
      },
    }),
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-2002',
        title: 'Mobile app crashes on iOS 17',
        description: 'App crashes immediately on launch for iOS 17 users. Affecting 25% of user base.',
        severity: BugSeverity.high,
        status: BugStatus.in_progress,
        assignedToId: users[4].id, // David
        projectId: projects[1].id,
        slaHours: 24,
        businessImpact: 'Cannot access app. User complaints increasing.',
        revenueImpact: 1200,
        isBlocker: false,
        priorityScore: 82,
        estimatedHours: 16,
        actualHours: 8,
        createdAt: new Date('2024-11-20T16:00:00Z'),
      },
    }),
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-2003',
        title: 'Email notifications not being sent',
        description: 'SendGrid API integration broken. Users not receiving order confirmations.',
        severity: BugSeverity.high,
        status: BugStatus.closed,
        assignedToId: users[2].id,
        projectId: projects[1].id,
        slaHours: 24,
        businessImpact: 'Customer confusion. Support tickets increasing.',
        revenueImpact: 200,
        isBlocker: false,
        priorityScore: 70,
        estimatedHours: 4,
        actualHours: 3,
        createdAt: new Date('2024-11-18T11:00:00Z'),
        resolvedAt: new Date('2024-11-19T14:00:00Z'),
      },
    }),

    // Medium priority bugs
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-3001',
        title: 'Search functionality returning incorrect results',
        description: 'Product search showing unrelated items. Elasticsearch index out of sync.',
        severity: BugSeverity.medium,
        status: BugStatus.pending,
        assignedToId: users[4].id,
        projectId: projects[1].id,
        slaHours: 72,
        businessImpact: 'Users having difficulty finding products.',
        revenueImpact: 150,
        isBlocker: false,
        priorityScore: 55,
        estimatedHours: 6,
        createdAt: new Date('2024-11-22T10:00:00Z'),
      },
    }),
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-3002',
        title: 'UI layout breaks on tablet devices',
        description: 'CSS grid layout not responsive between 768px-1024px width.',
        severity: BugSeverity.medium,
        status: BugStatus.in_progress,
        assignedToId: users[5].id, // Emily
        projectId: projects[0].id,
        slaHours: 72,
        businessImpact: 'Poor UX for tablet users (8% of traffic).',
        revenueImpact: 0,
        isBlocker: false,
        priorityScore: 45,
        estimatedHours: 4,
        actualHours: 2,
        createdAt: new Date('2024-11-19T13:00:00Z'),
      },
    }),

    // Low priority bugs
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-4001',
        title: 'Incorrect date format in export CSV',
        description: 'CSV export showing dates in MM/DD/YYYY instead of DD/MM/YYYY for EU users.',
        severity: BugSeverity.low,
        status: BugStatus.pending,
        projectId: projects[0].id,
        slaHours: 720,
        businessImpact: 'Minor inconvenience for EU users.',
        revenueImpact: 0,
        isBlocker: false,
        priorityScore: 20,
        estimatedHours: 2,
        createdAt: new Date('2024-11-15T09:00:00Z'),
      },
    }),
    prisma.bug.create({
      data: {
        bugNumber: 'BUG-4002',
        title: 'Typo in footer copyright text',
        description: 'Footer shows "2023" instead of "2024".',
        severity: BugSeverity.low,
        status: BugStatus.deferred,
        projectId: projects[1].id,
        slaHours: 720,
        businessImpact: 'Cosmetic issue only.',
        revenueImpact: 0,
        isBlocker: false,
        priorityScore: 10,
        estimatedHours: 0.5,
        createdAt: new Date('2024-11-10T15:00:00Z'),
      },
    }),
  ])

  console.log(`✅ Created ${bugs.length} bugs`)

  // ============================================================================
  // PROJECT METRICS
  // ============================================================================
  console.log('📊 Creating project metrics...')

  const projectMetrics = []
  const dates = [
    new Date('2024-11-01'),
    new Date('2024-11-08'),
    new Date('2024-11-15'),
    new Date('2024-11-22'),
  ]

  for (const project of projects.slice(0, 3)) {
    for (let i = 0; i < dates.length; i++) {
      projectMetrics.push(
        await prisma.projectMetric.create({
          data: {
            projectId: project.id,
            commitsCount: 20 + i * 15 + Math.floor(Math.random() * 10),
            contributors: 3 + Math.floor(Math.random() * 3),
            linesOfCode: 15000 + i * 2000 + Math.floor(Math.random() * 1000),
            techStack: project.language === 'TypeScript'
              ? ['TypeScript', 'React', 'Node.js', 'PostgreSQL']
              : project.language === 'Python'
              ? ['Python', 'FastAPI', 'Redis', 'PostgreSQL']
              : ['React Native', 'TypeScript', 'Redux', 'Firebase'],
            healthScore: 75 + Math.floor(Math.random() * 20),
            date: dates[i],
          },
        })
      )
    }
  }

  console.log(`✅ Created ${projectMetrics.length} project metrics`)

  // ============================================================================
  // MONTHLY METRICS
  // ============================================================================
  console.log('📈 Creating monthly metrics...')

  const monthlyMetrics = await Promise.all([
    prisma.monthlyMetric.create({
      data: {
        month: new Date('2024-09-01'),
        totalBugs: 45,
        criticalBugs: 5,
        highBugs: 12,
        mediumBugs: 18,
        lowBugs: 10,
        engHours: 280,
        totalCost: 42000,
        revenueImpactDaily: 8500,
        avgResolutionDays: 4.2,
        bugsCreated: 52,
        bugsResolved: 47,
      },
    }),
    prisma.monthlyMetric.create({
      data: {
        month: new Date('2024-10-01'),
        totalBugs: 38,
        criticalBugs: 3,
        highBugs: 10,
        mediumBugs: 15,
        lowBugs: 10,
        engHours: 245,
        totalCost: 36750,
        revenueImpactDaily: 6200,
        avgResolutionDays: 3.8,
        bugsCreated: 43,
        bugsResolved: 48,
      },
    }),
    prisma.monthlyMetric.create({
      data: {
        month: new Date('2024-11-01'),
        totalBugs: 42,
        criticalBugs: 4,
        highBugs: 11,
        mediumBugs: 17,
        lowBugs: 10,
        engHours: 268,
        totalCost: 40200,
        revenueImpactDaily: 7300,
        avgResolutionDays: 4.0,
        bugsCreated: 48,
        bugsResolved: 44,
      },
    }),
  ])

  console.log(`✅ Created ${monthlyMetrics.length} monthly metrics`)

  // ============================================================================
  // PORTFOLIO METRICS
  // ============================================================================
  console.log('💼 Creating portfolio metrics...')

  const portfolioMetric = await prisma.portfolioMetric.create({
    data: {
      totalProjects: projects.length,
      shippedProjects: projects.filter(p => p.status === ProjectStatus.shipped).length,
      year3RevenueTotal: projects.reduce((sum, p) => sum + (p.year3Revenue?.toNumber() || 0), 0),
      portfolioDcfTotal: projects.reduce((sum, p) => sum + (p.dcfValuation?.toNumber() || 0), 0),
      monthlyDepsCost: projects.reduce((sum, p) => sum + (p.monthlyInfraCost?.toNumber() || 0), 0),
      snapshotDate: new Date('2024-11-24'),
    },
  })

  console.log('✅ Created portfolio metrics')

  // ============================================================================
  // IMPORT LOGS
  // ============================================================================
  console.log('📥 Creating import logs...')

  const importLogs = await Promise.all([
    prisma.importLog.create({
      data: {
        source: ImportSource.github,
        recordsImported: 5,
        recordsFailed: 0,
        errors: [],
        metadata: {
          repositories: ['analytics-platform', 'ecommerce-app', 'devops-suite', 'support-chatbot', 'crypto-gateway'],
          totalStars: 1093,
          totalForks: 153,
        },
        timestamp: new Date('2024-11-24T08:00:00Z'),
      },
    }),
    prisma.importLog.create({
      data: {
        source: ImportSource.csv,
        recordsImported: 8,
        recordsFailed: 2,
        errors: ['Invalid severity value in row 3', 'Missing required field "title" in row 7'],
        metadata: {
          fileName: 'bugs_import_2024-11.csv',
          totalRows: 10,
        },
        timestamp: new Date('2024-11-23T15:30:00Z'),
      },
    }),
  ])

  console.log(`✅ Created ${importLogs.length} import logs`)

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n🎉 Database seeding completed successfully!\n')
  console.log('Summary:')
  console.log(`  👥 Users: ${users.length}`)
  console.log(`  🚀 Projects: ${projects.length}`)
  console.log(`  🐛 Bugs: ${bugs.length}`)
  console.log(`  📊 Project Metrics: ${projectMetrics.length}`)
  console.log(`  📈 Monthly Metrics: ${monthlyMetrics.length}`)
  console.log(`  💼 Portfolio Metrics: 1`)
  console.log(`  📥 Import Logs: ${importLogs.length}`)
  console.log('\n✅ Ready for development and testing!\n')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
