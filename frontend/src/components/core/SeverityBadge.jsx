/**
 * SeverityBadge Component
 * Color-coded severity levels for bugs and issues
 *
 * Features:
 * - Multiple severity levels (critical, high, medium, low)
 * - Consistent styling
 * - Accessible
 */

import React from 'react';
import { cn } from '../../lib/utils';

const severityConfig = {
  critical: {
    label: 'Critical',
    styles: 'bg-red-100 text-red-800 border-red-300 ring-red-600/20',
    icon: '🔴',
  },
  high: {
    label: 'High',
    styles: 'bg-orange-100 text-orange-800 border-orange-300 ring-orange-600/20',
    icon: '🟠',
  },
  medium: {
    label: 'Medium',
    styles: 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-yellow-600/20',
    icon: '🟡',
  },
  low: {
    label: 'Low',
    styles: 'bg-blue-100 text-blue-800 border-blue-300 ring-blue-600/20',
    icon: '🔵',
  },
  info: {
    label: 'Info',
    styles: 'bg-gray-100 text-gray-800 border-gray-300 ring-gray-600/20',
    icon: 'ℹ️',
  },
};

export default function SeverityBadge({
  severity = 'low',
  showIcon = false,
  size = 'default',
  className,
  ...props
}) {
  const config = severityConfig[severity.toLowerCase()] || severityConfig.low;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center space-x-1 rounded-full border font-semibold',
        'ring-1 ring-inset',
        config.styles,
        sizeStyles[size],
        className
      )}
      role="status"
      aria-label={`${config.label} severity`}
      {...props}
    >
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
