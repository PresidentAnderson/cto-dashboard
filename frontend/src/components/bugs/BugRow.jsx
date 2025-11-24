/**
 * BugRow Component
 * Table row with inline actions for bug management
 *
 * Features:
 * - Quick status change
 * - Edit/delete actions
 * - Expandable details
 */

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { TableRow, TableCell } from '../ui/Table';
import SeverityBadge from '../core/SeverityBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-300' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

export default function BugRow({
  bug,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[bug.status] || statusConfig.open;

  return (
    <>
      <TableRow className="hover:bg-gray-50">
        <TableCell>
          <div className="flex items-start space-x-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-gray-400 hover:text-gray-600"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <svg
                className={cn(
                  'w-4 h-4 transition-transform',
                  expanded && 'transform rotate-90'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <div>
              <div className="font-medium text-gray-900">{bug.title}</div>
              {bug.description && !expanded && (
                <div className="text-sm text-gray-500 truncate max-w-md">
                  {bug.description}
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <SeverityBadge severity={bug.severity} />
        </TableCell>
        <TableCell>
          <Badge className={status.color}>
            {status.label}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-gray-900">{bug.project?.name || '-'}</span>
        </TableCell>
        <TableCell>
          <span className="text-gray-600 text-sm">
            {formatDate(bug.createdAt)}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex justify-end space-x-2">
            {onStatusChange && bug.status !== 'resolved' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(bug.id, 'resolved')}
                aria-label="Mark as resolved"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(bug)}
                aria-label="Edit bug"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(bug.id)}
                aria-label="Delete bug"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && bug.description && (
        <TableRow>
          <TableCell colSpan={6} className="bg-gray-50 border-t-0">
            <div className="py-4 pl-8">
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{bug.description}</p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
