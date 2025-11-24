/**
 * TrendIndicator Component
 * Up/down arrow with percentage for showing trends
 *
 * Features:
 * - Color-coded trends
 * - Directional arrows
 * - Accessible
 */

import React from 'react';
import { cn } from '../../lib/utils';

export default function TrendIndicator({
  trend = 'neutral',
  value,
  label,
  inverse = false,
  size = 'default',
  className,
  ...props
}) {
  const sizeStyles = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  // Inverse means: up is bad (red), down is good (green)
  const getTrendStyles = () => {
    if (trend === 'up') {
      return inverse
        ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-green-100 text-green-700 border-green-200';
    }
    if (trend === 'down') {
      return inverse
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-red-100 text-red-700 border-red-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 12h14"
        />
      </svg>
    );
  };

  const getTrendLabel = () => {
    if (label) return label;
    if (trend === 'up') return 'Increased';
    if (trend === 'down') return 'Decreased';
    return 'No change';
  };

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-1 rounded-full border font-semibold',
        getTrendStyles(),
        sizeStyles[size],
        className
      )}
      role="status"
      aria-label={`${getTrendLabel()}${value ? ` by ${value}` : ''}`}
      {...props}
    >
      {getTrendIcon()}
      {value && <span>{value}</span>}
    </div>
  );
}
