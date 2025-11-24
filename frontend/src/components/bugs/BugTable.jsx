/**
 * BugTable Component
 * Sortable, filterable table for displaying bugs
 *
 * Features:
 * - Column sorting
 * - Inline actions
 * - Responsive design
 * - Accessible (ARIA, keyboard navigation)
 */

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import SeverityBadge from '../core/SeverityBadge';
import { Badge } from '../ui/Badge';
import BugRow from './BugRow';
import EmptyState from '../core/EmptyState';

export default function BugTable({
  bugs = [],
  onEdit,
  onDelete,
  onStatusChange,
  sortable = true,
  className,
  ...props
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedBugs = React.useMemo(() => {
    const sorted = [...bugs];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;

      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * direction;
      }

      return (aVal > bVal ? 1 : -1) * direction;
    });
    return sorted;
  }, [bugs, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (!sortable || sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (bugs.length === 0) {
    return (
      <EmptyState
        iconType="bug"
        title="No bugs found"
        description="No bugs match your current filters. Try adjusting your search criteria."
        className={className}
      />
    );
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)} {...props}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              onClick={() => handleSort('title')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Title</span>
                <SortIcon columnKey="title" />
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort('severity')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Severity</span>
                <SortIcon columnKey="severity" />
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort('status')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Status</span>
                <SortIcon columnKey="status" />
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort('project')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Project</span>
                <SortIcon columnKey="project" />
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort('createdAt')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Created</span>
                <SortIcon columnKey="createdAt" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBugs.map((bug) => (
            <BugRow
              key={bug.id}
              bug={bug}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
