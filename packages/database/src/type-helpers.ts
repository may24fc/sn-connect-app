/**
 * Type Helpers - Convenient aliases for database types
 *
 * Provides direct access to table Row, Insert, and Update types
 * without needing to use the generic Tables<>, TablesInsert<>, TablesUpdate<> helpers.
 */

import type { Tables, TablesInsert, TablesUpdate } from './database.types';

// ============================================
// Table Row Types (SELECT queries)
// ============================================

export type User = Tables<'users'>;
export type Employee = Tables<'employees'>;
export type Department = Tables<'departments'>;
export type Division = Tables<'divisions'>;
export type Document = Tables<'documents'>;
export type AuditLog = Tables<'audit_logs'>;
export type Task = Tables<'tasks'>;
export type TaskComment = Tables<'task_comments'>;
export type OnboardingProfile = Tables<'onboarding_profiles'>;
export type OnboardingDocument = Tables<'onboarding_documents'>;
export type Announcement = Tables<'announcements'>;
export type AnnouncementComment = Tables<'announcement_comments'>;
export type AnnouncementAttachment = Tables<'announcement_attachments'>;
export type AnnouncementRead = Tables<'announcement_reads'>;
export type Resource = Tables<'resources'>;
export type ResourceBookmark = Tables<'resource_bookmarks'>;
export type ResourceView = Tables<'resource_views'>;
export type ReviewCycle = Tables<'review_cycles'>;
export type PerformanceReview = Tables<'performance_reviews'>;
export type Okr = Tables<'okrs'>;
export type Kpi = Tables<'kpis'>;

// ============================================
// Table Insert Types (INSERT queries)
// ============================================

export type UserInsert = TablesInsert<'users'>;
export type EmployeeInsert = TablesInsert<'employees'>;
export type DepartmentInsert = TablesInsert<'departments'>;
export type DivisionInsert = TablesInsert<'divisions'>;
export type DocumentInsert = TablesInsert<'documents'>;
export type AuditLogInsert = TablesInsert<'audit_logs'>;
export type TaskInsert = TablesInsert<'tasks'>;
export type TaskCommentInsert = TablesInsert<'task_comments'>;
export type OnboardingProfileInsert = TablesInsert<'onboarding_profiles'>;
export type OnboardingDocumentInsert = TablesInsert<'onboarding_documents'>;
export type AnnouncementInsert = TablesInsert<'announcements'>;
export type AnnouncementCommentInsert = TablesInsert<'announcement_comments'>;
export type AnnouncementAttachmentInsert = TablesInsert<'announcement_attachments'>;
export type AnnouncementReadInsert = TablesInsert<'announcement_reads'>;
export type ResourceInsert = TablesInsert<'resources'>;
export type ResourceBookmarkInsert = TablesInsert<'resource_bookmarks'>;
export type ResourceViewInsert = TablesInsert<'resource_views'>;
export type ReviewCycleInsert = TablesInsert<'review_cycles'>;
export type PerformanceReviewInsert = TablesInsert<'performance_reviews'>;
export type OkrInsert = TablesInsert<'okrs'>;
export type KpiInsert = TablesInsert<'kpis'>;

// ============================================
// Table Update Types (UPDATE queries)
// ============================================

export type UserUpdate = TablesUpdate<'users'>;
export type EmployeeUpdate = TablesUpdate<'employees'>;
export type DepartmentUpdate = TablesUpdate<'departments'>;
export type DivisionUpdate = TablesUpdate<'divisions'>;
export type DocumentUpdate = TablesUpdate<'documents'>;
export type AuditLogUpdate = TablesUpdate<'audit_logs'>;
export type TaskUpdate = TablesUpdate<'tasks'>;
export type TaskCommentUpdate = TablesUpdate<'task_comments'>;
export type OnboardingProfileUpdate = TablesUpdate<'onboarding_profiles'>;
export type OnboardingDocumentUpdate = TablesUpdate<'onboarding_documents'>;
export type AnnouncementUpdate = TablesUpdate<'announcements'>;
export type AnnouncementCommentUpdate = TablesUpdate<'announcement_comments'>;
export type AnnouncementAttachmentUpdate = TablesUpdate<'announcement_attachments'>;
export type AnnouncementReadUpdate = TablesUpdate<'announcement_reads'>;
export type ResourceUpdate = TablesUpdate<'resources'>;
export type ResourceBookmarkUpdate = TablesUpdate<'resource_bookmarks'>;
export type ResourceViewUpdate = TablesUpdate<'resource_views'>;
export type ReviewCycleUpdate = TablesUpdate<'review_cycles'>;
export type PerformanceReviewUpdate = TablesUpdate<'performance_reviews'>;
export type OkrUpdate = TablesUpdate<'okrs'>;
export type KpiUpdate = TablesUpdate<'kpis'>;

// ============================================
// Enum Types
// ============================================
// NOTE: Enum type aliases are not exported here to avoid conflicts with
// the const enum objects in enums.ts. The const objects can be used for both
// types and values. If you need the raw type, import directly:
// import type { Enums } from '@hr-portal/database';
// type UserRole = Enums<'user_role'>;
