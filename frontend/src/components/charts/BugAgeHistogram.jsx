/**
 * BugAgeHistogram Component
 * Shows distribution of bugs by age
 */

import React, { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { transformBugsForAgeHistogram } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG } from './ChartUtils';

// Color gradient from green (recent) to red (old)
const getBarColor = (index, total) => {
  const colors = ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626'];
  return colors[index] || colors[colors.length - 1];
};

const BugAgeHistogram = ({ bugs = [], height = 400, loading = false }) => {
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
  const chartData = transformBugsForAgeHistogram(bugs);
  const totalBugs = chartData.reduce((sum, bucket) => sum + bucket.count, 0);

  // Calculate statistics
  const oldBugs = chartData.slice(-2).reduce((sum, bucket) => sum + bucket.count, 0); // 61+ days
  const recentBugs = chartData.slice(0, 2).reduce((sum, bucket) => sum + bucket.count, 0); // 0-14 days
  const oldBugsPercent = totalBugs > 0 ? ((oldBugs / totalBugs) * 100).toFixed(1) : 0;

  // No data state
  if (totalBugs === 0) {
    return (
      <ChartContainer
        title="Bug Age Distribution"
        description="How long bugs have been open"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">No bug age data</p>
            <p className="text-sm mt-2">All caught up!</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Bug Age Distribution"
        description="How long bugs have been open"
        onExport={() => exportChartAsPNG(chartRef, 'bug-age-distribution.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalBugs}</p>
            <p className="text-sm text-gray-500">Total Bugs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{recentBugs}</p>
            <p className="text-sm text-gray-500">Recent (0-14d)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{oldBugs}</p>
            <p className="text-sm text-gray-500">Old (60+d)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{oldBugsPercent}%</p>
            <p className="text-sm text-gray-500">Stale Rate</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Number of Bugs', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Bar
              dataKey="count"
              radius={[8, 8, 0, 0]}
              name="Bugs"
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(index, chartData.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Additional Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stale bugs (60+d)</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{oldBugs}</p>
                </div>
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-2">Requires immediate attention</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fresh bugs (0-14d)</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{recentBugs}</p>
                </div>
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-2">Recently reported</p>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default BugAgeHistogram;
