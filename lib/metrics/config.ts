/**
 * Metrics Engine Configuration
 *
 * Centralized configuration for all metrics calculations including
 * hourly rates, risk weights, cache TTL, and calculation parameters.
 */

export interface MetricsConfig {
  /** Standard engineering hourly rate for cost calculations */
  hourlyRate: number;

  /** Risk scoring weights (must sum to 100) */
  riskWeights: {
    criticalBugs: number;
    stalledPRs: number;
    lowActivity: number;
    overdueMilestones: number;
  };

  /** Cache TTL in milliseconds */
  cacheTTL: number;

  /** Velocity calculation parameters */
  velocity: {
    /** Days to look back for velocity calculations */
    lookbackDays: number;
    /** Minimum commits to consider project active */
    minimumCommitsThreshold: number;
  };

  /** Bug cost calculation parameters */
  bugCost: {
    /** Critical bug multiplier */
    criticalMultiplier: number;
    /** High bug multiplier */
    highMultiplier: number;
    /** Medium bug multiplier */
    mediumMultiplier: number;
    /** Low bug multiplier */
    lowMultiplier: number;
  };

  /** Revenue at risk calculation */
  revenueRisk: {
    /** Days to project revenue loss */
    projectionDays: number;
    /** Blocker bug multiplier */
    blockerMultiplier: number;
  };
}

/**
 * Default metrics configuration
 * Can be overridden via environment variables
 */
export const defaultConfig: MetricsConfig = {
  hourlyRate: Number(process.env.METRICS_HOURLY_RATE) || 150,

  riskWeights: {
    criticalBugs: 40,      // 40% weight
    stalledPRs: 25,        // 25% weight
    lowActivity: 20,       // 20% weight
    overdueMilestones: 15, // 15% weight
  },

  cacheTTL: 5 * 60 * 1000, // 5 minutes

  velocity: {
    lookbackDays: 30,
    minimumCommitsThreshold: 5,
  },

  bugCost: {
    criticalMultiplier: 3.0,
    highMultiplier: 2.0,
    mediumMultiplier: 1.0,
    lowMultiplier: 0.5,
  },

  revenueRisk: {
    projectionDays: 30,
    blockerMultiplier: 2.0,
  },
};

/**
 * Validate configuration to ensure weights sum correctly
 */
export function validateConfig(config: MetricsConfig): boolean {
  const weightSum =
    config.riskWeights.criticalBugs +
    config.riskWeights.stalledPRs +
    config.riskWeights.lowActivity +
    config.riskWeights.overdueMilestones;

  if (Math.abs(weightSum - 100) > 0.01) {
    throw new Error(`Risk weights must sum to 100, got ${weightSum}`);
  }

  return true;
}

// Validate default config on module load
validateConfig(defaultConfig);

/**
 * Get current metrics configuration
 * Can be extended to support dynamic config loading
 */
export function getConfig(): MetricsConfig {
  return defaultConfig;
}
