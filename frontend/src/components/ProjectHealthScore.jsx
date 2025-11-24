/**
 * ProjectHealthScore Component
 * Visual health indicator with detailed breakdown
 * Calculates health score based on multiple factors
 */

import React, { useState } from 'react';

const ProjectHealthScore = ({
  project,
  recentCommits = 0,
  issueCount = 0,
  stars = 0,
  lastUpdateDays = 0,
  codeCoverage = null,
  showDetails = true
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  /**
   * Health Score Calculation (0-100)
   * - Recency Score (40%): Based on days since last update
   * - Activity Score (30%): Based on recent commits
   * - Stars Score (30%): Normalized stars count
   */
  const calculateHealthScore = () => {
    // Recency Score (40 points max)
    let recencyScore = 0;
    if (lastUpdateDays <= 7) recencyScore = 40;
    else if (lastUpdateDays <= 30) recencyScore = 30;
    else if (lastUpdateDays <= 90) recencyScore = 20;
    else if (lastUpdateDays <= 180) recencyScore = 10;
    else recencyScore = 0;

    // Activity Score (30 points max)
    let activityScore = 0;
    if (recentCommits >= 50) activityScore = 30;
    else if (recentCommits >= 20) activityScore = 25;
    else if (recentCommits >= 10) activityScore = 20;
    else if (recentCommits >= 5) activityScore = 15;
    else if (recentCommits >= 1) activityScore = 10;
    else activityScore = 0;

    // Stars Score (30 points max) - logarithmic scale
    let starsScore = 0;
    if (stars >= 1000) starsScore = 30;
    else if (stars >= 500) starsScore = 25;
    else if (stars >= 100) starsScore = 20;
    else if (stars >= 50) starsScore = 15;
    else if (stars >= 10) starsScore = 10;
    else if (stars >= 1) starsScore = 5;
    else starsScore = 0;

    // Bonus/Penalty for issues
    let issuesPenalty = 0;
    if (issueCount > 20) issuesPenalty = -10;
    else if (issueCount > 10) issuesPenalty = -5;

    // Bonus for code coverage
    let coverageBonus = 0;
    if (codeCoverage !== null) {
      if (codeCoverage >= 80) coverageBonus = 10;
      else if (codeCoverage >= 60) coverageBonus = 5;
    }

    const totalScore = Math.max(0, Math.min(100,
      recencyScore + activityScore + starsScore + issuesPenalty + coverageBonus
    ));

    return {
      total: Math.round(totalScore),
      breakdown: {
        recency: recencyScore,
        activity: activityScore,
        stars: starsScore,
        issuesPenalty,
        coverageBonus
      }
    };
  };

  const { total: healthScore, breakdown } = calculateHealthScore();

  // Determine health level and colors
  const getHealthLevel = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'green', emoji: '🟢' };
    if (score >= 60) return { level: 'Good', color: 'blue', emoji: '🔵' };
    if (score >= 40) return { level: 'Fair', color: 'yellow', emoji: '🟡' };
    if (score >= 20) return { level: 'Poor', color: 'orange', emoji: '🟠' };
    return { level: 'Critical', color: 'red', emoji: '🔴' };
  };

  const health = getHealthLevel(healthScore);

  // Color gradient for progress bar
  const getGradientColor = (score) => {
    if (score >= 80) return 'from-green-400 to-green-600';
    if (score >= 60) return 'from-blue-400 to-blue-600';
    if (score >= 40) return 'from-yellow-400 to-yellow-600';
    if (score >= 20) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  // Background color
  const getBgColor = (color) => {
    const colors = {
      green: 'bg-green-50 border-green-200',
      blue: 'bg-blue-50 border-blue-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 ${getBgColor(health.color)} transition-all duration-300`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Health Score
        </h3>
        <span className="text-2xl">{health.emoji}</span>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-4xl font-bold text-gray-900">{healthScore}</div>
        <div className="text-right">
          <div className={`text-lg font-semibold text-${health.color}-700`}>
            {health.level}
          </div>
          <div className="text-xs text-gray-500">out of 100</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full bg-gradient-to-r ${getGradientColor(healthScore)} transition-all duration-500 ease-out`}
          style={{ width: `${healthScore}%` }}
        />
      </div>

      {/* Detailed Breakdown (if enabled) */}
      {showDetails && (
        <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Score Breakdown
          </div>

          {/* Recency */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Recency ({lastUpdateDays} days)
            </span>
            <span className="font-semibold text-gray-900">
              {breakdown.recency}/40
            </span>
          </div>

          {/* Activity */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Activity ({recentCommits} commits)
            </span>
            <span className="font-semibold text-gray-900">
              {breakdown.activity}/30
            </span>
          </div>

          {/* Stars */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Stars ({stars})
            </span>
            <span className="font-semibold text-gray-900">
              {breakdown.stars}/30
            </span>
          </div>

          {/* Issues Penalty */}
          {breakdown.issuesPenalty !== 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-red-600">
                Issues Penalty ({issueCount})
              </span>
              <span className="font-semibold text-red-700">
                {breakdown.issuesPenalty}
              </span>
            </div>
          )}

          {/* Coverage Bonus */}
          {breakdown.coverageBonus !== 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-600">
                Coverage Bonus ({codeCoverage}%)
              </span>
              <span className="font-semibold text-green-700">
                +{breakdown.coverageBonus}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tooltip on hover */}
      {showTooltip && !showDetails && (
        <div className="absolute z-50 mt-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl max-w-xs">
          <div className="font-semibold mb-2">Health Score Factors:</div>
          <ul className="space-y-1">
            <li>Recency: {breakdown.recency}/40 ({lastUpdateDays} days ago)</li>
            <li>Activity: {breakdown.activity}/30 ({recentCommits} commits)</li>
            <li>Stars: {breakdown.stars}/30 ({stars} stars)</li>
            {breakdown.issuesPenalty !== 0 && (
              <li className="text-red-400">Issues: {breakdown.issuesPenalty} ({issueCount} open)</li>
            )}
            {breakdown.coverageBonus !== 0 && (
              <li className="text-green-400">Coverage: +{breakdown.coverageBonus} ({codeCoverage}%)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProjectHealthScore;
