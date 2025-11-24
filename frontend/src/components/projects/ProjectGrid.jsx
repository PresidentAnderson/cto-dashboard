/**
 * ProjectGrid Component
 * Card grid layout for projects
 *
 * Features:
 * - Responsive grid (1-3 columns)
 * - Empty state
 * - Loading state
 */

import React from 'react';
import { cn } from '../../lib/utils';
import ProjectCard from './ProjectCard';
import EmptyState from '../core/EmptyState';
import { SkeletonCard } from '../core/LoadingState';

export default function ProjectGrid({
  projects = [],
  onEdit,
  onDelete,
  onView,
  loading = false,
  className,
  ...props
}) {
  if (loading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
          className
        )}
        {...props}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        iconType="project"
        title="No projects found"
        description="Get started by creating your first project to track bugs and manage development."
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className
      )}
      {...props}
    >
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
}
