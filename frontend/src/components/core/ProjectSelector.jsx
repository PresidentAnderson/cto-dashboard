/**
 * ProjectSelector Component
 * Searchable dropdown for selecting projects
 *
 * Features:
 * - Search/filter functionality
 * - Keyboard navigation
 * - Accessible (ARIA)
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export default function ProjectSelector({
  projects = [],
  value,
  onChange,
  placeholder = 'Select a project',
  className,
  disabled = false,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const selectedProject = projects.find((p) => p.id === value);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      searchRef.current?.focus();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (projectId) => {
    onChange(projectId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef} {...props}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={cn(!selectedProject && 'text-gray-500')}>
          {selectedProject ? selectedProject.name : placeholder}
        </span>
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'transform rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </Button>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg"
          role="listbox"
        >
          <div className="p-2 border-b border-gray-200">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search projects"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredProjects.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No projects found
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project.id)}
                  className={cn(
                    'w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors',
                    'focus:bg-gray-50 focus:outline-none',
                    value === project.id && 'bg-blue-50 text-blue-700'
                  )}
                  role="option"
                  aria-selected={value === project.id}
                >
                  <div className="font-medium">{project.name}</div>
                  {project.description && (
                    <div className="text-sm text-gray-500 truncate">
                      {project.description}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
