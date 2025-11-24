/**
 * ProjectRiskWidget Component
 * Risk score display with breakdown
 *
 * Features:
 * - Visual risk score (0-100)
 * - Color-coded indicator
 * - Risk factors breakdown
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export default function ProjectRiskWidget({
  riskScore = 0,
  riskFactors = [],
  className,
  ...props
}) {
  const getRiskLevel = (score) => {
    if (score >= 80) return { label: 'Critical', color: 'text-red-600 bg-red-50' };
    if (score >= 60) return { label: 'High', color: 'text-orange-600 bg-orange-50' };
    if (score >= 40) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    if (score >= 20) return { label: 'Low', color: 'text-blue-600 bg-blue-50' };
    return { label: 'Minimal', color: 'text-green-600 bg-green-50' };
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const risk = getRiskLevel(riskScore);

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader>
        <CardTitle className="text-base">Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score Circle */}
        <div className="flex items-center justify-center">
          <div className={cn('relative w-32 h-32 rounded-full', risk.color)}>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {riskScore}
                </div>
                <div className="text-xs text-gray-600">Risk Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Level Badge */}
        <div className="flex justify-center">
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
              risk.color
            )}
          >
            {risk.label} Risk
          </span>
        </div>

        {/* Risk Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Risk Level</span>
            <span>{riskScore}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', getRiskColor(riskScore))}
              style={{ width: `${riskScore}%` }}
              role="progressbar"
              aria-valuenow={riskScore}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Risk Factors */}
        {riskFactors && riskFactors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Risk Factors</h4>
            <ul className="space-y-1">
              {riskFactors.map((factor, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
