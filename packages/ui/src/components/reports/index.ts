// Export types
export type {
  ReportId,
  ReportTypeId,
  MetricId,
  ReportStatus,
  ReportFrequency,
  MetricType,
  ReportType,
  ReportSubmission,
  ReportContent,
  ReportMetric,
  WeekPeriod,
  WeekComparison,
  MetricComparison,
  AnalyticsSummary,
  DepartmentMetrics,
  SubmissionTracking,
} from './types';

export {
  REPORT_STATUS_CONFIG,
  getCurrentWeekPeriod,
  getWeekNumber,
  formatPeriodLabel,
  calculateTotalExpenditure,
  calculateTotalResults,
  calculateROI,
} from './types';

// Export core components
export { ReportStatusBadge } from './ReportStatusBadge';
export { WeekSelector, WeekDropdownSelector } from './WeekSelector';
export { MetricInput, MetricInputGroup } from './MetricInput';
export { ReportCard, ReportList } from './ReportCard';
export { ReportSummaryCards } from './ReportSummaryCards';
export { ReportForm } from './ReportForm';

// Export admin components
export { ReportSubmissionList } from './ReportSubmissionList';
export { SubmissionRateCard } from './SubmissionRateCard';
export { WeekComparisonTable } from './WeekComparisonTable';

// Export analytics components
export { ExpenditureVsResultsChart } from './analytics/ExpenditureVsResultsChart';
export { SpendByCategoryChart } from './analytics/SpendByCategoryChart';
export { ROIByDepartmentChart } from './analytics/ROIByDepartmentChart';
export { WeeklyTrendsChart } from './analytics/WeeklyTrendsChart';

// Export new UI/UX components
export { MetricKPICard, MetricKPICardGrid } from './MetricKPICard';
export type { MetricKPICardProps } from './MetricKPICard';
export { InsightsSummary, InsightsSummaryList } from './InsightsSummary';
export type { InsightsSummaryProps, KeyFinding } from './InsightsSummary';
