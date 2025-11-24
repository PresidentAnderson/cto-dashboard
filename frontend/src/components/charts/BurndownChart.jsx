/**
 * BurndownChart Component
 * Shows sprint/milestone progress with ideal vs actual burndown
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
import { transformBurndownData } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG } from './ChartUtils';

const COLORS = {
  ideal: '#94a3b8',
  actual: '#3b82f6',
  completed: '#10b981'
};

const BurndownChart = ({
  tasks = [],
  sprintStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  sprintEnd = new Date().toISOString(),
  height = 400,
  loading = false
}) => {
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
  const chartData = transformBurndownData(tasks, sprintStart, sprintEnd);

  // Calculate statistics
  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 1), 0);
  const completedPoints = tasks
    .filter(task => task.completed_at)
    .reduce((sum, task) => sum + (task.points || 1), 0);
  const remainingPoints = totalPoints - completedPoints;
  const completionRate = totalPoints > 0 ? ((completedPoints / totalPoints) * 100).toFixed(1) : 0;

  // Calculate velocity
  const daysElapsed = chartData.length;
  const velocity = daysElapsed > 0 ? (completedPoints / daysElapsed).toFixed(1) : 0;

  // Determine if on track
  const latestData = chartData[chartData.length - 1] || {};
  const isOnTrack = latestData.actual <= latestData.ideal;

  // No data state
  if (tasks.length === 0) {
    return (
      <ChartContainer
        title="Sprint Burndown"
        description="Progress tracking for current sprint"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className="text-lg font-medium">No sprint data available</p>
            <p className="text-sm mt-2">Start tracking tasks to see burndown</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Sprint Burndown"
        description={`Progress from ${new Date(sprintStart).toLocaleDateString()} to ${new Date(sprintEnd).toLocaleDateString()}`}
        onExport={() => exportChartAsPNG(chartRef, 'burndown-chart.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
            <p className="text-sm text-gray-500">Total Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedPoints}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{remainingPoints}</p>
            <p className="text-sm text-gray-500">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{velocity}</p>
            <p className="text-sm text-gray-500">Velocity/Day</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{completionRate}%</p>
            <p className="text-sm text-gray-500">Complete</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isOnTrack ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnTrack ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                On Track
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Behind Schedule
              </>
            )}
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.completed} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.completed} stopOpacity={0.05} />
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
              label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />

            {/* Completed area */}
            <Area
              type="monotone"
              dataKey="completed"
              fill="url(#colorCompleted)"
              stroke="none"
            />

            {/* Ideal burndown line */}
            <Line
              type="linear"
              dataKey="ideal"
              stroke={COLORS.ideal}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Ideal"
              animationDuration={300}
            />

            {/* Actual burndown line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke={COLORS.actual}
              strokeWidth={3}
              dot={{ fill: COLORS.actual, r: 4, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name="Actual"
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Additional Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Days in sprint:</span>
              <span className="font-semibold text-gray-900">{chartData.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Average velocity:</span>
              <span className="font-semibold text-blue-600">{velocity} pts/day</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Completion rate:</span>
              <span className={`font-semibold ${parseFloat(completionRate) >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {completionRate}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ${isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                {isOnTrack ? 'On track' : 'Behind'}
              </span>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default BurndownChart;
