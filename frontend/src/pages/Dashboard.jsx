/**
 * Dashboard Page Component
 * Main analytics dashboard with auto-refresh functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DashboardOverview from '../components/DashboardOverview';
import AnalyticsCharts from '../components/AnalyticsCharts';
import ProjectHealthScore from '../components/ProjectHealthScore';

// API URL Configuration
const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' // Same domain (Vercel routes /api to serverless function)
    : 'http://localhost:5000'
);

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(AUTO_REFRESH_INTERVAL / 1000);

  // Date range filter state
  const [dateRange, setDateRange] = useState('30'); // days
  const [statusFilter, setStatusFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');

  /**
   * Fetch analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/analytics`, {
        timeout: 30000 // 30 seconds timeout
      });

      if (response.data.success) {
        setAnalytics(response.data.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(response.data.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /**
   * Auto-refresh functionality
   */
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const refreshTimer = setInterval(() => {
      fetchAnalytics();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(refreshTimer);
  }, [autoRefreshEnabled, fetchAnalytics]);

  /**
   * Countdown timer until next refresh
   */
  useEffect(() => {
    if (!autoRefreshEnabled || !lastRefresh) return;

    const countdownTimer = setInterval(() => {
      const elapsed = Date.now() - lastRefresh.getTime();
      const remaining = Math.max(0, (AUTO_REFRESH_INTERVAL - elapsed) / 1000);
      setTimeUntilRefresh(Math.floor(remaining));
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [autoRefreshEnabled, lastRefresh]);

  /**
   * Manual refresh handler
   */
  const handleManualRefresh = () => {
    fetchAnalytics();
  };

  /**
   * Toggle auto-refresh
   */
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  /**
   * Format countdown timer
   */
  const formatTimeUntilRefresh = () => {
    const minutes = Math.floor(timeUntilRefresh / 60);
    const seconds = timeUntilRefresh % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Apply filters to analytics data
   */
  const getFilteredAnalytics = () => {
    if (!analytics) return null;

    let filtered = { ...analytics };

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered.projectsByStatus = filtered.projectsByStatus.filter(
        p => p.status === statusFilter
      );
    }

    // Apply language filter
    if (languageFilter !== 'all') {
      filtered.projectsByLanguage = filtered.projectsByLanguage.filter(
        l => l.name === languageFilter
      );
    }

    return filtered;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {lastRefresh && (
                  <>
                    Last updated: {lastRefresh.toLocaleTimeString()}
                    {autoRefreshEnabled && (
                      <span className="ml-2">
                        (Next refresh in {formatTimeUntilRefresh()})
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3">
              {/* Auto-refresh toggle */}
              <button
                onClick={toggleAutoRefresh}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  autoRefreshEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>

              {/* Manual refresh button */}
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Analytics</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Filters */}
        {!loading && analytics && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="text-sm font-semibold text-gray-700">Filters:</div>

              {/* Date Range Filter */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="shipped">Shipped</option>
                <option value="deferred">Deferred</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Language Filter */}
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Languages</option>
                {analytics?.projectsByLanguage?.map((lang) => (
                  <option key={lang.name} value={lang.name}>
                    {lang.name}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              {(statusFilter !== 'all' || languageFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setLanguageFilter('all');
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="space-y-8">
          {/* KPI Overview */}
          <section>
            <DashboardOverview
              analytics={getFilteredAnalytics()}
              loading={loading}
              lastSyncTime={analytics?.lastSync}
            />
          </section>

          {/* Charts Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Analytics Charts</h2>
              <p className="text-gray-600 mt-1">
                Visualize trends and distributions across your portfolio
              </p>
            </div>
            <AnalyticsCharts
              analyticsData={getFilteredAnalytics()}
              loading={loading}
            />
          </section>

          {/* Health Score Example */}
          {!loading && analytics && (
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Portfolio Health</h2>
                <p className="text-gray-600 mt-1">
                  Overall health metrics across all projects
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ProjectHealthScore
                  recentCommits={analytics.recentCommits || 0}
                  issueCount={analytics.totalIssues || 0}
                  stars={analytics.totalStars || 0}
                  lastUpdateDays={7}
                  showDetails={true}
                />
              </div>
            </section>
          )}

          {/* Quick Actions */}
          {!loading && (
            <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/bugs"
                  className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <div className="text-2xl mb-2">🐛</div>
                  <div className="font-semibold text-gray-900">View Bugs</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Manage bug backlog
                  </div>
                </a>
                <a
                  href="/projects"
                  className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                >
                  <div className="text-2xl mb-2">📁</div>
                  <div className="font-semibold text-gray-900">View Projects</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Explore portfolio
                  </div>
                </a>
                <a
                  href="/settings"
                  className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="font-semibold text-gray-900">Settings</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Configure dashboard
                  </div>
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
