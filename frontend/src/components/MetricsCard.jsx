/**
 * MetricsCard Component
 * Reusable KPI card with trend indicators and color-coded styling
 */

import React from 'react';

const MetricsCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false
}) => {
  // Color mappings for different card types
  const colorClasses = {
    red: {
      border: 'border-red-300',
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      text: 'text-red-900',
      accent: 'text-red-600',
      trend: {
        up: 'bg-red-100 text-red-700',
        down: 'bg-green-100 text-green-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    orange: {
      border: 'border-orange-300',
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      text: 'text-orange-900',
      accent: 'text-orange-600',
      trend: {
        up: 'bg-orange-100 text-orange-700',
        down: 'bg-green-100 text-green-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    yellow: {
      border: 'border-yellow-300',
      bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      text: 'text-yellow-900',
      accent: 'text-yellow-600',
      trend: {
        up: 'bg-yellow-100 text-yellow-700',
        down: 'bg-green-100 text-green-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    green: {
      border: 'border-green-300',
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      text: 'text-green-900',
      accent: 'text-green-600',
      trend: {
        up: 'bg-green-100 text-green-700',
        down: 'bg-red-100 text-red-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    blue: {
      border: 'border-blue-300',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      text: 'text-blue-900',
      accent: 'text-blue-600',
      trend: {
        up: 'bg-blue-100 text-blue-700',
        down: 'bg-red-100 text-red-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    purple: {
      border: 'border-purple-300',
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      text: 'text-purple-900',
      accent: 'text-purple-600',
      trend: {
        up: 'bg-purple-100 text-purple-700',
        down: 'bg-red-100 text-red-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    teal: {
      border: 'border-teal-300',
      bg: 'bg-gradient-to-br from-teal-50 to-teal-100',
      text: 'text-teal-900',
      accent: 'text-teal-600',
      trend: {
        up: 'bg-teal-100 text-teal-700',
        down: 'bg-red-100 text-red-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    },
    gray: {
      border: 'border-gray-300',
      bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
      text: 'text-gray-900',
      accent: 'text-gray-600',
      trend: {
        up: 'bg-gray-100 text-gray-700',
        down: 'bg-gray-100 text-gray-700',
        neutral: 'bg-gray-100 text-gray-700'
      }
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  // Trend icons
  const getTrendIcon = (trendType) => {
    if (!trendType) return null;

    switch (trendType) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'neutral':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        rounded-xl border-2 p-6
        ${colors.border}
        ${colors.bg}
        shadow-lg hover:shadow-xl
        transition-all duration-300
        transform hover:-translate-y-1
        relative overflow-hidden
      `}
    >
      {/* Decorative background pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform rotate-12 translate-x-8 -translate-y-8">
        {icon && <div className="text-8xl">{icon}</div>}
      </div>

      {/* Card content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            {title}
          </h3>
          {icon && <span className="text-3xl opacity-80">{icon}</span>}
        </div>

        {/* Main value */}
        {loading ? (
          <div className="animate-pulse">
            <div className="h-10 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          <>
            <div className={`text-4xl font-bold ${colors.text} mb-2`}>
              {value !== undefined && value !== null ? value : '-'}
            </div>

            {/* Subtitle and trend */}
            <div className="flex items-center justify-between">
              {subtitle && (
                <p className="text-sm text-gray-600 font-medium">
                  {subtitle}
                </p>
              )}

              {trend && (
                <div className={`
                  flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold
                  ${colors.trend[trend]}
                `}>
                  {getTrendIcon(trend)}
                  {trendValue && <span>{trendValue}</span>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MetricsCard;
