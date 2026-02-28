// Branded Types for Type Safety
export type InternId = string & { __brand: 'InternId' };
export type InternshipPeriodId = string & { __brand: 'InternshipPeriodId' };
export type DailyReportId = string & { __brand: 'DailyReportId' };
export type SupervisorId = string & { __brand: 'SupervisorId' };

// Internship Status Types
export type InternshipStatus = 'active' | 'completed' | 'terminated' | 'on_hold';
export type ReportStatus = 'submitted' | 'reviewed' | 'needs_revision';

// Internship Period
export interface InternshipPeriod {
  id: InternshipPeriodId;
  employeeId: InternId;
  startDate: string;
  endDate: string;
  school: string;
  program: string;
  requiredHours: number;
  completedHours: number;
  supervisorId: SupervisorId;
  supervisorName: string;
  status: InternshipStatus;
  createdAt: string;
  updatedAt: string;
}

// Daily Report
export interface DailyReport {
  id: DailyReportId;
  internId: InternId;
  internshipPeriodId: InternshipPeriodId;
  date: string;
  tasksCompleted: string;
  hoursLogged: number;
  learnings: string;
  challenges?: string;
  supervisorFeedback?: string;
  status: ReportStatus;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Intern Profile
export interface Intern {
  id: InternId;
  name: string;
  email: string;
  avatarUrl?: string;
  school: string;
  program: string;
  department: string;
  supervisor: string;
  supervisorId: SupervisorId;
  internshipPeriod: InternshipPeriod;
  recentReports: Array<DailyReport>;
}

// Intern Summary for Lists
export interface InternSummary {
  id: InternId;
  name: string;
  email: string;
  avatarUrl?: string;
  school: string;
  program: string;
  department: string;
  supervisor: string;
  supervisorId: SupervisorId;
  startDate: string;
  endDate: string;
  requiredHours: number;
  completedHours: number;
  progressPercentage: number;
  status: InternshipStatus;
  lastReportDate?: string;
  pendingReports: number;
}

// Dashboard Stats
export interface InternDashboardStats {
  totalInterns: number;
  activeInterns: number;
  completedInterns: number;
  averageProgress: number;
  totalHoursLogged: number;
  pendingReports: number;
  reportsThisWeek: number;
}

// Weekly Hours Summary
export interface WeeklyHoursSummary {
  weekStart: string;
  weekEnd: string;
  hoursLogged: number;
  reportsSubmitted: number;
}

// Filter Types
export interface InternFilters {
  supervisor?: SupervisorId;
  school?: string;
  status?: InternshipStatus;
  search?: string;
}

// EOD Report Form Data
export interface EODReportFormData {
  date: string;
  hoursLogged: number;
  tasksCompleted: string;
  challenges?: string;
  focusTomorrow?: string;
}

// Status Configuration
export const INTERNSHIP_STATUS_CONFIG: Record<
  InternshipStatus,
  { label: string; variant: 'success' | 'secondary' | 'error' | 'warning' }
> = {
  active: { label: 'Active', variant: 'success' },
  completed: { label: 'Completed', variant: 'secondary' },
  terminated: { label: 'Terminated', variant: 'error' },
  on_hold: { label: 'On Hold', variant: 'warning' },
};

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; variant: 'success' | 'warning' | 'error' }
> = {
  submitted: { label: 'Submitted', variant: 'warning' },
  reviewed: { label: 'Reviewed', variant: 'success' },
  needs_revision: { label: 'Needs Revision', variant: 'error' },
};

// Helper function to calculate progress
export function calculateHoursProgress(completed: number, required: number): number {
  if (required <= 0) return 0;
  return Math.min(Math.round((completed / required) * 100), 100);
}

// Helper function to get days remaining
export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Helper function to check if intern is on track
export function isOnTrack(
  completedHours: number,
  requiredHours: number,
  startDate: string,
  endDate: string
): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (totalDays <= 0 || daysElapsed <= 0) return true;

  const expectedProgress = (daysElapsed / totalDays) * requiredHours;
  return completedHours >= expectedProgress * 0.9; // 90% threshold
}
