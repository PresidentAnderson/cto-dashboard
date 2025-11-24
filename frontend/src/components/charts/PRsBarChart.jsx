/**
 * PRsBarChart Component
 * Displays Pull Request metrics per week
 */

import React, { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { transformPRsForBarChart } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG } from './ChartUtils';

const COLORS = {
  merged: '#10b981',
  opened: '#3b82f6',
  closed: '#ef4444'
};

const PRsBarChart = ({ pullRequests = [], height = 400, loading = false }) => {
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
  const chartData = transformPRsForBarChart(pullRequests);

  // Calculate statistics
  const totalMerged = chartData.reduce((sum, week) => sum + week.merged, 0);
  const totalOpened = chartData.reduce((sum, week) => sum + week.opened, 0);
  const totalClosed = chartData.reduce((sum, week) => sum + week.closed, 0);
  const mergeRate = totalOpened > 0 ? ((totalMerged / totalOpened) * 100).toFixed(1) : 0;

  // No data state
  if (totalOpened === 0) {
    return (
      <ChartContainer
        title="Pull Requests Per Week"
        description="PR activity over the last 12 weeks"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-lg font-medium">No pull request data available</p>
            <p className="text-sm mt-2">Create PRs to see activity trends</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Pull Requests Per Week"
        description="PR activity over the last 12 weeks"
        onExport={() => exportChartAsPNG(chartRef, 'prs-per-week.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalOpened}</p>
            <p className="text-sm text-gray-500">Opened</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalMerged}</p>
            <p className="text-sm text-gray-500">Merged</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{totalClosed}</p>
            <p className="text-sm text-gray-500">Closed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{mergeRate}%</p>
            <p className="text-sm text-gray-500">Merge Rate</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Pull Requests', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            <Bar
              dataKey="opened"
              fill={COLORS.opened}
              radius={[4, 4, 0, 0]}
              name="Opened"
              animationDuration={300}
            />
            <Bar
              dataKey="merged"
              fill={COLORS.merged}
              radius={[4, 4, 0, 0]}
              name="Merged"
              animationDuration={300}
            />
            <Bar
              dataKey="closed"
              fill={COLORS.closed}
              radius={[4, 4, 0, 0]}
              name="Closed"
              animationDuration={300}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Additional Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg PRs per week:</span>
              <span className="font-semibold text-gray-900">
                {(totalOpened / chartData.length).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Success rate:</span>
              <span className="font-semibold text-green-600">{mergeRate}%</span>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default PRsBarChart;
