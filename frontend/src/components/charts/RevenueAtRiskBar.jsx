/**
 * RevenueAtRiskBar Component
 * Shows revenue at risk by project
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
  ResponsiveContainer,
  Cell
} from 'recharts';
import { transformRevenueAtRisk } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG, formatCurrency } from './ChartUtils';

// Color based on risk score
const getRiskColor = (riskScore) => {
  if (riskScore >= 75) return '#dc2626'; // High risk - red
  if (riskScore >= 50) return '#f97316'; // Medium-high - orange
  if (riskScore >= 25) return '#eab308'; // Medium - yellow
  return '#10b981'; // Low risk - green
};

const RevenueAtRiskBar = ({ projects = [], height = 400, loading = false }) => {
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
  const chartData = transformRevenueAtRisk(projects);

  // Calculate statistics
  const totalRevenue = chartData.reduce((sum, p) => sum + p.revenue, 0);
  const highRiskRevenue = chartData
    .filter(p => p.risk >= 75)
    .reduce((sum, p) => sum + p.revenue, 0);
  const avgRisk = chartData.length > 0
    ? (chartData.reduce((sum, p) => sum + p.risk, 0) / chartData.length).toFixed(1)
    : 0;

  // Custom tooltip formatter
  const tooltipFormatter = (value) => formatCurrency(value);

  // No data state
  if (chartData.length === 0) {
    return (
      <ChartContainer
        title="Revenue at Risk"
        description="Top 10 projects by revenue impact"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">No revenue risk data</p>
            <p className="text-sm mt-2">Add revenue impact to projects</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Revenue at Risk"
        description="Top 10 projects by revenue impact"
        onExport={() => exportChartAsPNG(chartRef, 'revenue-at-risk.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-gray-500">Total at Risk</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(highRiskRevenue)}</p>
            <p className="text-sm text-gray-500">High Risk</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{avgRisk}%</p>
            <p className="text-sm text-gray-500">Avg Risk Score</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={value => `$${(value / 1000).toFixed(0)}K`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={90}
            />
            <Tooltip
              content={<CustomTooltip formatter={tooltipFormatter} />}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            <Bar
              dataKey="revenue"
              radius={[0, 8, 8, 0]}
              name="Revenue"
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getRiskColor(entry.risk)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Risk Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Risk levels:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Low (0-25)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">Medium (25-50)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-600">High (50-75)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span className="text-gray-600">Critical (75+)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Risk Projects */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">High Priority Projects:</h4>
          {chartData.filter(p => p.risk >= 75).slice(0, 3).map((project, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span className="font-medium text-gray-900">{project.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Risk: {project.risk}%</span>
                <span className="font-semibold text-red-600">{formatCurrency(project.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
};

export default RevenueAtRiskBar;
