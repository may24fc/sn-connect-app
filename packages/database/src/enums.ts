/**
 * Enum Constants
 *
 * Provides const objects for database enums that can be used as values at runtime.
 * These complement the type definitions in type-helpers.ts
 */

// ============================================
// User Role Enum (Simplified)
// ============================================
// Role consolidation:
//   - admin: Admin + HR management (was: admin, hr)
//   - super_admin: Executive/COS/CEO functions (was: cos, ceo, super_admin)
//   - employee: Regular employee
//   - intern: Intern-level access

export const UserRole = {
  Employee: 'employee',
  Intern: 'intern',
  Admin: 'admin',
  SuperAdmin: 'super_admin',
} as const;

export const UserRoleValues = Object.values(UserRole);

// ============================================
// User Status Enum
// ============================================

export const UserStatus = {
  Active: 'active',
  OnLeave: 'on_leave',
  Terminated: 'terminated',
} as const;

export const UserStatusValues = Object.values(UserStatus);

// ============================================
// Employment Type Enum
// ============================================

export const EmploymentType = {
  Regular: 'regular',
  Probationary: 'probationary',
  Intern: 'intern',
  ProjectBased: 'project_based',
} as const;

export const EmploymentTypeValues = Object.values(EmploymentType);

// ============================================
// Work Arrangement Enum
// ============================================

export const WorkArrangement = {
  PartTime: 'part_time',
  FullTime: 'full_time',
} as const;

export const WorkArrangementValues = Object.values(WorkArrangement);

// ============================================
// Document Type Enum
// ============================================

export const DocumentType = {
  Contract: 'contract',
  ID: 'id',
  Certificate: 'certificate',
  PerformanceReview: 'performance_review',
  Resume: 'resume',
  MedicalRecord: 'medical_record',
  TaxDocument: 'tax_document',
  NDA: 'nda',
  HandbookAcknowledgment: 'handbook_acknowledgment',
  Other: 'other',
} as const;

export const DocumentTypeValues = Object.values(DocumentType);

// ============================================
// Task Status Enum
// ============================================

export const TaskStatus = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export const TaskStatusValues = Object.values(TaskStatus);

// ============================================
// Task Priority Enum
// ============================================

export const TaskPriority = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Urgent: 'urgent',
} as const;

export const TaskPriorityValues = Object.values(TaskPriority);

// ============================================
// Announcement Category Enum
// ============================================

export const AnnouncementCategory = {
  HRUpdates: 'hr_updates',
  Benefits: 'benefits',
  Events: 'events',
  Performance: 'performance',
  Training: 'training',
  Policy: 'policy',
  General: 'general',
  Emergency: 'emergency',
} as const;

export const AnnouncementCategoryValues = Object.values(AnnouncementCategory);

// ============================================
// Announcement Priority Enum
// ============================================

export const AnnouncementPriority = {
  Low: 'low',
  Normal: 'normal',
  High: 'high',
  Urgent: 'urgent',
} as const;

export const AnnouncementPriorityValues = Object.values(AnnouncementPriority);

// ============================================
// Announcement Status Enum
// ============================================

export const AnnouncementStatus = {
  Draft: 'draft',
  Scheduled: 'scheduled',
  Published: 'published',
  Expired: 'expired',
  Archived: 'archived',
} as const;

export const AnnouncementStatusValues = Object.values(AnnouncementStatus);

// ============================================
// Onboarding Document Type Enum
// ============================================

export const OnboardingDocumentType = {
  ValidID: 'valid_id',
  ProfilePhoto: 'profile_photo',
  CV: 'cv',
  BirthCertificate: 'birth_certificate',
} as const;

export const OnboardingDocumentTypeValues = Object.values(OnboardingDocumentType);

// ============================================
// Onboarding Step Enum
// ============================================

export const OnboardingStep = {
  PersonalInfo: 'personal_info',
  PaymentInfo: 'payment_info',
  Documents: 'documents',
  Review: 'review',
} as const;

export const OnboardingStepValues = Object.values(OnboardingStep);

// ============================================
// Review Cycle Status Enum
// ============================================

export const ReviewCycleStatus = {
  Draft: 'draft',
  Active: 'active',
  Completed: 'completed',
  Archived: 'archived',
} as const;

export const ReviewCycleStatusValues = Object.values(ReviewCycleStatus);

// ============================================
// Review Status Enum
// ============================================

export const ReviewStatus = {
  Pending: 'pending',
  SelfReview: 'self_review',
  ManagerReview: 'manager_review',
  Completed: 'completed',
} as const;

export const ReviewStatusValues = Object.values(ReviewStatus);
