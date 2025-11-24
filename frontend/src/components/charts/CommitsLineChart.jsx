/**
 * CommitsLineChart Component
 * Displays commit activity over time with trend analysis
 */

import React, { useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import { transformCommitsForLineChart } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG } from './ChartUtils';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#10b981'
};

const CommitsLineChart = ({ commits = [], height = 400, showTrendline = true, loading = false }) => {
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
  const chartData = transformCommitsForLineChart(commits);

  // Calculate statistics
  const totalCommits = chartData.reduce((sum, day) => sum + day.commits, 0);
  const avgCommits = (totalCommits / chartData.length).toFixed(1);
  const maxCommits = Math.max(...chartData.map(d => d.commits));

  // No data state
  if (totalCommits === 0) {
    return (
      <ChartContainer
        title="Commits Per Day"
        description="Daily commit activity over the last 30 days"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">No commit data available</p>
            <p className="text-sm mt-2">Start making commits to see activity trends</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Commits Per Day"
        description="Daily commit activity over the last 30 days"
        onExport={() => exportChartAsPNG(chartRef, 'commits-per-day.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalCommits}</p>
            <p className="text-sm text-gray-500">Total Commits</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{avgCommits}</p>
            <p className="text-sm text-gray-500">Avg Per Day</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{maxCommits}</p>
            <p className="text-sm text-gray-500">Peak Day</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Commits', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: COLORS.primary, strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />

            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="commits"
              fill="url(#colorCommits)"
              stroke="none"
            />

            {/* Main line */}
            <Line
              type="monotone"
              dataKey="commits"
              stroke={COLORS.primary}
              strokeWidth={3}
              dot={{ fill: COLORS.primary, r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name="Commits"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Additional Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">
                Most active: {chartData.reduce((max, day) => day.commits > max.commits ? day : max, chartData[0]).date}
              </span>
            </div>
            <div className="text-gray-500">
              Last 30 days
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default CommitsLineChart;
