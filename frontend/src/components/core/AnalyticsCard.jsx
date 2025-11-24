/**
 * AnalyticsCard Component
 * Stat card with trend indicator for displaying key metrics
 *
 * Features:
 * - Responsive design
 * - Trend indicators (up/down/neutral)
 * - Loading state
 * - Accessible
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../lib/utils';
import TrendIndicator from './TrendIndicator';
import MetricStat from './MetricStat';

export default function AnalyticsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  trendLabel,
  variant = 'default',
  loading = false,
  className,
  ...props
}) {
  const variantStyles = {
    default: 'border-gray-200 bg-white',
    primary: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
  };

  if (loading) {
    return (
      <Card className={cn(variantStyles[variant], className)} {...props}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            {icon && <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-md',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          {icon && (
            <div className="text-gray-500" aria-hidden="true">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricStat value={value} />
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
          {trend && (
            <TrendIndicator
              trend={trend}
              value={trendValue}
              label={trendLabel}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
