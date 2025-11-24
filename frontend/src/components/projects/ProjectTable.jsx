/**
 * ProjectTable Component
 * Table view option for projects
 *
 * Features:
 * - Sortable columns
 * - Inline actions
 * - Responsive
 */

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import ProjectHealthBadge from './ProjectHealthBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate, getStatusColor } from '../../lib/utils';
import EmptyState from '../core/EmptyState';

export default function ProjectTable({
  projects = [],
  onEdit,
  onDelete,
  onView,
  sortable = true,
  className,
  ...props
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedProjects = React.useMemo(() => {
    const sorted = [...projects];
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
  }, [projects, sortConfig]);

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

  if (projects.length === 0) {
    return (
      <EmptyState
        iconType="project"
        title="No projects found"
        description="Get started by creating your first project."
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
              onClick={() => handleSort('name')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Project Name</span>
                <SortIcon columnKey="name" />
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
              onClick={() => handleSort('healthScore')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Health</span>
                <SortIcon columnKey="healthScore" />
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort('bugCount')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Bugs</span>
                <SortIcon columnKey="bugCount" />
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort('lastUpdated')}
              className={cn(sortable && 'cursor-pointer hover:bg-gray-50')}
            >
              <div className="flex items-center space-x-1">
                <span>Last Updated</span>
                <SortIcon columnKey="lastUpdated" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.map((project) => (
            <TableRow key={project.id} className="hover:bg-gray-50">
              <TableCell>
                <div>
                  <div className="font-medium text-gray-900">{project.name}</div>
                  {project.description && (
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {project.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(project.status)}>
                  {project.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <ProjectHealthBadge health={project.health || 'good'} />
              </TableCell>
              <TableCell>
                <span className="text-gray-900 font-medium">
                  {project.bugCount || 0}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-gray-600 text-sm">
                  {formatDate(project.lastUpdated || project.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex justify-end space-x-2">
                  {onView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(project)}
                      aria-label="View project"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(project)}
                      aria-label="Edit project"
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
                      onClick={() => onDelete(project.id)}
                      aria-label="Delete project"
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
