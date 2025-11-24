/**
 * BugFilters Component
 * Filter controls for bug table
 *
 * Features:
 * - Search by text
 * - Filter by severity, status, project
 * - Clear filters
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import SeverityBadge from '../core/SeverityBadge';

const severityOptions = ['critical', 'high', 'medium', 'low'];
const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function BugFilters({
  filters,
  onChange,
  projects = [],
  className,
  ...props
}) {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const handleClearFilters = () => {
    onChange({
      search: '',
      severity: [],
      status: [],
      projectId: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.severity?.length > 0 ||
      filters.status?.length > 0 ||
      filters.projectId
    );
  };

  const toggleArrayFilter = (field, value) => {
    const current = filters[field] || [];
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    handleChange(field, newValue);
  };

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Search */}
      <div>
        <Input
          placeholder="Search bugs by title or description..."
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity
          </label>
          <div className="flex flex-wrap gap-2">
            {severityOptions.map((severity) => {
              const isActive = filters.severity?.includes(severity);
              return (
                <button
                  key={severity}
                  type="button"
                  onClick={() => toggleArrayFilter('severity', severity)}
                  className={cn(
                    'transition-all',
                    isActive && 'ring-2 ring-blue-500 rounded-full'
                  )}
                >
                  <SeverityBadge severity={severity} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => {
              const isActive = filters.status?.includes(status.value);
              return (
                <Button
                  key={status.value}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArrayFilter('status', status.value)}
                >
                  {status.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Project Filter */}
        <div>
          <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 mb-2">
            Project
          </label>
          <select
            id="projectFilter"
            value={filters.projectId || ''}
            onChange={(e) => handleChange('projectId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters() && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
