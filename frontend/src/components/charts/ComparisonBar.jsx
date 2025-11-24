/**
 * ComparisonBar Component
 * Side-by-side comparison of two values with change indicator
 */

import React from 'react';
import { transformForComparison } from '../../lib/chart-data-transformers';

const ComparisonBar = ({
  current = 0,
  previous = 0,
  label = '',
  format = 'number', // 'number', 'currency', 'percentage'
  showBar = true,
  barColor = '#3b82f6',
  className = ''
}) => {
  // Transform data
  const comparison = transformForComparison(current, previous, label);

  // Format value based on type
  const formatValue = (value) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  // Calculate bar width based on max value
  const maxValue = Math.max(current, previous);
  const currentWidth = maxValue > 0 ? (current / maxValue) * 100 : 0;
  const previousWidth = maxValue > 0 ? (previous / maxValue) * 100 : 0;

  // Determine trend color
  const trendColor = comparison.trend === 'up'
    ? 'text-green-600'
    : comparison.trend === 'down'
    ? 'text-red-600'
    : 'text-gray-600';

  const trendBg = comparison.trend === 'up'
    ? 'bg-green-50'
    : comparison.trend === 'down'
    ? 'bg-red-50'
    : 'bg-gray-50';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded ${trendBg}`}>
          {comparison.trend !== 'stable' && (
            <svg
              className={`w-4 h-4 ${trendColor} ${comparison.trend === 'down' && 'rotate-180'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className={`text-sm font-semibold ${trendColor}`}>
            {comparison.changePercent > 0 && '+'}
            {comparison.changePercent}%
          </span>
        </div>
      </div>

      {/* Values */}
      <div className="space-y-2">
        {/* Current */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Current</span>
            <span className="text-lg font-bold text-gray-900">
              {formatValue(current)}
            </span>
          </div>
        </div>

        {/* Current Bar */}
        {showBar && (
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                backgroundColor: barColor,
                width: `${currentWidth}%`
              }}
            ></div>
          </div>
        )}

        {/* Previous */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Previous</span>
            <span className="text-sm font-semibold text-gray-600">
              {formatValue(previous)}
            </span>
          </div>
        </div>

        {/* Previous Bar */}
        {showBar && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gray-400 transition-all duration-500"
              style={{ width: `${previousWidth}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Change Summary */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Change:</span>
          <span className={`font-semibold ${trendColor}`}>
            {comparison.change > 0 && '+'}
            {formatValue(Math.abs(comparison.change))}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact Comparison (for tight spaces)
 */
export const CompactComparison = ({
  current = 0,
  previous = 0,
  label = '',
  format = 'number'
}) => {
  const comparison = transformForComparison(current, previous, label);

  const formatValue = (value) => {
    switch (format) {
      case 'currency':
        return `$${(value / 1000).toFixed(0)}K`;
      case 'percentage':
        return `${value.toFixed(0)}%`;
      default:
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
    }
  };

  const trendColor = comparison.trend === 'up' ? 'text-green-600' : comparison.trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{formatValue(current)}</p>
      </div>
      <div className={`flex items-center space-x-1 ${trendColor}`}>
        {comparison.trend !== 'stable' && (
          <svg
            className={`w-3 h-3 ${comparison.trend === 'down' && 'rotate-180'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span className="text-xs font-semibold">
          {Math.abs(comparison.changePercent)}%
        </span>
      </div>
    </div>
  );
};

/**
 * Multi Comparison - Compare multiple metrics
 */
export const MultiComparison = ({ comparisons = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {comparisons.map((comp, index) => (
        <ComparisonBar
          key={index}
          current={comp.current}
          previous={comp.previous}
          label={comp.label}
          format={comp.format}
          barColor={comp.color}
        />
      ))}
    </div>
  );
};

export default ComparisonBar;
