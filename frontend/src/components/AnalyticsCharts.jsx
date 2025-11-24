/**
 * AnalyticsCharts Component
 * Interactive charts using Recharts library
 * Includes: Pie Chart, Bar Chart, Line Chart, Area Chart
 */

import React, { useState, useRef } from 'react';
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';

// Color scheme for charts (consistent across all visualizations)
const COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'],
  severity: {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  },
  status: {
    pending: '#6b7280',
    in_progress: '#3b82f6',
    verified: '#22c55e',
    shipped: '#14b8a6',
    closed: '#4b5563',
    deferred: '#a855f7'
  }
};

/**
 * Export chart as PNG
 */
const exportChartAsPNG = (chartRef, filename = 'chart.png') => {
  if (!chartRef.current) return;

  try {
    // Get the SVG element
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  } catch (error) {
    console.error('Error exporting chart:', error);
  }
};

/**
 * Chart Container with Export Button
 */
const ChartContainer = ({ title, children, onExport, description }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
            title="Export as PNG"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export</span>
          </button>
        )}
      </div>

      {/* Chart Content */}
      {children}
    </div>
  );
};

/**
 * Custom Tooltip Component
 */
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
      {label && <p className="font-semibold mb-2">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center space-x-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Main AnalyticsCharts Component
 */
const AnalyticsCharts = ({ analyticsData, loading = false }) => {
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const areaChartRef = useRef(null);

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12 text-gray-500">
        No analytics data available
      </div>
    );
  }

  // Prepare data for charts
  const {
    projectsByLanguage = [],
    projectsByStatus = [],
    commitsTrend = [],
    starsDistribution = [],
    bugTrend = []
  } = analyticsData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart: Projects by Language */}
      <div ref={pieChartRef}>
        <ChartContainer
          title="Projects by Language"
          description="Distribution of projects across tech stack"
          onExport={() => exportChartAsPNG(pieChartRef, 'projects-by-language.png')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectsByLanguage}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {projectsByLanguage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Bar Chart: Projects by Status */}
      <div ref={barChartRef}>
        <ChartContainer
          title="Projects by Status"
          description="Current status of all projects"
          onExport={() => exportChartAsPNG(barChartRef, 'projects-by-status.png')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="status"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => value.replace('_', ' ')}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                name="Projects"
              >
                {projectsByStatus.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS.status[entry.status] || COLORS.primary[0]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Line Chart: Commits Trend */}
      <div ref={lineChartRef}>
        <ChartContainer
          title="Commits Over Time"
          description="30-day commit activity trend"
          onExport={() => exportChartAsPNG(lineChartRef, 'commits-trend.png')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={commitsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="commits"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Commits"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Bar Chart: Stars Distribution */}
      <div>
        <ChartContainer
          title="Stars Distribution"
          description="Top 10 projects by stars"
          onExport={() => exportChartAsPNG(barChartRef, 'stars-distribution.png')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={starsDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="stars"
                fill="#f59e0b"
                radius={[0, 8, 8, 0]}
                name="Stars"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Area Chart: Bug Backlog Trend */}
      <div ref={areaChartRef} className="lg:col-span-2">
        <ChartContainer
          title="Bug Backlog Trend"
          description="Bug count by severity over time"
          onExport={() => exportChartAsPNG(areaChartRef, 'bug-trend.png')}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={bugTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                stroke={COLORS.severity.critical}
                fill={COLORS.severity.critical}
                fillOpacity={0.8}
                name="Critical"
              />
              <Area
                type="monotone"
                dataKey="high"
                stackId="1"
                stroke={COLORS.severity.high}
                fill={COLORS.severity.high}
                fillOpacity={0.8}
                name="High"
              />
              <Area
                type="monotone"
                dataKey="medium"
                stackId="1"
                stroke={COLORS.severity.medium}
                fill={COLORS.severity.medium}
                fillOpacity={0.8}
                name="Medium"
              />
              <Area
                type="monotone"
                dataKey="low"
                stackId="1"
                stroke={COLORS.severity.low}
                fill={COLORS.severity.low}
                fillOpacity={0.8}
                name="Low"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
