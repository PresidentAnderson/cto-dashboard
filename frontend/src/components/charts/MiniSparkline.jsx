/**
 * MiniSparkline Component
 * Compact inline trend indicator for dashboard widgets
 */

import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { transformForSparkline } from '../../lib/chart-data-transformers';

const MiniSparkline = ({
  data = [],
  valueKey = 'value',
  color = '#3b82f6',
  height = 40,
  showTrend = true,
  className = ''
}) => {
  // Transform data
  const chartData = transformForSparkline(data, valueKey);

  // Calculate trend
  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].value - chartData[0].value
    : 0;

  const trendPercent = chartData[0]?.value > 0
    ? ((trend / chartData[0].value) * 100).toFixed(1)
    : 0;

  const isPositive = trend >= 0;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Sparkline */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Indicator */}
      {showTrend && (
        <div className={`flex items-center space-x-1 text-sm font-medium ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <svg
            className={`w-4 h-4 transform ${!isPositive && 'rotate-180'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>{Math.abs(trendPercent)}%</span>
        </div>
      )}
    </div>
  );
};

export default MiniSparkline;
