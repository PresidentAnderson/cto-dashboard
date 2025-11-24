/**
 * LoadingState Component
 * Skeleton loaders for various UI elements
 *
 * Features:
 * - Multiple variants (card, table, list)
 * - Smooth animations
 * - Accessible
 */

import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonCard({ className }) {
  return (
    <div
      className={cn(
        'border border-gray-200 rounded-lg p-6 bg-white shadow-sm',
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <div className="animate-pulse space-y-4">
        <div className="flex justify-between items-start">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-6 w-6 bg-gray-200 rounded-full" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded" />
        <div className="flex justify-between items-center">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className }) {
  return (
    <div
      className={cn('border border-gray-200 rounded-lg bg-white shadow-sm', className)}
      role="status"
      aria-label="Loading table"
    >
      <div className="overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="animate-pulse flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex-1 h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="animate-pulse flex gap-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div key={colIndex} className="flex-1 h-4 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

export function SkeletonList({ items = 3, className }) {
  return (
    <div
      className={cn('space-y-3', className)}
      role="status"
      aria-label="Loading list"
    >
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
        >
          <div className="animate-pulse space-y-2">
            <div className="h-5 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading list items...</span>
    </div>
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div
      className={cn('space-y-2', className)}
      role="status"
      aria-label="Loading text"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-gray-200 rounded animate-pulse',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export default function LoadingState({ variant = 'card', className, ...props }) {
  const variants = {
    card: <SkeletonCard className={className} />,
    table: <SkeletonTable className={className} {...props} />,
    list: <SkeletonList className={className} {...props} />,
    text: <SkeletonText className={className} {...props} />,
  };

  return variants[variant] || variants.card;
}
