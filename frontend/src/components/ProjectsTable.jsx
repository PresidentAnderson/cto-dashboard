/**
 * ProjectsTable Component
 * Full-featured data table with sorting, filtering, pagination, and CRUD operations
 */

import { useState, useMemo } from 'react';
import { cn, formatCurrency, formatNumber, getStatusColor } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/Table';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input, Select } from './ui/Input';

export function ProjectsTable({ projects, onEdit, onDelete, loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Extract unique values for filters
  const languages = useMemo(() => {
    const langs = new Set(projects.map(p => p.language).filter(Boolean));
    return Array.from(langs).sort();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = !searchQuery ||
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = !statusFilter || project.status === statusFilter;
      const matchesLanguage = !languageFilter || project.language === languageFilter;

      return matchesSearch && matchesStatus && matchesLanguage;
    });
  }, [projects, searchQuery, statusFilter, languageFilter]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // String comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredProjects, sortConfig]);

  // Paginate projects
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProjects, currentPage]);

  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectedProjects.size === paginatedProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(paginatedProjects.map(p => p.id)));
    }
  };

  const handleSelectProject = (id) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProjects(newSelected);
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) return;
    if (!window.confirm(`Delete ${selectedProjects.size} selected projects?`)) return;

    for (const id of selectedProjects) {
      await onDelete(id);
    }
    setSelectedProjects(new Set());
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setLanguageFilter('');
  };

  const hasFilters = searchQuery || statusFilter || languageFilter;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="shipped">Shipped</option>
          <option value="in_progress">In Progress</option>
          <option value="planning">Planning</option>
          <option value="deferred">Deferred</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="">All Languages</option>
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProjects.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-900">
            {selectedProjects.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProjects(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {paginatedProjects.length} of {sortedProjects.length} projects
        {hasFilters && ` (filtered from ${projects.length} total)`}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedProjects.size === paginatedProjects.length && paginatedProjects.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead
                sortable
                sorted={sortConfig.key === 'name' ? sortConfig.direction : null}
                onClick={() => handleSort('name')}
              >
                Name
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead
                sortable
                sorted={sortConfig.key === 'language' ? sortConfig.direction : null}
                onClick={() => handleSort('language')}
              >
                Language
              </TableHead>
              <TableHead
                sortable
                sorted={sortConfig.key === 'stars' ? sortConfig.direction : null}
                onClick={() => handleSort('stars')}
                className="text-center"
              >
                Stars
              </TableHead>
              <TableHead
                sortable
                sorted={sortConfig.key === 'status' ? sortConfig.direction : null}
                onClick={() => handleSort('status')}
              >
                Status
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium mb-2">No projects found</p>
                    <p className="text-sm">
                      {hasFilters ? 'Try adjusting your filters' : 'Get started by adding your first project'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProjects.map((project) => (
                <TableRow
                  key={project.id}
                  selected={selectedProjects.has(project.id)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project.id)}
                      onChange={() => handleSelectProject(project.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    {project.github_url && (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on GitHub
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md text-sm text-gray-600 truncate">
                      {project.description || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.language ? (
                      <Badge variant="outline">{project.language}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">
                      {formatNumber(project.stars || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(project)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(project.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
