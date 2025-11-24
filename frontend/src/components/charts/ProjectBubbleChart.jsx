/**
 * ProjectBubbleChart Component
 * Scatter plot showing projects by risk vs value with size representing scope
 */

import React, { useRef } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ZAxis
} from 'recharts';
import { transformProjectsForBubbleChart } from '../../lib/chart-data-transformers';
import { ChartContainer, exportChartAsPNG, CHART_COLORS } from './ChartUtils';

const CATEGORY_COLORS = {
  frontend: '#3b82f6',
  backend: '#8b5cf6',
  mobile: '#ec4899',
  infrastructure: '#f59e0b',
  data: '#10b981',
  uncategorized: '#6b7280'
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
      <p className="font-semibold mb-2">{data.name}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-300">Risk:</span>
          <span className="font-semibold">{data.x}%</span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-300">Value:</span>
          <span className="font-semibold">{data.y}%</span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-300">Size:</span>
          <span className="font-semibold">{data.z}</span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-300">Category:</span>
          <span className="font-semibold capitalize">{data.category}</span>
        </div>
      </div>
    </div>
  );
};

const ProjectBubbleChart = ({ projects = [], height = 500, loading = false }) => {
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
  const chartData = transformProjectsForBubbleChart(projects);

  // Calculate quadrants
  const highValueLowRisk = chartData.filter(p => p.y >= 50 && p.x < 50).length;
  const highValueHighRisk = chartData.filter(p => p.y >= 50 && p.x >= 50).length;
  const lowValueLowRisk = chartData.filter(p => p.y < 50 && p.x < 50).length;
  const lowValueHighRisk = chartData.filter(p => p.y < 50 && p.x >= 50).length;

  // No data state
  if (chartData.length === 0) {
    return (
      <ChartContainer
        title="Project Portfolio Matrix"
        description="Projects plotted by risk vs value"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">No project data available</p>
            <p className="text-sm mt-2">Add projects to visualize portfolio</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Project Portfolio Matrix"
        description="Projects plotted by risk (x-axis) vs value (y-axis), bubble size = scope"
        onExport={() => exportChartAsPNG(chartRef, 'project-portfolio-matrix.png')}
      >
        {/* Quadrant Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{highValueLowRisk}</p>
            <p className="text-xs text-gray-600">High Value<br/>Low Risk</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{highValueHighRisk}</p>
            <p className="text-xs text-gray-600">High Value<br/>High Risk</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{lowValueLowRisk}</p>
            <p className="text-xs text-gray-600">Low Value<br/>Low Risk</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{lowValueHighRisk}</p>
            <p className="text-xs text-gray-600">Low Value<br/>High Risk</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              name="Risk Score"
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: 'Risk Score →', position: 'bottom', style: { fill: '#6b7280' } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Value Score"
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{ value: '← Value Score', angle: -90, position: 'left', style: { fill: '#6b7280' } }}
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[100, 1000]}
              name="Size"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />

            {/* Reference lines for quadrants */}
            <CartesianGrid
              stroke="#9ca3af"
              strokeDasharray="5 5"
              horizontal={false}
              verticalPoints={[50]}
            />
            <CartesianGrid
              stroke="#9ca3af"
              strokeDasharray="5 5"
              vertical={false}
              horizontalPoints={[50]}
            />

            {/* Scatter plot */}
            <Scatter
              data={chartData}
              fill="#3b82f6"
              name="Projects"
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.uncategorized}
                  fillOpacity={0.8}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant Guide */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-3 h-3 mt-1 rounded-full bg-green-500"></div>
                <div>
                  <p className="font-semibold text-gray-900">Quick Wins (Top-Left)</p>
                  <p className="text-gray-600">High value, low risk - prioritize these</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-3 h-3 mt-1 rounded-full bg-yellow-500"></div>
                <div>
                  <p className="font-semibold text-gray-900">Strategic (Top-Right)</p>
                  <p className="text-gray-600">High value, high risk - plan carefully</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-3 h-3 mt-1 rounded-full bg-blue-500"></div>
                <div>
                  <p className="font-semibold text-gray-900">Fill-ins (Bottom-Left)</p>
                  <p className="text-gray-600">Low value, low risk - do if resources allow</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-3 h-3 mt-1 rounded-full bg-red-500"></div>
                <div>
                  <p className="font-semibold text-gray-900">Money Pits (Bottom-Right)</p>
                  <p className="text-gray-600">Low value, high risk - avoid or re-scope</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Legend */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-600 mb-2">Categories:</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                <div key={category} className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-xs text-gray-600 capitalize">{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default ProjectBubbleChart;
