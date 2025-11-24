/**
 * HealthRadarChart Component
 * Multi-dimensional health visualization for projects
 */

import React, { useRef } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { transformHealthForRadarChart } from '../../lib/chart-data-transformers';
import { ChartContainer, exportChartAsPNG } from './ChartUtils';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
      <p className="font-semibold mb-2">{data.payload.metric}</p>
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-300">Score:</span>
        <span className="font-semibold">{data.value}/100</span>
      </div>
    </div>
  );
};

const HealthRadarChart = ({ project = {}, height = 400, loading = false, compareProjects = [] }) => {
  const chartRef = useRef(null);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Transform data
  const chartData = transformHealthForRadarChart(project);

  // Calculate overall health score
  const overallHealth = chartData.length > 0
    ? (chartData.reduce((sum, m) => sum + m.value, 0) / chartData.length).toFixed(1)
    : 0;

  // Get health status
  const getHealthStatus = (score) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const healthStatus = getHealthStatus(overallHealth);

  // No data state
  if (!project || !project.name) {
    return (
      <ChartContainer
        title="Project Health Radar"
        description="Multi-dimensional health metrics"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">No project selected</p>
            <p className="text-sm mt-2">Select a project to view health metrics</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title={`Health Radar: ${project.name}`}
        description="Six key dimensions of project health"
        onExport={() => exportChartAsPNG(chartRef, `health-radar-${project.name}.png`)}
      >
        {/* Overall Health Score */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{overallHealth}</p>
                <p className="text-sm text-gray-500">Overall Health</p>
              </div>
              <div className={`px-4 py-2 rounded-full ${healthStatus.bg}`}>
                <p className={`text-sm font-semibold ${healthStatus.color}`}>
                  {healthStatus.label}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={overallHealth >= 80 ? '#10b981' : overallHealth >= 60 ? '#3b82f6' : overallHealth >= 40 ? '#eab308' : '#ef4444'}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(overallHealth / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{overallHealth}%</span>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
            />
            <Radar
              name={project.name}
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              strokeWidth={2}
              animationDuration={300}
            />
            {compareProjects.map((compareProject, index) => {
              const compareData = transformHealthForRadarChart(compareProject);
              const colors = ['#8b5cf6', '#10b981', '#f59e0b'];
              return (
                <Radar
                  key={compareProject.name}
                  name={compareProject.name}
                  dataKey="value"
                  data={compareData}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  animationDuration={300}
                />
              );
            })}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Metric Breakdown */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Detailed Scores</h4>
          <div className="grid grid-cols-2 gap-4">
            {chartData.map((metric, index) => {
              const percentage = (metric.value / metric.fullMark) * 100;
              const color = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-blue-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500';

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{metric.metric}</span>
                    <span className="text-sm font-semibold text-gray-900">{metric.value}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {chartData
              .filter(m => m.value < 60)
              .sort((a, b) => a.value - b.value)
              .slice(0, 3)
              .map((metric, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600">
                    <strong>{metric.metric}</strong> needs improvement (currently {metric.value}/100)
                  </span>
                </div>
              ))}
            {chartData.filter(m => m.value < 60).length === 0 && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>All metrics are healthy!</span>
              </div>
            )}
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default HealthRadarChart;
