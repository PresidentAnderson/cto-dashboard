/**
 * TopRisks Component
 * High-risk projects list with risk scores
 *
 * Features:
 * - Risk level indicators
 * - Quick actions
 * - Empty state
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import ProjectHealthBadge from '../projects/ProjectHealthBadge';
import EmptyState from '../core/EmptyState';

export default function TopRisks({
  projects = [],
  maxItems = 5,
  onViewProject,
  className,
  ...props
}) {
  // Sort by risk score (highest first)
  const sortedProjects = [...projects]
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, maxItems);

  const getRiskColor = (score) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getRiskLabel = (score) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  if (projects.length === 0) {
    return (
      <Card className={className} {...props}>
        <CardHeader>
          <CardTitle>Top Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            iconType="project"
            title="No risk data available"
            description="Risk assessments will appear here for projects that need attention."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Risks</CardTitle>
          <span className="text-sm text-gray-500">
            {sortedProjects.length} projects
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Risk Score Circle */}
                <div className="flex-shrink-0">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className={cn(getRiskColor(project.riskScore || 0))}
                        strokeDasharray={`${(project.riskScore || 0) * 1.26} 126`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900">
                        {project.riskScore || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {project.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      project.riskScore >= 80 ? 'bg-red-100 text-red-700' :
                      project.riskScore >= 60 ? 'bg-orange-100 text-orange-700' :
                      project.riskScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {getRiskLabel(project.riskScore || 0)} Risk
                    </span>
                    <ProjectHealthBadge
                      health={project.health || 'good'}
                      size="sm"
                      showIcon={false}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {onViewProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewProject(project)}
                  aria-label={`View ${project.name}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
