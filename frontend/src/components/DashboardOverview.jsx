/**
 * DashboardOverview Component
 * Main dashboard with KPI cards and metrics grid
 */

import React from 'react';
import MetricsCard from './MetricsCard';
import { formatDistanceToNow } from 'date-fns';

const DashboardOverview = ({
  analytics,
  loading = false,
  lastSyncTime = null
}) => {
  // Extract data from analytics
  const {
    totalProjects = 0,
    activeProjects = 0,
    totalStars = 0,
    totalForks = 0,
    projectsByLanguage = [],
    bugBacklogCount = 0,
    healthScoreAverage = 0,
    criticalBugs = 0,
    highBugs = 0,
    recentCommits = 0,
    totalIssues = 0
  } = analytics || {};

  // Calculate trends (mock data - in production, compare with previous period)
  const projectTrend = 'up';
  const starsTrend = 'up';
  const bugsTrend = bugBacklogCount > 20 ? 'up' : 'down';
  const healthTrend = healthScoreAverage >= 70 ? 'up' : healthScoreAverage >= 50 ? 'neutral' : 'down';

  // Get top 5 languages
  const topLanguages = projectsByLanguage
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-3 flex items-center space-x-3">
              <span>CTO Dashboard</span>
              <span className="text-4xl">v2.0</span>
            </h1>
            <p className="text-xl opacity-90 font-medium">
              Real-time analytics for your entire portfolio
            </p>
          </div>
          <div className="text-8xl opacity-50">
            📊
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Projects */}
        <MetricsCard
          title="Total Projects"
          value={totalProjects}
          subtitle="Across all statuses"
          icon="📁"
          trend={projectTrend}
          trendValue="+5.2%"
          color="blue"
          loading={loading}
        />

        {/* Active Projects */}
        <MetricsCard
          title="Active Projects"
          value={activeProjects}
          subtitle="Currently in development"
          icon="🚀"
          trend={projectTrend}
          trendValue="+3"
          color="green"
          loading={loading}
        />

        {/* Total Stars */}
        <MetricsCard
          title="Total Stars"
          value={totalStars.toLocaleString()}
          subtitle="GitHub stars across portfolio"
          icon="⭐"
          trend={starsTrend}
          trendValue="+127"
          color="yellow"
          loading={loading}
        />

        {/* Total Forks */}
        <MetricsCard
          title="Total Forks"
          value={totalForks.toLocaleString()}
          subtitle="Community contributions"
          icon="🔱"
          trend="up"
          trendValue="+23"
          color="purple"
          loading={loading}
        />
      </div>

      {/* Secondary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Bug Backlog */}
        <MetricsCard
          title="Bug Backlog"
          value={bugBacklogCount}
          subtitle={`${criticalBugs} critical, ${highBugs} high`}
          icon="🐛"
          trend={bugsTrend}
          trendValue={bugBacklogCount > 20 ? '-8' : '+8'}
          color={bugBacklogCount > 30 ? 'red' : bugBacklogCount > 15 ? 'orange' : 'green'}
          loading={loading}
        />

        {/* Health Score */}
        <MetricsCard
          title="Avg Health Score"
          value={healthScoreAverage}
          subtitle="Portfolio health metric"
          icon="❤️"
          trend={healthTrend}
          trendValue={healthScoreAverage >= 70 ? '+5' : '-3'}
          color={healthScoreAverage >= 70 ? 'green' : healthScoreAverage >= 50 ? 'yellow' : 'red'}
          loading={loading}
        />

        {/* Recent Activity */}
        <MetricsCard
          title="Recent Commits"
          value={recentCommits}
          subtitle="Last 30 days"
          icon="💻"
          trend="up"
          trendValue="+12%"
          color="teal"
          loading={loading}
        />

        {/* Open Issues */}
        <MetricsCard
          title="Open Issues"
          value={totalIssues}
          subtitle="Across all projects"
          icon="📋"
          trend={totalIssues > 50 ? 'up' : 'down'}
          trendValue={totalIssues > 50 ? '+15' : '-10'}
          color={totalIssues > 50 ? 'orange' : 'blue'}
          loading={loading}
        />
      </div>

      {/* Language Distribution */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Top Languages
          </h2>
          <span className="text-2xl">💬</span>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : topLanguages.length > 0 ? (
          <div className="space-y-4">
            {topLanguages.map((lang, index) => {
              const percentage = (lang.value / totalProjects) * 100;
              const colors = ['blue', 'purple', 'pink', 'orange', 'teal'];
              const color = colors[index % colors.length];

              return (
                <div key={lang.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getLanguageEmoji(lang.name)}</span>
                      <span className="font-semibold text-gray-900">{lang.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{lang.value}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600 transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No language data available
          </div>
        )}
      </div>

      {/* Last Sync Info */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Last synced: {formatLastSync()}
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Get emoji for programming language
 */
const getLanguageEmoji = (language) => {
  const emojiMap = {
    'JavaScript': '🟨',
    'TypeScript': '🔷',
    'Python': '🐍',
    'Java': '☕',
    'Go': '🐹',
    'Ruby': '💎',
    'PHP': '🐘',
    'C++': '⚙️',
    'C#': '🎯',
    'Rust': '🦀',
    'Swift': '🍎',
    'Kotlin': '🎨',
    'Dart': '🎯',
    'Shell': '🐚',
    'HTML': '📄',
    'CSS': '🎨',
    'Vue': '💚',
    'React': '⚛️'
  };

  return emojiMap[language] || '📝';
};

export default DashboardOverview;
