/**
 * BugSeverityPieChart Component
 * Displays bug distribution by severity level
 */

import React, { useRef, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector
} from 'recharts';
import { transformBugsForPieChart } from '../../lib/chart-data-transformers';
import { ChartContainer, CustomTooltip, exportChartAsPNG, CHART_COLORS } from './ChartUtils';

const SEVERITY_COLORS = CHART_COLORS.severity;

// Active shape renderer for interactive pie
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={fill} fontSize={24} fontWeight="bold">
        {value}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="#6b7280" fontSize={14}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 35} dy={8} textAnchor="middle" fill="#9ca3af" fontSize={12}>
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const BugSeverityPieChart = ({ bugs = [], height = 400, loading = false }) => {
  const chartRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
  const chartData = transformBugsForPieChart(bugs);
  const totalBugs = chartData.reduce((sum, item) => sum + item.value, 0);

  // No data state
  if (totalBugs === 0) {
    return (
      <ChartContainer
        title="Bugs by Severity"
        description="Distribution of bugs across severity levels"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">No bugs found</p>
            <p className="text-sm mt-2">Great job! Keep up the quality work</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Bugs by Severity"
        description="Distribution of bugs across severity levels"
        onExport={() => exportChartAsPNG(chartRef, 'bugs-by-severity.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {chartData.map(item => (
            <div key={item.severity} className="text-center">
              <p
                className="text-2xl font-bold"
                style={{ color: SEVERITY_COLORS[item.severity] }}
              >
                {item.value}
              </p>
              <p className="text-sm text-gray-500">{item.name}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={SEVERITY_COLORS[entry.severity]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Additional Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total bugs:</span>
              <span className="font-semibold text-gray-900">{totalBugs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">High priority:</span>
              <span className="font-semibold text-red-600">
                {chartData.find(d => d.severity === 'critical')?.value || 0 +
                 chartData.find(d => d.severity === 'high')?.value || 0}
              </span>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default BugSeverityPieChart;
