// Branded Types for Type Safety
export type ReportId = string & { __brand: 'ReportId' };
export type ReportTypeId = string & { __brand: 'ReportTypeId' };
export type MetricId = string & { __brand: 'MetricId' };

// Report Types
export type ReportStatus = 'draft' | 'submitted' | 'reviewed';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type MetricType = 'expenditure' | 'result' | 'roi';

export interface ReportType {
  id: ReportTypeId;
  name: string;
  description: string;
  frequency: ReportFrequency;
  deadlineDay: number; // 1-7 (Monday-Sunday)
  deadlineTime: string; // HH:MM format
  requiredRoles: Array<string>;
}

export interface ReportSubmission {
  id: ReportId;
  reportTypeId: ReportTypeId;
  reportTypeName: string;
  submitterId: string;
  submitterName: string;
  submitterDepartment: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  content: ReportContent;
  filePaths: Array<string>;
  status: ReportStatus;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportContent {
  summary: string;
  accomplishments: Array<string>;
  challenges: Array<string>;
  nextWeekPlans: Array<string>;
  metrics: Array<ReportMetric>;
  notes?: string;
}

export interface ReportMetric {
  id: string;
  type: MetricType;
  name: string;
  value: number;
  unit: string;
  category: string;
}

export interface WeekPeriod {
  weekNumber: number;
  year: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  label: string; // e.g., "Week 5, 2026"
}

export interface WeekComparison {
  currentWeek: WeekPeriod;
  previousWeek: WeekPeriod;
  metrics: Array<MetricComparison>;
}

export interface MetricComparison {
  name: string;
  category: string;
  unit?: string | null;
  currentValue: number;
  previousValue: number;
  change: number; // Absolute change
  changePercent: number; // Percentage change
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsSummary {
  totalSubmissions: number;
  submissionRate: number; // percentage
  totalExpenditure: number;
  totalResults: number;
  averageROI: number;
  byDepartment: Array<DepartmentMetrics>;
}

export interface DepartmentMetrics {
  department: string;
  submissions: number;
  expenditure: number;
  results: number;
  roi: number;
}

export interface SubmissionTracking {
  totalStaff: number;
  submitted: number;
  pending: number;
  submissionRate: number;
  weekPeriod: WeekPeriod;
}

// Status Configuration
export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; variant: 'secondary' | 'warning' | 'success' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'warning' },
  reviewed: { label: 'Reviewed', variant: 'success' },
};

// Week Calculation Utilities
export function getCurrentWeekPeriod(): WeekPeriod {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Monday start

  const startDate = new Date(today);
  startDate.setDate(today.getDate() + diff);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const weekNumber = getWeekNumber(startDate);
  const year = startDate.getFullYear();

  return {
    weekNumber,
    year,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    label: `Week ${weekNumber}, ${year}`,
  };
}

export function getWeekNumber(date: Date): number {
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
}

export function formatPeriodLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

export function calculateTotalExpenditure(metrics: Array<ReportMetric>): number {
  return metrics.filter((m) => m.type === 'expenditure').reduce((sum, m) => sum + m.value, 0);
}

export function calculateTotalResults(metrics: Array<ReportMetric>): number {
  return metrics
    .filter((m) => m.type === 'result' && m.unit === 'PHP')
    .reduce((sum, m) => sum + m.value, 0);
}

export function calculateROI(expenditure: number, results: number): number {
  if (expenditure === 0) return 0;
  return ((results - expenditure) / expenditure) * 100;
}
