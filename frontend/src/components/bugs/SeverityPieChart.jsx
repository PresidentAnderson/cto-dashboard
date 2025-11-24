/**
 * SeverityPieChart Component
 * Bug distribution by severity visualization
 *
 * Features:
 * - Interactive pie chart
 * - Legend with counts
 * - Responsive
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

const COLORS = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#2563EB',
};

export default function SeverityPieChart({ bugs = [], className }) {
  const severityCounts = bugs.reduce((acc, bug) => {
    const severity = bug.severity || 'low';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(severityCounts).map(([severity, count]) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: count,
    color: COLORS[severity] || COLORS.low,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / bugs.length) * 100).toFixed(1);
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} bugs ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.value}: <span className="font-semibold">{entry.payload.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (bugs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Bug Distribution by Severity</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No bugs to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bug Distribution by Severity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
