/**
 * RecentActivity Component
 * Activity feed for recent events
 *
 * Features:
 * - Timeline view
 * - Activity icons
 * - Time ago display
 * - Empty state
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import EmptyState from '../core/EmptyState';

const activityIcons = {
  bug_created: (
    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  bug_resolved: (
    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  project_created: (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  project_updated: (
    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  status_change: (
    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
};

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function RecentActivity({
  activities = [],
  maxItems = 10,
  className,
  ...props
}) {
  const displayActivities = activities.slice(0, maxItems);

  if (activities.length === 0) {
    return (
      <Card className={className} {...props}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            iconType="data"
            title="No recent activity"
            description="Activity will appear here as you work on projects and bugs."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {displayActivities.map((activity, index) => (
            <div
              key={activity.id || index}
              className={cn(
                'flex items-start space-x-3 py-3',
                index !== displayActivities.length - 1 && 'border-b border-gray-100'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {activityIcons[activity.type] || activityIcons.status_change}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {activity.description}
                </p>
                {activity.project && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activity.project}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {timeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {activities.length > maxItems && (
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
