/**
 * ProjectCard Component (Enhanced)
 * Project overview card for grid layout
 *
 * Features:
 * - Health badge integration
 * - Bug count display
 * - Interactive hover states
 * - Accessible
 */

import React from 'react';
import { cn, formatNumber, formatDate, getStatusColor } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import ProjectHealthBadge from './ProjectHealthBadge';

export default function ProjectCard({ project, onEdit, onDelete, onView }) {
  const {
    name,
    description,
    github_url,
    demo_url,
    language,
    stars,
    status,
    tags,
    health,
    bugCount,
    lastUpdated,
    createdAt,
  } = project;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-1">{name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={cn('shrink-0', getStatusColor(status))}>
              {status?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health & Bug Count */}
        <div className="flex items-center justify-between">
          <ProjectHealthBadge health={health || 'good'} size="sm" />
          {bugCount !== undefined && (
            <div className="flex items-center space-x-1 text-sm">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-gray-600 font-medium">{bugCount} bugs</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3 min-h-[3.6rem]">
          {description || 'No description provided'}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm">
          {language && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-gray-700 font-medium">{language}</span>
            </div>
          )}
          {stars > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <svg
                className="w-4 h-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium">{formatNumber(stars)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Last Updated */}
        {(lastUpdated || createdAt) && (
          <div className="text-xs text-gray-500">
            Updated {formatDate(lastUpdated || createdAt)}
          </div>
        )}

        {/* Links */}
        {(github_url || demo_url) && (
          <div className="flex items-center gap-3 pt-2 border-t">
            {github_url && (
              <a
                href={github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="View on GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
            )}
            {demo_url && (
              <a
                href={demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="View demo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Demo</span>
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView(project)}
            >
              View Details
            </Button>
          )}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              className={cn(!onView && 'flex-1')}
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
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label="Delete project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
