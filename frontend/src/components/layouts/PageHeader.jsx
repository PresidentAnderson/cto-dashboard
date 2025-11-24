/**
 * PageHeader Component
 * Page title and action buttons
 *
 * Features:
 * - Breadcrumbs support
 * - Action buttons
 * - Responsive layout
 * - Accessible
 */

import React from 'react';
import { cn } from '../../lib/utils';

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  ...props
}) {
  return (
    <div className={cn('bg-white border-b border-gray-200', className)} {...props}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <svg
                      className="w-4 h-4 text-gray-400 mx-2"
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
                  )}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Header content */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-gray-600 max-w-3xl">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="flex items-center space-x-3 flex-shrink-0">
              {actions.map((action, index) => (
                <React.Fragment key={index}>
                  {action}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
