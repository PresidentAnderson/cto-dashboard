/**
 * Charts & Analytics Components
 * Executive-grade data visualizations for CTO Dashboard v2.0
 */

// Engineering Velocity Charts
export { default as CommitsLineChart } from './CommitsLineChart';
export { default as PRsBarChart } from './PRsBarChart';
export { default as ActivityHeatmap } from './ActivityHeatmap';

// Quality Metrics Charts
export { default as BugSeverityPieChart } from './BugSeverityPieChart';
export { default as BugTrendLine } from './BugTrendLine';
export { default as BugAgeHistogram } from './BugAgeHistogram';

// Cost & Risk Charts
export { default as CostAreaChart } from './CostAreaChart';
export { default as RevenueAtRiskBar } from './RevenueAtRiskBar';
export { default as BurndownChart } from './BurndownChart';

// Portfolio Charts
export { default as ProjectBubbleChart } from './ProjectBubbleChart';
export { default as HealthRadarChart } from './HealthRadarChart';
export { default as CategoryDistribution } from './CategoryDistribution';

// Dashboard Overview Components
export { default as MiniSparkline } from './MiniSparkline';
export { default as ProgressRing, MultiProgressRing } from './ProgressRing';
export { default as ComparisonBar, CompactComparison, MultiComparison } from './ComparisonBar';

// Utilities
export {
  ChartContainer,
  CustomTooltip,
  ChartLoadingSkeleton,
  ChartEmptyState,
  exportChartAsPNG,
  exportChartAsSVG,
  CHART_COLORS,
  formatCurrency,
  formatNumber,
  formatPercentage
} from './ChartUtils';

// Data Transformers
export * from '../../lib/chart-data-transformers';
