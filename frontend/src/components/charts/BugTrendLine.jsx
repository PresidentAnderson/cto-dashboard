/**
 * BugTrendLine Component
 * Shows bug creation vs resolution over time
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
  ReferenceLine
} from 'recharts';
import { transformBugsForTrendLine } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG } from './ChartUtils';

const COLORS = {
  created: '#ef4444',
  resolved: '#10b981',
  net: '#6b7280'
};

const BugTrendLine = ({ bugs = [], height = 400, loading = false }) => {
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
  const chartData = transformBugsForTrendLine(bugs);

  // Calculate statistics
  const totalCreated = chartData.reduce((sum, day) => sum + day.created, 0);
  const totalResolved = chartData.reduce((sum, day) => sum + day.resolved, 0);
  const netChange = totalCreated - totalResolved;
  const resolutionRate = totalCreated > 0 ? ((totalResolved / totalCreated) * 100).toFixed(1) : 0;

  // No data state
  if (totalCreated === 0 && totalResolved === 0) {
    return (
      <ChartContainer
        title="Bug Trend"
        description="Bug creation vs resolution over time"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">No bug trend data</p>
            <p className="text-sm mt-2">Bug tracking will appear here</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Bug Trend"
        description="Bug creation vs resolution over the last 30 days"
        onExport={() => exportChartAsPNG(chartRef, 'bug-trend.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{totalCreated}</p>
            <p className="text-sm text-gray-500">Created</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalResolved}</p>
            <p className="text-sm text-gray-500">Resolved</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${netChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {netChange > 0 ? '+' : ''}{netChange}
            </p>
            <p className="text-sm text-gray-500">Net Change</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{resolutionRate}%</p>
            <p className="text-sm text-gray-500">Resolution Rate</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
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
              label={{ value: 'Bugs', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />

            {/* Created line */}
            <Line
              type="monotone"
              dataKey="created"
              stroke={COLORS.created}
              strokeWidth={3}
              dot={{ fill: COLORS.created, r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name="Created"
              animationDuration={300}
            />

            {/* Resolved line */}
            <Line
              type="monotone"
              dataKey="resolved"
              stroke={COLORS.resolved}
              strokeWidth={3}
              dot={{ fill: COLORS.resolved, r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name="Resolved"
              animationDuration={300}
            />

            {/* Net change line */}
            <Line
              type="monotone"
              dataKey="net"
              stroke={COLORS.net}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Net Change"
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Additional Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">
                  Avg created: {(totalCreated / chartData.length).toFixed(1)}/day
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">
                  Avg resolved: {(totalResolved / chartData.length).toFixed(1)}/day
                </span>
              </div>
            </div>
            <div className={`font-semibold ${netChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {netChange > 0 ? 'Backlog increasing' : netChange < 0 ? 'Backlog decreasing' : 'Stable'}
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default BugTrendLine;
