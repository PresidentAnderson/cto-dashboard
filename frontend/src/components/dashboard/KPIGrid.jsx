/**
 * KPIGrid Component
 * 4-column metrics overview grid
 *
 * Features:
 * - Responsive grid (1-4 columns)
 * - Loading state
 * - Empty state
 */

import React from 'react';
import { cn } from '../../lib/utils';
import AnalyticsCard from '../core/AnalyticsCard';
import { SkeletonCard } from '../core/LoadingState';

export default function KPIGrid({
  metrics = [],
  loading = false,
  className,
  ...props
}) {
  if (loading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
          className
        )}
        {...props}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
        className
      )}
      {...props}
    >
      {metrics.map((metric, index) => (
        <AnalyticsCard
          key={metric.id || index}
          title={metric.title}
          value={metric.value}
          subtitle={metric.subtitle}
          icon={metric.icon}
          trend={metric.trend}
          trendValue={metric.trendValue}
          trendLabel={metric.trendLabel}
          variant={metric.variant}
        />
      ))}
    </div>
  );
}
