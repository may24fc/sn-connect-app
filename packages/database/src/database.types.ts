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

// Helper to create branded types
export const brandUserId = (id: string): UserId => id as UserId;
export const brandEmployeeId = (id: string): EmployeeId => id as EmployeeId;
export const brandDepartmentId = (id: string): DepartmentId => id as DepartmentId;
export const brandDocumentId = (id: string): DocumentId => id as DocumentId;
export const brandAuditLogId = (id: string): AuditLogId => id as AuditLogId;

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

// ============================================
// Insert Types (for creating new records)
// ============================================

export type DepartmentInsert = Omit<Department, 'id' | 'created_at' | 'updated_at'>;
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type EmployeeInsert = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;
export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>;

// ============================================
// Update Types (for updating records)
// ============================================

export type DepartmentUpdate = Partial<Omit<Department, 'id' | 'created_at' | 'created_by'>>;
export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'created_by'>>;
export type EmployeeUpdate = Partial<Omit<Employee, 'id' | 'created_at' | 'created_by'>>;
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'created_at' | 'created_by'>>;

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
    };
    Views: Record<string, never>;
    Functions: {
      user_has_role: {
        Args: { user_id: UserId; required_role: UserRole };
        Returns: boolean;
      };
      user_has_any_role: {
        Args: { user_id: UserId; required_roles: UserRole[] };
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
        Returns: DirectReport[];
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
        Returns: EmployeeByDepartment[];
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
export type PublicEmployee = Omit<
  Employee,
  'payroll_account_name' | 'payroll_account_number'
>;
