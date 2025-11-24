/**
 * MetricStat Component
 * Large number display with label for KPIs
 *
 * Features:
 * - Formatted large numbers
 * - Customizable size
 * - Accessible
 */

import React from 'react';
import { cn } from '../../lib/utils';

export default function MetricStat({
  value,
  unit,
  size = 'default',
  className,
  ...props
}) {
  const sizeStyles = {
    sm: 'text-2xl',
    default: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-6xl',
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      // Format large numbers
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div
      className={cn('flex items-baseline space-x-1', className)}
      {...props}
    >
      <span
        className={cn(
          'font-bold text-gray-900 tracking-tight',
          sizeStyles[size]
        )}
        aria-label={`${value}${unit ? ` ${unit}` : ''}`}
      >
        {formatValue(value)}
      </span>
      {unit && (
        <span className="text-lg text-gray-500 font-medium">
          {unit}
        </span>
      )}
    </div>
  );
}
