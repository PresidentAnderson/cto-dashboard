/**
 * ActivityHeatmap Component
 * Calendar-style heatmap showing commit activity by day and hour
 */

import React, { useRef } from 'react';
import { transformCommitsForHeatmap } from '../../lib/chart-data-transformers';
import { ChartContainer, exportChartAsPNG } from './ChartUtils';

const ActivityHeatmap = ({ commits = [], loading = false }) => {
  const chartRef = useRef(null);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Transform data
  const heatmapData = transformCommitsForHeatmap(commits);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Calculate statistics
  const totalCommits = heatmapData.reduce((sum, cell) => sum + cell.count, 0);
  const busiestDay = days[
    heatmapData.reduce((max, cell) => {
      const dayTotal = heatmapData
        .filter(c => c.day === cell.day)
        .reduce((sum, c) => sum + c.count, 0);
      return dayTotal > max.total ? { day: days.indexOf(cell.day), total: dayTotal } : max;
    }, { day: 0, total: 0 }).day
  ];

  const busiestHour = heatmapData.reduce((max, cell) =>
    cell.count > max.count ? cell : max,
    heatmapData[0]
  ).hour;

  // Get color based on intensity
  const getColor = (intensity) => {
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.2) return '#dbeafe';
    if (intensity < 0.4) return '#93c5fd';
    if (intensity < 0.6) return '#60a5fa';
    if (intensity < 0.8) return '#3b82f6';
    return '#1e40af';
  };

  // No data state
  if (totalCommits === 0) {
    return (
      <ChartContainer
        title="Activity Heatmap"
        description="Commit activity by day of week and hour"
      >
        <div className="flex items-center justify-center h-96 text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">No activity data available</p>
            <p className="text-sm mt-2">Commit history will appear here</p>
          </div>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div ref={chartRef}>
      <ChartContainer
        title="Activity Heatmap"
        description="Commit activity by day of week and hour"
        onExport={() => exportChartAsPNG(chartRef, 'activity-heatmap.png')}
      >
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalCommits}</p>
            <p className="text-sm text-gray-500">Total Commits</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{busiestDay}</p>
            <p className="text-sm text-gray-500">Busiest Day</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{busiestHour}:00</p>
            <p className="text-sm text-gray-500">Peak Hour</p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-12"></div>
              {hours.filter((_, i) => i % 4 === 0).map(hour => (
                <div
                  key={hour}
                  className="flex-1 text-xs text-gray-500 text-center"
                  style={{ minWidth: '40px' }}
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {days.map((day, dayIndex) => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-12 text-xs text-gray-600 font-medium">{day}</div>
                <div className="flex flex-1 gap-1">
                  {hours.map(hour => {
                    const cell = heatmapData.find(
                      c => c.day === day && c.hour === hour
                    );
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="flex-1 aspect-square rounded transition-all duration-200 hover:ring-2 hover:ring-blue-400 cursor-pointer group relative"
                        style={{
                          backgroundColor: getColor(cell?.intensity || 0),
                          minWidth: '10px'
                        }}
                        title={`${day} ${hour}:00 - ${cell?.count || 0} commits`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {day} {hour}:00
                          <br />
                          <strong>{cell?.count || 0}</strong> commits
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Activity intensity:</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Less</span>
              <div className="flex space-x-1">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getColor(intensity) }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">More</span>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default ActivityHeatmap;
