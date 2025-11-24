/**
 * ChartUtils
 * Shared utilities for all chart components
 */

import React from 'react';

/**
 * Export chart as PNG
 */
export const exportChartAsPNG = (chartRef, filename = 'chart.png') => {
  if (!chartRef.current) return;

  try {
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  } catch (error) {
    console.error('Error exporting chart:', error);
  }
};

/**
 * Export chart as SVG
 */
export const exportChartAsSVG = (chartRef, filename = 'chart.svg') => {
  if (!chartRef.current) return;

  try {
    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting chart:', error);
  }
};

/**
 * Chart Container with Export Button
 */
export const ChartContainer = ({ title, children, onExport, description, actions }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {actions}
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1.5 shadow-sm"
              title="Export as PNG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Content */}
      {children}
    </div>
  );
};

/**
 * Custom Tooltip Component
 */
export const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700">
      {label && <p className="font-semibold mb-2">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center space-x-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Loading Skeleton for Charts
 */
export const ChartLoadingSkeleton = ({ height = 400 }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
      <div className={`bg-gray-200 rounded`} style={{ height: `${height}px` }}></div>
    </div>
  );
};

/**
 * Empty State for Charts
 */
export const ChartEmptyState = ({ title, message, icon }) => {
  return (
    <ChartContainer title={title}>
      <div className="flex items-center justify-center h-96 text-gray-400">
        <div className="text-center">
          {icon || (
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
          <p className="text-lg font-medium text-gray-600">{message || 'No data available'}</p>
        </div>
      </div>
    </ChartContainer>
  );
};

/**
 * Color schemes for charts
 */
export const CHART_COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'],
  severity: {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
  },
  status: {
    pending: '#6b7280',
    in_progress: '#3b82f6',
    verified: '#22c55e',
    shipped: '#14b8a6',
    closed: '#4b5563',
    deferred: '#a855f7'
  },
  gradient: {
    blue: ['#3b82f6', '#1e40af'],
    purple: ['#8b5cf6', '#6d28d9'],
    green: ['#10b981', '#059669'],
    red: ['#ef4444', '#dc2626'],
    yellow: ['#f59e0b', '#d97706']
  },
  // Color-blind friendly palette
  colorBlindSafe: ['#0173b2', '#de8f05', '#029e73', '#cc78bc', '#ca9161', '#949494', '#ece133', '#56b4e9']
};

/**
 * Format currency
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format large numbers
 */
export const formatNumber = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Format percentage
 */
export const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`;
};

export default {
  exportChartAsPNG,
  exportChartAsSVG,
  ChartContainer,
  CustomTooltip,
  ChartLoadingSkeleton,
  ChartEmptyState,
  CHART_COLORS,
  formatCurrency,
  formatNumber,
  formatPercentage
};
