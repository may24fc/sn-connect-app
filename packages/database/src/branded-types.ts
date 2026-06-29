/**
 * Branded Types for Type-Safe IDs
 *
 * Prevents accidentally mixing up different ID types (e.g., passing an EmployeeId where a UserId is expected).
 * The __brand property is a phantom type that only exists at compile time.
 */

// ============================================
// Branded Type Definitions
// ============================================

export type UserId = string & { readonly __brand: 'UserId' };
export type EmployeeId = string & { readonly __brand: 'EmployeeId' };
export type ExpenseId = string & { readonly __brand: 'ExpenseId' };
export type DepartmentId = string & { readonly __brand: 'DepartmentId' };
export type DocumentId = string & { readonly __brand: 'DocumentId' };
export type TaskId = string & { readonly __brand: 'TaskId' };
export type ReportId = string & { readonly __brand: 'ReportId' };
export type ResourceId = string & { readonly __brand: 'ResourceId' };
export type AnnouncementId = string & { readonly __brand: 'AnnouncementId' };
export type ReviewCycleId = string & { readonly __brand: 'ReviewCycleId' };
export type PerformanceReviewId = string & { readonly __brand: 'PerformanceReviewId' };
export type OkrId = string & { readonly __brand: 'OkrId' };
export type KpiId = string & { readonly __brand: 'KpiId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type ProjectMilestoneId = string & { readonly __brand: 'ProjectMilestoneId' };
export type ProjectChecklistItemId = string & { readonly __brand: 'ProjectChecklistItemId' };

// ============================================
// Brand Helper Functions
// ============================================

/**
 * Brands a string as a UserId.
 * Use this when you have a validated UUID string from the database.
 */
export function brandUserId(id: string): UserId {
  return id as UserId;
}

/**
 * Brands a string as an EmployeeId.
 */
export function brandEmployeeId(id: string): EmployeeId {
  return id as EmployeeId;
}

/**
 * Brands a string as an ExpenseId.
 */
export function brandExpenseId(id: string): ExpenseId {
  return id as ExpenseId;
}

/**
 * Brands a string as a DepartmentId.
 */
export function brandDepartmentId(id: string): DepartmentId {
  return id as DepartmentId;
}

/**
 * Brands a string as a DocumentId.
 */
export function brandDocumentId(id: string): DocumentId {
  return id as DocumentId;
}

/**
 * Brands a string as a TaskId.
 */
export function brandTaskId(id: string): TaskId {
  return id as TaskId;
}

/**
 * Brands a string as a ReportId.
 */
export function brandReportId(id: string): ReportId {
  return id as ReportId;
}

/**
 * Brands a string as a ResourceId.
 */
export function brandResourceId(id: string): ResourceId {
  return id as ResourceId;
}

/**
 * Brands a string as an AnnouncementId.
 */
export function brandAnnouncementId(id: string): AnnouncementId {
  return id as AnnouncementId;
}

/**
 * Brands a string as a ReviewCycleId.
 */
export function brandReviewCycleId(id: string): ReviewCycleId {
  return id as ReviewCycleId;
}

/**
 * Brands a string as a PerformanceReviewId.
 */
export function brandPerformanceReviewId(id: string): PerformanceReviewId {
  return id as PerformanceReviewId;
}

/**
 * Brands a string as an OkrId.
 */
export function brandOkrId(id: string): OkrId {
  return id as OkrId;
}

/**
 * Brands a string as a KpiId.
 */
export function brandKpiId(id: string): KpiId {
  return id as KpiId;
}

/**
 * Brands a string as a ProjectId.
 */
export function brandProjectId(id: string): ProjectId {
  return id as ProjectId;
}

/**
 * Brands a string as a ProjectMilestoneId.
 */
export function brandProjectMilestoneId(id: string): ProjectMilestoneId {
  return id as ProjectMilestoneId;
}

/**
 * Brands a string as a ProjectChecklistItemId.
 */
export function brandProjectChecklistItemId(id: string): ProjectChecklistItemId {
  return id as ProjectChecklistItemId;
}

// ============================================
// Unbrand Helper Functions
// ============================================

/**
 * Converts a branded ID back to a plain string.
 * Use this when you need to pass the ID to an API that expects a string.
 */
export function unbrandId<T extends string & { readonly __brand: string }>(id: T): string {
  return id as string;
}
