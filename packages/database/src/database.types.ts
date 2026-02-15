/**
 * Database Types for HR Portal Phase 1
 * Auto-generated TypeScript types for Supabase schema
 *
 * IMPORTANT: These types use branded types for IDs to prevent mixing different entity IDs
 *
 * @generated 2026-01-23
 */

// ============================================
// Branded Types for Type Safety
// ============================================

export type UserId = string & { __brand: 'UserId' };
export type EmployeeId = string & { __brand: 'EmployeeId' };
export type DepartmentId = string & { __brand: 'DepartmentId' };
export type DocumentId = string & { __brand: 'DocumentId' };
export type AuditLogId = string & { __brand: 'AuditLogId' };
export type AnnouncementId = string & { __brand: 'AnnouncementId' };
export type AnnouncementAttachmentId = string & {
  __brand: 'AnnouncementAttachmentId';
};
export type AnnouncementReadId = string & { __brand: 'AnnouncementReadId' };
export type AnnouncementCommentId = string & {
  __brand: 'AnnouncementCommentId';
};
export type ResourceId = string & { __brand: 'ResourceId' };
export type ResourceCollectionId = string & {
  __brand: 'ResourceCollectionId';
};
export type CollectionResourceId = string & {
  __brand: 'CollectionResourceId';
};
export type ResourceBookmarkId = string & { __brand: 'ResourceBookmarkId' };
export type ResourceViewId = string & { __brand: 'ResourceViewId' };
export type OnboardingChecklistId = string & { __brand: 'OnboardingChecklistId' };
export type OnboardingTaskId = string & { __brand: 'OnboardingTaskId' };
export type OnboardingProfileId = string & { __brand: 'OnboardingProfileId' };
export type OnboardingDocumentId = string & { __brand: 'OnboardingDocumentId' };

// Helper to create branded types
export const brandUserId = (id: string): UserId => id as UserId;
export const brandEmployeeId = (id: string): EmployeeId => id as EmployeeId;
export const brandDepartmentId = (id: string): DepartmentId => id as DepartmentId;
export const brandDocumentId = (id: string): DocumentId => id as DocumentId;
export const brandAuditLogId = (id: string): AuditLogId => id as AuditLogId;
export const brandAnnouncementId = (id: string): AnnouncementId => id as AnnouncementId;
export const brandAnnouncementAttachmentId = (id: string): AnnouncementAttachmentId =>
  id as AnnouncementAttachmentId;
export const brandAnnouncementReadId = (id: string): AnnouncementReadId => id as AnnouncementReadId;
export const brandAnnouncementCommentId = (id: string): AnnouncementCommentId =>
  id as AnnouncementCommentId;
export const brandResourceId = (id: string): ResourceId => id as ResourceId;
export const brandResourceCollectionId = (id: string): ResourceCollectionId =>
  id as ResourceCollectionId;
export const brandCollectionResourceId = (id: string): CollectionResourceId =>
  id as CollectionResourceId;
export const brandResourceBookmarkId = (id: string): ResourceBookmarkId => id as ResourceBookmarkId;
export const brandResourceViewId = (id: string): ResourceViewId => id as ResourceViewId;
export const brandOnboardingChecklistId = (id: string): OnboardingChecklistId =>
  id as OnboardingChecklistId;
export const brandOnboardingTaskId = (id: string): OnboardingTaskId => id as OnboardingTaskId;
export const brandOnboardingProfileId = (id: string): OnboardingProfileId =>
  id as OnboardingProfileId;
export const brandOnboardingDocumentId = (id: string): OnboardingDocumentId =>
  id as OnboardingDocumentId;

// ============================================
// Enums
// ============================================

export enum UserRole {
  Admin = 'admin',
  HR = 'hr',
  COS = 'cos',
  CEO = 'ceo',
  SuperAdmin = 'super_admin',
  Employee = 'employee',
  Intern = 'intern',
}

export enum UserStatus {
  Active = 'active',
  OnLeave = 'on_leave',
  Terminated = 'terminated',
}

export enum EmploymentType {
  Regular = 'regular',
  Probationary = 'probationary',
  Intern = 'intern',
  ProjectBased = 'project_based',
}

export enum WorkArrangement {
  PartTime = 'part_time',
  FullTime = 'full_time',
}

export enum DocumentType {
  Contract = 'contract',
  ID = 'id',
  Certificate = 'certificate',
  PerformanceReview = 'performance_review',
  Resume = 'resume',
  MedicalRecord = 'medical_record',
  TaxDocument = 'tax_document',
  NDA = 'nda',
  HandbookAcknowledgment = 'handbook_acknowledgment',
  Other = 'other',
}

export enum AnnouncementPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

export enum AnnouncementStatus {
  Draft = 'draft',
  Scheduled = 'scheduled',
  Published = 'published',
  Expired = 'expired',
  Archived = 'archived',
}

export enum AnnouncementCategory {
  HRUpdates = 'hr_updates',
  Benefits = 'benefits',
  Events = 'events',
  Performance = 'performance',
  Training = 'training',
  Policy = 'policy',
  General = 'general',
  Emergency = 'emergency',
}

export enum ResourceType {
  Video = 'video',
  Document = 'document',
  Image = 'image',
  Link = 'link',
  Presentation = 'presentation',
  Interactive = 'interactive',
}

export enum ResourceCategory {
  Onboarding = 'onboarding',
  Training = 'training',
  Policies = 'policies',
  Benefits = 'benefits',
  Tools = 'tools',
  Culture = 'culture',
  DepartmentSpecific = 'department_specific',
  FormsTemplates = 'forms_templates',
  Performance = 'performance',
  Emergency = 'emergency',
}

export enum ResourceStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export enum OnboardingStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum OnboardingStep {
  PersonalInfo = 'personal_info',
  PaymentInfo = 'payment_info',
  Documents = 'documents',
  Review = 'review',
}

export enum OnboardingDocumentType {
  ValidId = 'valid_id',
  ProfilePhoto = 'profile_photo',
  CV = 'cv',
  BirthCertificate = 'birth_certificate',
}

// ============================================
// Table Types
// ============================================

/**
 * Audit Log - Tracks all sensitive operations
 */
export interface AuditLog {
  id: AuditLogId;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: UserId | null;
  performed_at: string; // ISO 8601 timestamp
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Department - Organizational structure
 */
export interface Department {
  id: DepartmentId;
  name: string;
  description: string | null;
  head_id: UserId | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  created_by: UserId | null;
  deleted_at: string | null; // ISO 8601 timestamp
}

/**
 * User - Extends Supabase auth.users with HR fields
 */
export interface User {
  id: UserId;
  role: UserRole;
  department_id: DepartmentId | null;
  manager_id: UserId | null;
  status: UserStatus;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  created_by: UserId | null;
  deleted_at: string | null; // ISO 8601 timestamp
}

/**
 * Employee - 201 file data
 * SENSITIVE: Contains personal and payroll information
 */
export interface Employee {
  id: EmployeeId;
  user_id: UserId;
  employee_number: string;
  immediate_head: UserId | null;

  // Personal Information
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birthday: string | null; // ISO 8601 date (YYYY-MM-DD)

  // Employment Information
  date_hired: string; // ISO 8601 date (YYYY-MM-DD)
  employment_type: EmploymentType;
  work_arrangement: WorkArrangement;
  position: string;
  department: string;
  probation_end_date: string | null; // ISO 8601 date (YYYY-MM-DD)

  // Payroll Information (SENSITIVE)
  payroll_account_name: string | null;
  payroll_account_number: string | null;

  // Contact Information
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  personal_email: string | null;
  company_email: string | null;

  // Demographics
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;

  // Standard columns
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  created_by: UserId | null;
  deleted_at: string | null; // ISO 8601 timestamp
}

/**
 * Document - File references for 201 files
 */
export interface Document {
  id: DocumentId;
  employee_id: EmployeeId;
  document_type: DocumentType;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  is_confidential: boolean;
  uploaded_by: UserId;
  uploaded_at: string; // ISO 8601 timestamp
  notes: string | null;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  created_by: UserId | null;
  deleted_at: string | null; // ISO 8601 timestamp
}

export interface Announcement {
  id: AnnouncementId;
  title: string;
  content: string;
  excerpt: string | null;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  target_roles: Array<UserRole>;
  target_departments: Array<DepartmentId>;
  target_employees: Array<UserId>;
  is_pinned: boolean;
  allow_comments: boolean;
  has_attachments: boolean;
  author_id: UserId;
  read_count: number;
  created_at: string;
  updated_at: string;
  created_by: UserId | null;
  deleted_at: string | null;
}

export interface AnnouncementAttachment {
  id: AnnouncementAttachmentId;
  announcement_id: AnnouncementId;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  created_at: string;
}

export interface AnnouncementRead {
  id: AnnouncementReadId;
  announcement_id: AnnouncementId;
  user_id: UserId;
  read_at: string;
}

export interface AnnouncementComment {
  id: AnnouncementCommentId;
  announcement_id: AnnouncementId;
  user_id: UserId;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Resource - Information Hub resources
 * Supports videos, documents, links, presentations, and interactive content
 */
export interface Resource {
  id: ResourceId;

  // Basic Information
  title: string;
  description: string | null;
  excerpt: string | null;

  // Classification
  resource_type: ResourceType;
  category: ResourceCategory;
  subcategory: string | null;
  tags: Array<string>;

  // Content Location
  file_path: string | null;
  external_url: string | null;
  thumbnail_path: string | null;

  // Metadata
  file_size: number | null;
  mime_type: string | null;
  duration_seconds: number | null;

  // Publishing
  status: ResourceStatus;
  published_at: string | null;
  expires_at: string | null;

  // Targeting
  is_public: boolean;
  target_roles: Array<UserRole>;
  target_departments: Array<DepartmentId>;
  target_employees: Array<UserId>;

  // Display Options
  is_featured: boolean;
  is_pinned: boolean;
  display_order: number;

  // Engagement Metrics
  view_count: number;
  download_count: number;
  bookmark_count: number;

  // Versioning
  version: number;
  previous_version_id: ResourceId | null;

  // Audit
  author_id: UserId;
  created_at: string;
  updated_at: string;
  created_by: UserId | null;
  deleted_at: string | null;
}

/**
 * Resource Collection - Curated playlists/bundles of resources
 */
export interface ResourceCollection {
  id: ResourceCollectionId;
  title: string;
  description: string | null;
  thumbnail_path: string | null;
  is_public: boolean;
  target_roles: Array<UserRole>;
  target_departments: Array<DepartmentId>;
  author_id: UserId;
  created_at: string;
  updated_at: string;
  created_by: UserId | null;
  deleted_at: string | null;
}

/**
 * Collection Resource - Junction table for collection items
 */
export interface CollectionResource {
  id: CollectionResourceId;
  collection_id: ResourceCollectionId;
  resource_id: ResourceId;
  display_order: number;
  created_at: string;
}

/**
 * Resource Bookmark - User's bookmarked resources
 */
export interface ResourceBookmark {
  id: ResourceBookmarkId;
  resource_id: ResourceId;
  user_id: UserId;
  notes: string | null;
  created_at: string;
}

/**
 * Resource View - Tracks resource views for analytics
 */
export interface ResourceView {
  id: ResourceViewId;
  resource_id: ResourceId;
  user_id: UserId;
  viewed_at: string;
  duration_seconds: number | null;
  completed: boolean;
}

export interface OnboardingChecklist {
  id: OnboardingChecklistId;
  employee_id: EmployeeId;
  status: OnboardingStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTask {
  id: OnboardingTaskId;
  checklist_id: OnboardingChecklistId;
  title: string;
  description: string | null;
  category: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  due_days_from_start: number;
  assigned_to: UserId | null;
  created_at: string;
}

export interface OnboardingProfile {
  id: OnboardingProfileId;
  user_id: UserId;
  is_completed: boolean;
  completed_at: string | null;
  current_step: OnboardingStep;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  position: string | null;
  department_id: DepartmentId | null;
  start_date: string | null;
  nationality: string | null;
  contact_number: string | null;
  email_address: string | null;
  education: string | null;
  birthday: string | null;
  age: number | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  linkedin_profile_url: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_email: string | null;
  payment_phone_number: string | null;
  payment_address: string | null;
  payment_city: string | null;
  payment_province: string | null;
  payment_zipcode: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OnboardingDocument {
  id: OnboardingDocumentId;
  onboarding_profile_id: OnboardingProfileId;
  document_type: OnboardingDocumentType;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// Insert Types (for creating new records)
// ============================================

export type DepartmentInsert = Omit<Department, 'id' | 'created_at' | 'updated_at'>;
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;
export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>;
export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at' | 'updated_at'>;
export type AnnouncementAttachmentInsert = Omit<AnnouncementAttachment, 'id' | 'created_at'>;
export type AnnouncementReadInsert = Omit<AnnouncementRead, 'id' | 'read_at'>;
export type AnnouncementCommentInsert = Omit<
  AnnouncementComment,
  'id' | 'created_at' | 'updated_at'
>;
export type ResourceInsert = Omit<
  Resource,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'view_count'
  | 'download_count'
  | 'bookmark_count'
  | 'excerpt'
>;
export type ResourceCollectionInsert = Omit<ResourceCollection, 'id' | 'created_at' | 'updated_at'>;
export type CollectionResourceInsert = Omit<CollectionResource, 'id' | 'created_at'>;
export type ResourceBookmarkInsert = Omit<ResourceBookmark, 'id' | 'created_at'>;
export type ResourceViewInsert = Omit<ResourceView, 'id' | 'viewed_at'>;
export type OnboardingChecklistInsert = Omit<
  OnboardingChecklist,
  'id' | 'created_at' | 'updated_at'
>;
export type OnboardingTaskInsert = Omit<OnboardingTask, 'id' | 'created_at'>;
export type OnboardingProfileInsert = Omit<OnboardingProfile, 'id' | 'created_at' | 'updated_at'>;
export type OnboardingDocumentInsert = Omit<
  OnboardingDocument,
  'id' | 'uploaded_at' | 'created_at' | 'updated_at'
>;

// ============================================
// Update Types (for updating records)
// ============================================

export type DepartmentUpdate = Partial<Omit<Department, 'id' | 'created_at' | 'created_by'>>;
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'created_by'>>;
export type EmployeeUpdate = Partial<Omit<Employee, 'id' | 'created_at' | 'created_by'>>;
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'created_at' | 'created_by'>>;
export type AnnouncementUpdate = Partial<Omit<Announcement, 'id' | 'created_at' | 'created_by'>>;
export type AnnouncementCommentUpdate = Partial<Omit<AnnouncementComment, 'id' | 'created_at'>>;
export type ResourceUpdate = Partial<
  Omit<
    Resource,
    'id' | 'created_at' | 'created_by' | 'view_count' | 'download_count' | 'bookmark_count'
  >
>;
export type ResourceCollectionUpdate = Partial<
  Omit<ResourceCollection, 'id' | 'created_at' | 'created_by'>
>;
export type CollectionResourceUpdate = Partial<Omit<CollectionResource, 'id' | 'created_at'>>;
export type ResourceBookmarkUpdate = Partial<
  Omit<ResourceBookmark, 'id' | 'created_at' | 'resource_id' | 'user_id'>
>;
export type ResourceViewUpdate = Partial<
  Omit<ResourceView, 'id' | 'viewed_at' | 'resource_id' | 'user_id'>
>;
export type OnboardingChecklistUpdate = Partial<Omit<OnboardingChecklist, 'id' | 'created_at'>>;
export type OnboardingTaskUpdate = Partial<
  Omit<OnboardingTask, 'id' | 'created_at' | 'checklist_id'>
>;
export type OnboardingProfileUpdate = Partial<
  Omit<OnboardingProfile, 'id' | 'created_at' | 'user_id'>
>;
export type OnboardingDocumentUpdate = Partial<
  Omit<OnboardingDocument, 'id' | 'created_at' | 'uploaded_at' | 'onboarding_profile_id'>
>;

// ============================================
// View Types (with related data)
// ============================================

/**
 * Employee with User data joined
 */
export interface EmployeeWithUser extends Employee {
  user: User;
}

/**
 * Employee with full details (User, Department, Manager)
 */
export interface EmployeeFullDetails extends Employee {
  user: User;
  department_details: Department | null;
  manager: User | null;
}

/**
 * Document with Employee data
 */
export interface DocumentWithEmployee extends Document {
  employee: Employee;
}

/**
 * User with Department and Manager
 */
export interface UserWithRelations extends User {
  department: Department | null;
  manager: User | null;
}

/**
 * Resource with Author data
 */
export interface ResourceWithAuthor extends Resource {
  author: User;
}

/**
 * Resource with bookmark status for current user
 */
export interface ResourceWithBookmarkStatus extends Resource {
  is_bookmarked: boolean;
  bookmark_notes: string | null;
}

/**
 * Resource Collection with resources count
 */
export interface ResourceCollectionWithCount extends ResourceCollection {
  resource_count: number;
}

/**
 * Resource Collection with full resource details
 */
export interface ResourceCollectionWithResources extends ResourceCollection {
  resources: Array<Resource>;
}

/**
 * Resource View with resource details (for recently viewed)
 */
export interface ResourceViewWithDetails extends ResourceView {
  resource: Resource;
}

/**
 * Resource Bookmark with resource details
 */
export interface ResourceBookmarkWithDetails extends ResourceBookmark {
  resource: Resource;
}

// ============================================
// Helper Functions Return Types
// ============================================

export interface DirectReport {
  employee_id: EmployeeId;
  user_id: UserId;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
}

export interface EmployeeByDepartment {
  employee_id: EmployeeId;
  employee_number: string;
  full_name: string;
  position: string;
  employment_type: EmploymentType;
  date_hired: string;
}

// ============================================
// Database Schema
// ============================================

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'performed_at'>;
        Update: never; // Audit logs should not be updated
        Relationships: [];
      };
      departments: {
        Row: Department;
        Insert: DepartmentInsert;
        Update: DepartmentUpdate;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: EmployeeInsert;
        Update: EmployeeUpdate;
        Relationships: [];
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: AnnouncementInsert;
        Update: AnnouncementUpdate;
        Relationships: [];
      };
      announcement_attachments: {
        Row: AnnouncementAttachment;
        Insert: AnnouncementAttachmentInsert;
        Update: never;
        Relationships: [];
      };
      announcement_reads: {
        Row: AnnouncementRead;
        Insert: AnnouncementReadInsert;
        Update: never;
        Relationships: [];
      };
      announcement_comments: {
        Row: AnnouncementComment;
        Insert: AnnouncementCommentInsert;
        Update: AnnouncementCommentUpdate;
        Relationships: [];
      };
      resources: {
        Row: Resource;
        Insert: ResourceInsert;
        Update: ResourceUpdate;
        Relationships: [];
      };
      resource_collections: {
        Row: ResourceCollection;
        Insert: ResourceCollectionInsert;
        Update: ResourceCollectionUpdate;
        Relationships: [];
      };
      collection_resources: {
        Row: CollectionResource;
        Insert: CollectionResourceInsert;
        Update: CollectionResourceUpdate;
        Relationships: [];
      };
      resource_bookmarks: {
        Row: ResourceBookmark;
        Insert: ResourceBookmarkInsert;
        Update: ResourceBookmarkUpdate;
        Relationships: [];
      };
      resource_views: {
        Row: ResourceView;
        Insert: ResourceViewInsert;
        Update: ResourceViewUpdate;
        Relationships: [];
      };
      onboarding_checklists: {
        Row: OnboardingChecklist;
        Insert: OnboardingChecklistInsert;
        Update: OnboardingChecklistUpdate;
        Relationships: [];
      };
      onboarding_tasks: {
        Row: OnboardingTask;
        Insert: OnboardingTaskInsert;
        Update: OnboardingTaskUpdate;
        Relationships: [];
      };
      onboarding_profiles: {
        Row: OnboardingProfile;
        Insert: OnboardingProfileInsert;
        Update: OnboardingProfileUpdate;
        Relationships: [];
      };
      onboarding_documents: {
        Row: OnboardingDocument;
        Insert: OnboardingDocumentInsert;
        Update: OnboardingDocumentUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_has_role: {
        Args: { user_id: UserId; required_role: UserRole };
        Returns: boolean;
      };
      user_has_any_role: {
        Args: { user_id: UserId; required_roles: Array<UserRole> };
        Returns: boolean;
      };
      get_user_role: {
        Args: { user_id: UserId };
        Returns: UserRole;
      };
      is_manager_of: {
        Args: { manager_id: UserId; employee_user_id: UserId };
        Returns: boolean;
      };
      get_employee_by_user_id: {
        Args: { user_id: UserId };
        Returns: EmployeeId;
      };
      soft_delete: {
        Args: { table_name: string; record_id: string };
        Returns: boolean;
      };
      get_direct_reports: {
        Args: { manager_user_id: UserId };
        Returns: Array<DirectReport>;
      };
      is_on_probation: {
        Args: { employee_id: EmployeeId };
        Returns: boolean;
      };
      calculate_tenure_days: {
        Args: { employee_id: EmployeeId };
        Returns: number;
      };
      get_employees_by_department: {
        Args: { dept_name: string };
        Returns: Array<EmployeeByDepartment>;
      };
      increment_resource_download_count: {
        Args: { resource_uuid: ResourceId };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ============================================
// Type Guards
// ============================================

export const isUserRole = (value: string): value is UserRole => {
  return Object.values(UserRole).includes(value as UserRole);
};

export const isUserStatus = (value: string): value is UserStatus => {
  return Object.values(UserStatus).includes(value as UserStatus);
};

export const isEmploymentType = (value: string): value is EmploymentType => {
  return Object.values(EmploymentType).includes(value as EmploymentType);
};

export const isWorkArrangement = (value: string): value is WorkArrangement => {
  return Object.values(WorkArrangement).includes(value as WorkArrangement);
};

export const isDocumentType = (value: string): value is DocumentType => {
  return Object.values(DocumentType).includes(value as DocumentType);
};

export const isAnnouncementPriority = (value: string): value is AnnouncementPriority => {
  return Object.values(AnnouncementPriority).includes(value as AnnouncementPriority);
};

export const isAnnouncementStatus = (value: string): value is AnnouncementStatus => {
  return Object.values(AnnouncementStatus).includes(value as AnnouncementStatus);
};

export const isAnnouncementCategory = (value: string): value is AnnouncementCategory => {
  return Object.values(AnnouncementCategory).includes(value as AnnouncementCategory);
};

export const isResourceType = (value: string): value is ResourceType => {
  return Object.values(ResourceType).includes(value as ResourceType);
};

export const isResourceCategory = (value: string): value is ResourceCategory => {
  return Object.values(ResourceCategory).includes(value as ResourceCategory);
};

export const isResourceStatus = (value: string): value is ResourceStatus => {
  return Object.values(ResourceStatus).includes(value as ResourceStatus);
};

// ============================================
// Utility Types
// ============================================

/**
 * Extract non-deleted records
 */
export type Active<T extends { deleted_at: string | null }> = T & { deleted_at: null };

/**
 * Extract deleted records
 */
export type Deleted<T extends { deleted_at: string | null }> = T & { deleted_at: string };

/**
 * Sensitive fields that should never be logged or sent to client
 */
export type SensitiveEmployeeFields = Pick<
  Employee,
  'payroll_account_name' | 'payroll_account_number'
>;

/**
 * Employee data safe for public display (non-sensitive)
 */
export type PublicEmployee = Omit<Employee, 'payroll_account_name' | 'payroll_account_number'>;
