// Branded Types for Type Safety
export type EmployeeId = string & { __brand: 'EmployeeId' };
export type CycleId = string & { __brand: 'CycleId' };
export type OKRId = string & { __brand: 'OKRId' };
export type KeyResultId = string & { __brand: 'KeyResultId' };
export type KPIId = string & { __brand: 'KPIId' };
export type ReviewId = string & { __brand: 'ReviewId' };

// Performance Cycle Types
export type CycleStatus = 'draft' | 'active' | 'closed';

export interface PerformanceCycle {
  id: CycleId;
  name: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  okrSubmissionDeadline?: string;
  kpiSubmissionDeadline?: string;
  selfAssessmentDeadline?: string;
  managerReviewDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

// OKR Types
export type OKRStatus = 'draft' | 'submitted' | 'approved' | 'in_progress' | 'completed';

export interface KeyResult {
  id: KeyResultId;
  okrId: OKRId;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface OKR {
  id: OKRId;
  employeeId: EmployeeId;
  cycleId: CycleId;
  objective: string;
  description?: string;
  status: OKRStatus;
  progressPercentage: number;
  keyResults: Array<KeyResult>;
  createdAt: string;
  updatedAt: string;
}

// KPI Types
export interface KPI {
  id: KPIId;
  employeeId: EmployeeId;
  cycleId: CycleId;
  name: string;
  description?: string;
  target: number;
  actual: number;
  unit: string;
  weight: number;
  score: number;
  createdAt: string;
  updatedAt: string;
}

// Performance Review Types
export type ReviewStatus = 'pending_self' | 'pending_manager' | 'pending_hr' | 'completed';
export type PerformanceRating =
  | 'exceptional'
  | 'exceeds'
  | 'meets'
  | 'needs_improvement'
  | 'unsatisfactory';

export interface PerformanceReview {
  id: ReviewId;
  employeeId: EmployeeId;
  cycleId: CycleId;
  selfAssessment?: string;
  selfRating?: PerformanceRating;
  managerAssessment?: string;
  managerRating?: PerformanceRating;
  hrComments?: string;
  finalRating?: PerformanceRating;
  status: ReviewStatus;
  selfSubmittedAt?: string;
  managerSubmittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Employee Performance Summary
export interface EmployeePerformanceSummary {
  employeeId: EmployeeId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  manager: string;
  managerId: EmployeeId;
  avatarUrl?: string;
  currentCycle: PerformanceCycle;
  okrProgress: number;
  kpiProgress: number;
  reviewStatus: ReviewStatus;
  overallScore?: number;
  okrCount: number;
  kpiCount: number;
}

// Dashboard Summary Stats
export interface PerformanceDashboardStats {
  totalEmployees: number;
  okrsCompleted: number;
  okrsInProgress: number;
  kpisOnTarget: number;
  kpisBelowTarget: number;
  reviewsPendingSelf: number;
  reviewsPendingManager: number;
  reviewsCompleted: number;
  averageOkrProgress: number;
  averageKpiScore: number;
}

// Chart Data Types
export interface CompletionTrendData {
  month: string;
  okrsCompleted: number;
  kpisCompleted: number;
  reviewsCompleted: number;
}

export interface DepartmentPerformanceData {
  department: string;
  averageOkrProgress: number;
  averageKpiScore: number;
  employeeCount: number;
}

export interface RatingDistributionData {
  rating: PerformanceRating;
  count: number;
  percentage: number;
}

// Filter Types
export interface PerformanceFilters {
  department?: string;
  manager?: EmployeeId;
  status?: ReviewStatus;
  cycleId?: CycleId;
  search?: string;
}

// Status Configuration
export const REVIEW_STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; variant: 'warning' | 'secondary' | 'success' | 'error' }
> = {
  pending_self: { label: 'Pending Self-Assessment', variant: 'warning' },
  pending_manager: { label: 'Pending Manager Review', variant: 'secondary' },
  pending_hr: { label: 'Pending HR Review', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'success' },
};

export const OKR_STATUS_CONFIG: Record<
  OKRStatus,
  { label: string; variant: 'secondary' | 'warning' | 'success' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
};

export const RATING_CONFIG: Record<
  PerformanceRating,
  { label: string; description: string; color: string; score: number }
> = {
  exceptional: {
    label: 'Exceptional',
    description: 'Consistently exceeds all expectations and delivers outstanding results',
    color: 'bg-emerald-500',
    score: 5,
  },
  exceeds: {
    label: 'Exceeds Expectations',
    description: 'Frequently exceeds expectations and delivers high-quality work',
    color: 'bg-green-500',
    score: 4,
  },
  meets: {
    label: 'Meets Expectations',
    description: 'Consistently meets job requirements and expectations',
    color: 'bg-blue-500',
    score: 3,
  },
  needs_improvement: {
    label: 'Needs Improvement',
    description: 'Performance is below expectations in some areas',
    color: 'bg-yellow-500',
    score: 2,
  },
  unsatisfactory: {
    label: 'Unsatisfactory',
    description: 'Performance is significantly below expectations',
    color: 'bg-red-500',
    score: 1,
  },
};
