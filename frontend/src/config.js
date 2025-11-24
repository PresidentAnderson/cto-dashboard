/**
 * Dashboard Configuration
 * Customize branding, colors, and features here
 */

export const config = {
  // Branding
  branding: {
    companyName: 'Your Company',
    dashboardTitle: 'CTO Dashboard',
    tagline: 'Real-time visibility into bugs, projects, and portfolio metrics',
    logo: '/logo.png', // Place your logo in public/logo.png
    favicon: '/favicon.ico',
  },

  // Theme Colors (Tailwind CSS classes)
  theme: {
    // Primary color (for buttons, links, highlights)
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main primary color
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Severity colors
    severity: {
      critical: '#dc2626', // Red
      high: '#f97316',     // Orange
      medium: '#eab308',   // Yellow
      low: '#22c55e',      // Green
    },

    // Status colors
    status: {
      pending: '#6b7280',      // Gray
      in_progress: '#3b82f6', // Blue
      verified: '#22c55e',    // Green
      shipped: '#14b8a6',     // Teal
      closed: '#4b5563',      // Dark gray
      deferred: '#a855f7',    // Purple
    },
  },

  // Feature Flags
  features: {
    showAnalytics: true,
    showPortfolio: true,
    showBugTracker: true,
    enableExport: true,
    enableImport: true,
    showRecommendations: true,
    enableDarkMode: false, // Coming soon
  },

  // SLA Thresholds (in hours)
  sla: {
    critical: 4,
    high: 24,
    medium: 72,
    low: 720, // 30 days
  },

  // Dashboard Refresh Interval (milliseconds)
  refreshInterval: 30000, // 30 seconds

  // Pagination
  pagination: {
    defaultPageSize: 50,
    pageSizeOptions: [10, 25, 50, 100],
  },

  // Cost Calculation
  engineeringHourlyRate: 150, // $150/hour

  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
  },

  // Table Columns Visibility (customize which columns to show)
  tables: {
    bugs: {
      showPriorityScore: true,
      showEstimatedHours: true,
      showActualHours: true,
      showRevenue Impact: true,
      showProject: true,
    },
    projects: {
      showComplexity: true,
      showAppeal: true,
      showROI: true,
      showMarketData: true,
    },
  },

  // Chart Colors
  charts: {
    lineColors: ['#3b82f6', '#dc2626', '#22c55e', '#f97316'],
    barColors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
  },

  // Links (add custom links to header or footer)
  links: {
    documentation: '/docs',
    support: 'mailto:support@yourcompany.com',
    github: 'https://github.com/yourusername/cto-dashboard',
  },
};

// Helper function to get color value
export function getColor(path) {
  const keys = path.split('.');
  let value = config;
  for (const key of keys) {
    value = value[key];
  }
  return value;
}

export default config;
