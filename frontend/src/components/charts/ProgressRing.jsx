/**
 * ProgressRing Component
 * Circular progress indicator with percentage
 */

import React from 'react';
import { calculateProgress } from '../../lib/chart-data-transformers';

const ProgressRing = ({
  completed = 0,
  total = 100,
  size = 120,
  strokeWidth = 12,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  showPercentage = true,
  showLabel = true,
  label = '',
  className = ''
}) => {
  // Calculate progress
  const progress = calculateProgress(completed, total);

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Get color based on progress
  const getColor = () => {
    if (progress >= 80) return '#10b981'; // Green
    if (progress >= 60) return '#3b82f6'; // Blue
    if (progress >= 40) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const progressColor = color === 'auto' ? getColor() : color;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Text */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {progress}%
              </div>
              {label && (
                <div className="text-xs text-gray-500 mt-1">
                  {completed}/{total}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      {showLabel && label && (
        <div className="mt-2 text-sm font-medium text-gray-600 text-center">
          {label}
        </div>
      )}
    </div>
  );
};

/**
 * Multiple Progress Rings - for comparing multiple metrics
 */
export const MultiProgressRing = ({ rings = [], size = 100 }) => {
  return (
    <div className="flex items-center justify-around">
      {rings.map((ring, index) => (
        <ProgressRing
          key={index}
          completed={ring.completed}
          total={ring.total}
          size={size}
          color={ring.color || 'auto'}
          label={ring.label}
          showLabel={true}
          showPercentage={true}
        />
      ))}
    </div>
  );
};

export default ProgressRing;
