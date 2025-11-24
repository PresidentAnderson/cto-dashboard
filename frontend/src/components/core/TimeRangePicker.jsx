/**
 * TimeRangePicker Component
 * Date range selection with presets
 *
 * Features:
 * - Quick presets (7d, 30d, 90d, 1y)
 * - Custom date range
 * - Accessible
 */

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

const presets = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last year', value: 365 },
];

export default function TimeRangePicker({
  value,
  onChange,
  className,
  showCustomRange = false,
  ...props
}) {
  const [customMode, setCustomMode] = useState(false);

  const handlePresetClick = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    onChange({ startDate, endDate, preset: days });
    setCustomMode(false);
  };

  const getActivePreset = () => {
    return value?.preset || null;
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      {presets.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          variant={getActivePreset() === preset.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      {showCustomRange && (
        <Button
          type="button"
          variant={customMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCustomMode(!customMode)}
        >
          Custom Range
        </Button>
      )}

      {customMode && showCustomRange && (
        <div className="w-full flex gap-2 mt-2">
          <input
            type="date"
            value={value?.startDate?.toISOString().split('T')[0] || ''}
            onChange={(e) => {
              const startDate = new Date(e.target.value);
              onChange({ ...value, startDate, preset: null });
            }}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Start date"
          />
          <span className="self-center text-gray-500">to</span>
          <input
            type="date"
            value={value?.endDate?.toISOString().split('T')[0] || ''}
            onChange={(e) => {
              const endDate = new Date(e.target.value);
              onChange({ ...value, endDate, preset: null });
            }}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="End date"
          />
        </div>
      )}
    </div>
  );
}
