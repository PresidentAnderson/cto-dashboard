/**
 * CostAreaChart Component
 * Displays monetary costs over time with stacked areas
 */

import React, { useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { transformCostForAreaChart } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG, formatCurrency } from './ChartUtils';

const COLORS = {
  infrastructure: '#3b82f6',
  personnel: '#8b5cf6',
  tools: '#10b981'
};

const CostAreaChart = ({ costData = [], height = 400, loading = false }) => {
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
  const chartData = transformCostForAreaChart(costData);

  // Calculate statistics
  const totalCost = chartData.reduce((sum, month) => sum + month.total, 0);
  const avgMonthlyCost = totalCost / (chartData.length || 1);
  const latestMonth = chartData[chartData.length - 1] || {};
  const previousMonth = chartData[chartData.length - 2] || {};
  const costChange = latestMonth.total - previousMonth.total;
  const costChangePercent = previousMonth.total > 0
    ? ((costChange / previousMonth.total) * 100).toFixed(1)
    : 0;

  // Custom tooltip formatter
  const tooltipFormatter = (value) => formatCurrency(value);

  // No data state
  if (chartData.length === 0 || totalCost === 0) {
    return (
      <ChartContainer
        title="Cost Trends"
        description="Monthly cost breakdown over time"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">No cost data available</p>
            <p className="text-sm mt-2">Cost tracking will appear here</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Cost Trends"
        description="Monthly cost breakdown over time"
        onExport={() => exportChartAsPNG(chartRef, 'cost-trends.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
            <p className="text-sm text-gray-500">Total Cost</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(avgMonthlyCost)}</p>
            <p className="text-sm text-gray-500">Avg/Month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(latestMonth.total || 0)}</p>
            <p className="text-sm text-gray-500">Latest Month</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${costChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {costChange > 0 ? '+' : ''}{costChangePercent}%
            </p>
            <p className="text-sm text-gray-500">MoM Change</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorInfra" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.infrastructure} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.infrastructure} stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorPersonnel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.personnel} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.personnel} stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorTools" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.tools} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.tools} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={value => `$${(value / 1000).toFixed(0)}K`}
              label={{ value: 'Cost (USD)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            />
            <Tooltip
              content={<CustomTooltip formatter={tooltipFormatter} />}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            <Area
              type="monotone"
              dataKey="infrastructure"
              stackId="1"
              stroke={COLORS.infrastructure}
              fill="url(#colorInfra)"
              name="Infrastructure"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="personnel"
              stackId="1"
              stroke={COLORS.personnel}
              fill="url(#colorPersonnel)"
              name="Personnel"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="tools"
              stackId="1"
              stroke={COLORS.tools}
              fill="url(#colorTools)"
              name="Tools"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Cost Breakdown */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.infrastructure }}></div>
                <span className="text-sm text-gray-600">Infrastructure</span>
              </div>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(chartData.reduce((sum, m) => sum + m.infrastructure, 0))}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.personnel }}></div>
                <span className="text-sm text-gray-600">Personnel</span>
              </div>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(chartData.reduce((sum, m) => sum + m.personnel, 0))}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.tools }}></div>
                <span className="text-sm text-gray-600">Tools & Services</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(chartData.reduce((sum, m) => sum + m.tools, 0))}
              </p>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default CostAreaChart;
