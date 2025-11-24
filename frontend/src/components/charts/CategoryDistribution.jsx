/**
 * CategoryDistribution Component
 * Shows distribution of projects across categories
 */

import React, { useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector
} from 'recharts';
import { transformCategoryDistribution } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG, CHART_COLORS } from './ChartUtils';

const CATEGORY_COLORS = {
  frontend: '#3b82f6',
  backend: '#8b5cf6',
  mobile: '#ec4899',
  infrastructure: '#f59e0b',
  data: '#10b981',
  security: '#ef4444',
  devops: '#06b6d4',
  ml: '#8b5cf6',
  uncategorized: '#6b7280'
};

// Render label with percentage
const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, name
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-semibold"
      style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CategoryDistribution = ({ projects = [], height = 400, loading = false, showList = true }) => {
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
  const chartData = transformCategoryDistribution(projects);
  const totalProjects = projects.length;

  // No data state
  if (chartData.length === 0) {
    return (
      <ChartContainer
        title="Projects by Category"
        description="Distribution across technology categories"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className="text-lg font-medium">No category data</p>
            <p className="text-sm mt-2">Categorize your projects to see distribution</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Projects by Category"
        description={`Distribution across ${chartData.length} categories`}
        onExport={() => exportChartAsPNG(chartRef, 'category-distribution.png')}
      >
        {/* Stats Row */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
            <p className="text-sm text-gray-500">Total Projects</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{chartData.length}</p>
            <p className="text-sm text-gray-500">Categories</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {chartData[0]?.name || 'N/A'}
            </p>
            <p className="text-sm text-gray-500">Largest</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[entry.name.toLowerCase()] || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0];
                return (
                  <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
                    <p className="font-semibold mb-2">{data.name}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-gray-300">Projects:</span>
                        <span className="font-semibold">{data.value}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-gray-300">Percentage:</span>
                        <span className="font-semibold">{data.payload.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Category List */}
        {showList && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Category Breakdown</h4>
            <div className="space-y-3">
              {chartData.map((category, index) => {
                const color = CATEGORY_COLORS[category.name.toLowerCase()] || CHART_COLORS.primary[index % CHART_COLORS.primary.length];
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 max-w-xs">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: color,
                              width: `${category.percentage}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-baseline space-x-2 w-20 justify-end">
                        <span className="text-lg font-bold text-gray-900">{category.value}</span>
                        <span className="text-sm text-gray-500">({category.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Portfolio Insights</p>
                <p className="text-sm text-blue-700 mt-1">
                  {chartData[0]?.name} projects dominate your portfolio with {chartData[0]?.percentage.toFixed(0)}%.
                  {chartData.length > 3 && ` Consider balancing across more categories for risk mitigation.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default CategoryDistribution;
