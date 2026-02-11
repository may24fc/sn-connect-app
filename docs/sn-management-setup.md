# SN Connect HR Portal - Implementation Checklist

This document provides a comprehensive, actionable checklist for implementing the SN Connect HR Portal. Tasks are organized by phase and domain, with clear dependencies and file locations.

---

## Phase 0: Foundation (COMPLETED)

### Monorepo Setup
- [x] Initialize pnpm workspace structure
- [x] Configure apps/web with Next.js 15 + React 19
- [x] Configure apps/mobile with Capacitor skeleton
- [x] Create packages/ui with Radix UI primitives
- [x] Create packages/database with Supabase types
- [x] Create packages/auth (empty placeholder)
- [x] Create packages/ai (empty placeholder)
- [x] Create packages/config for shared configuration

### Build Tooling
- [x] Configure TypeScript 5.7 with strict mode
- [x] Configure Biome 1.9 for linting/formatting
- [x] Configure Vitest 2.1 for unit testing
- [x] Configure Playwright 1.58 for E2E testing
- [x] Setup root package.json scripts

### Design System (Titanium & Indigo)
- [x] Configure Tailwind CSS with custom design tokens
- [x] Implement Indigo-600 primary color palette
- [x] Configure Zinc neutral palette for light/dark modes
- [x] Setup 14px dense typography with Inter font
- [x] Create globals.css with CSS custom properties

### UI Components (48+ Components)
- [x] Primitives: Button, Input, Textarea, Label, Card, Badge, Avatar
- [x] Primitives: Progress, Tabs, Dialog, Table, Checkbox, Select
- [x] Primitives: DropdownMenu, Separator, Tooltip
- [x] Layout: Sidebar (role-based navigation), Header
- [x] Data Display: DataTable, BentoGrid, StatCard
- [x] Feedback: EmptyState, SkeletonCard, SkeletonTable
- [x] AI Knowledge: AIKnowledgeManager, KnowledgeBasePanel, PlaygroundPanel
- [x] AI Knowledge: UploadZone, UploadProgress, SourcesInventory, ChatInterface
- [x] Performance: KPICard, OKRCard, PerformanceCharts, PerformanceSummaryCards
- [x] Internship: InternCard, HoursProgressCard, DailyReportCard, EODReportForm
- [x] Reports: ReportCard, ReportForm, WeekSelector, MetricInput, AnalyticsCharts
- [x] Tasks: TaskCard, TaskFilters, TaskList, TaskDetailView, TaskForm

### UI Pages (All Frontend Shells)
- [x] Auth: /login, /forgot-password
- [x] Employee: /dashboard, /profile, /files, /announcements
- [x] Employee: /onboarding, /payroll, /tasks, /tasks/[id]
- [x] Employee: /reports, /reports/new, /reports/[id]
- [x] Employee: /performance, /performance/kpis, /performance/okrs, /performance/review
- [x] Intern: /intern/dashboard
- [x] Manager: /manager/reviews, /manager/team-performance
- [x] Admin: /admin/dashboard, /admin/interns, /admin/interns/[id]
- [x] Admin: /admin/performance, /admin/performance/cycles
- [x] Admin: /admin/probation, /admin/reports, /admin/reports/analytics
- [x] Admin: /admin/ai-knowledge
- [x] Super Admin: /super-admin/dashboard, /super-admin/tasks, /super-admin/tasks/[id]
- [x] Super Admin: /super-admin/payroll-approvals, /super-admin/ai-knowledge

### Database Schema (Phase 1)
- [x] Migration: Create enums (user_role, user_status, employment_type, work_arrangement, document_type)
- [x] Migration: Create audit_logs table with RLS
- [x] Migration: Create departments table with RLS
- [x] Migration: Create users table (extends auth.users) with RLS
- [x] Migration: Create employees table (201 file data) with RLS
- [x] Migration: Create documents table with RLS
- [x] Migration: Create triggers for updated_at and audit logging
- [x] Migration: Create helper functions (user_has_role, is_manager_of, etc.)
- [x] Create TypeScript types with branded IDs in packages/database

### Mock Authentication
- [x] Create AuthContext with localStorage persistence
- [x] Implement 4 test accounts (employee, intern, admin, super_admin)
- [x] Create useRequireAuth hook for route protection
- [x] Implement role-based redirects after login

### TanStack Query Setup
- [x] Create QueryClient configuration in apps/web/src/lib/query-client.ts
- [x] Create Providers component wrapping QueryClientProvider
- [x] Add ReactQueryDevtools for development

### CI/CD Pipelines
- [x] GitHub Actions: ci.yml (lint, typecheck, test)
- [x] GitHub Actions: deploy.yml
- [x] GitHub Actions: playwright.yml (E2E tests)
- [x] GitHub Actions: security.yml
- [x] GitHub Actions: pr-checks.yml
- [x] GitHub Actions: maintenance.yml
- [x] GitHub Actions: vercel-deploy.yml

---

## >>>>>>> RESUME HERE: Phase 1 - Backend Foundation <<<<<<<

### 1.1 Role System Alignment (CRITICAL - Do First)

**Problem:** Database has 6 roles (admin, hr, cos, ceo, employee, intern) but UI uses 4 roles (super_admin, admin, employee, intern). This mismatch will cause authorization bugs.

**Decision Required:** Choose one approach:
- Option A: Add `super_admin` to database enum, keep 4 UI roles
- Option B: Map multiple DB roles to UI roles (hr+cos+ceo = admin)
- Option C: Expose all 6 roles in UI

- [x] **Create ADR document for role mapping decision**
  - File: [docs/adr/ADR-001-role-mapping.md](docs/adr/ADR-001-role-mapping.md)
  - Document the chosen approach and rationale

- [ ] **If Option A chosen: Create migration to add super_admin role**
  - File: `supabase/migrations/20260210000001_add_super_admin_role.sql`
  ```sql
  ALTER TYPE user_role ADD VALUE 'super_admin';
  ```

- [x] **Update packages/database/src/database.types.ts to match chosen approach**
  - File: [packages/database/src/database.types.ts](packages/database/src/database.types.ts)

- [x] **Update apps/web/src/contexts/AuthContext.tsx to use database roles**
  - File: [apps/web/src/contexts/AuthContext.tsx](apps/web/src/contexts/AuthContext.tsx)

### 1.2 Supabase Authentication Integration

- [x] **Install Supabase Auth dependencies**
  - Added to [apps/web/package.json](apps/web/package.json) (run `pnpm install`)

- [x] **Create Supabase client utilities**
  - File: [apps/web/src/lib/supabase/client.ts](apps/web/src/lib/supabase/client.ts) (browser client)
  - File: [apps/web/src/lib/supabase/server.ts](apps/web/src/lib/supabase/server.ts) (server client)
  - File: [apps/web/src/lib/supabase/middleware.ts](apps/web/src/lib/supabase/middleware.ts) (middleware client)

- [x] **Create Next.js middleware for auth protection**
  - File: [apps/web/src/middleware.ts](apps/web/src/middleware.ts)
  - Protects: `/dashboard/*`, `/admin/*`, `/super-admin/*`
  - Allows: `/login`, `/forgot-password`, `/api/auth/*`
  - Refreshes session and redirects unauthenticated requests

- [x] **Update AuthContext to use Supabase Auth**
  - File: [apps/web/src/contexts/AuthContext.tsx](apps/web/src/contexts/AuthContext.tsx)
  - Replaced mock auth with `signInWithPassword`, `signOut`, `onAuthStateChange`, and role lookup

- [x] **Create auth API routes**
  - File: [apps/web/src/app/api/auth/callback/route.ts](apps/web/src/app/api/auth/callback/route.ts)
  - File: [apps/web/src/app/api/auth/signout/route.ts](apps/web/src/app/api/auth/signout/route.ts)

- [x] **Update login page to use real auth**
  - File: [apps/web/src/app/(auth)/login/page.tsx](apps/web/src/app/(auth)/login/page.tsx)
  - Added error handling, loading states; mock buttons kept behind `NEXT_PUBLIC_ENABLE_MOCK_AUTH`

- [x] **Implement forgot password flow**
  - File: [apps/web/src/app/(auth)/forgot-password/page.tsx](apps/web/src/app/(auth)/forgot-password/page.tsx)
  - Added confirmation and reset pages at [apps/web/src/app/(auth)/forgot-password/confirmation/page.tsx](apps/web/src/app/(auth)/forgot-password/confirmation/page.tsx) and [apps/web/src/app/(auth)/reset-password/page.tsx](apps/web/src/app/(auth)/reset-password/page.tsx)

- [x] **Add E2E tests for authentication**
  - File: [e2e/auth.spec.ts](e2e/auth.spec.ts)
  - Tests: login success/failure, logout, protected-route redirect, session persistence

### 1.3 Add Form Validation Dependencies

- [ ] **Install form libraries**
  ```bash
  cd apps/web && pnpm add react-hook-form @hookform/resolvers zod
  ```

- [ ] **Create Zod schemas for all entities**
  - File: `apps/web/src/lib/schemas/auth.schema.ts`
  - File: `apps/web/src/lib/schemas/employee.schema.ts`
  - File: `apps/web/src/lib/schemas/document.schema.ts`
  - File: `apps/web/src/lib/schemas/report.schema.ts`
  - File: `apps/web/src/lib/schemas/task.schema.ts`

- [ ] **Create reusable form components with React Hook Form**
  - File: `packages/ui/src/components/forms/Form.tsx`
  - File: `packages/ui/src/components/forms/FormField.tsx`
  - File: `packages/ui/src/components/forms/FormInput.tsx`
  - File: `packages/ui/src/components/forms/FormSelect.tsx`
  - File: `packages/ui/src/components/forms/FormTextarea.tsx`

### 1.4 Query Keys Factory

- [ ] **Create centralized query key factory**
  - File: `apps/web/src/lib/query-keys.ts`
  ```typescript
  export const queryKeys = {
    employees: {
      all: ['employees'] as const,
      lists: () => [...queryKeys.employees.all, 'list'] as const,
      list: (filters: EmployeeFilters) => [...queryKeys.employees.lists(), filters] as const,
      details: () => [...queryKeys.employees.all, 'detail'] as const,
      detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    },
    // Add for: departments, documents, reports, tasks, performance, etc.
  };
  ```

### 1.5 Employee 201 File API

- [ ] **Create employees API route**
  - File: `apps/web/src/app/api/employees/route.ts`
  - GET: List employees with pagination, search, filters
  - POST: Create new employee (HR/Admin only)
  - Validate JWT, apply RLS through Supabase client

- [ ] **Create employee detail API route**
  - File: `apps/web/src/app/api/employees/[id]/route.ts`
  - GET: Single employee details
  - PATCH: Update employee
  - DELETE: Soft delete employee

- [ ] **Create employee hooks**
  - File: `apps/web/src/hooks/useEmployees.ts`
  - File: `apps/web/src/hooks/useEmployee.ts`
  - File: `apps/web/src/hooks/useCreateEmployee.ts`
  - File: `apps/web/src/hooks/useUpdateEmployee.ts`

- [ ] **Connect /profile page to real data**
  - Update `apps/web/src/app/(employee)/profile/page.tsx`
  - Fetch logged-in user's employee record
  - Enable profile editing with form validation

- [ ] **Add unit tests for employee hooks**
  - File: `tests/hooks/useEmployees.test.ts`

### 1.6 Documents/Files API

- [ ] **Configure Supabase Storage bucket**
  - Create bucket: `employee-documents`
  - Set RLS policies matching documents table access

- [ ] **Create documents API routes**
  - File: `apps/web/src/app/api/documents/route.ts`
  - GET: List documents for employee
  - POST: Upload document with metadata

- [ ] **Create document upload API route**
  - File: `apps/web/src/app/api/documents/upload/route.ts`
  - Handle multipart form data
  - Upload to Supabase Storage
  - Create document record in database
  - Log to audit_logs

- [ ] **Create document download API route**
  - File: `apps/web/src/app/api/documents/[id]/download/route.ts`
  - Generate signed URL from Supabase Storage
  - Check access permissions

- [ ] **Create document hooks**
  - File: `apps/web/src/hooks/useDocuments.ts`
  - File: `apps/web/src/hooks/useUploadDocument.ts`
  - File: `apps/web/src/hooks/useDownloadDocument.ts`

- [ ] **Connect /files page to real data**
  - Update `apps/web/src/app/(employee)/files/page.tsx`
  - Implement file upload with progress
  - Implement file download
  - Show document list with filtering by type

### 1.7 Departments API

- [ ] **Create departments API routes**
  - File: `apps/web/src/app/api/departments/route.ts`
  - GET: List all departments
  - POST: Create department (Admin only)

- [ ] **Create department hooks**
  - File: `apps/web/src/hooks/useDepartments.ts`

---

## Phase 2: Core Features

### 2.1 Reports System

**Database Schema Required:**
```sql
-- Migration: Create reports tables
CREATE TABLE public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  report_type text NOT NULL, -- 'weekly', 'monthly', 'marketing'
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.report_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for reports tables**
  - File: `supabase/migrations/20260210000002_create_reports_tables.sql`
  - Include RLS policies for employee self-access, manager access, admin access

- [ ] **Create reports API routes**
  - File: `apps/web/src/app/api/reports/route.ts`
  - File: `apps/web/src/app/api/reports/[id]/route.ts`
  - File: `apps/web/src/app/api/reports/[id]/submit/route.ts`
  - File: `apps/web/src/app/api/reports/[id]/approve/route.ts`

- [ ] **Create reports hooks**
  - File: `apps/web/src/hooks/useReports.ts`
  - File: `apps/web/src/hooks/useReport.ts`
  - File: `apps/web/src/hooks/useCreateReport.ts`
  - File: `apps/web/src/hooks/useSubmitReport.ts`

- [ ] **Connect reports pages to real data**
  - Update `apps/web/src/app/(employee)/reports/page.tsx`
  - Update `apps/web/src/app/(employee)/reports/new/page.tsx`
  - Update `apps/web/src/app/(employee)/reports/[id]/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/reports/page.tsx`

### 2.2 Tasks System

**Database Schema Required:**
```sql
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.users(id),
  assigned_by uuid NOT NULL REFERENCES public.users(id),
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.task_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for tasks tables**
  - File: `supabase/migrations/20260210000003_create_tasks_tables.sql`
  - Include RLS policies

- [ ] **Create tasks API routes**
  - File: `apps/web/src/app/api/tasks/route.ts`
  - File: `apps/web/src/app/api/tasks/[id]/route.ts`
  - File: `apps/web/src/app/api/tasks/[id]/comments/route.ts`

- [ ] **Create tasks hooks**
  - File: `apps/web/src/hooks/useTasks.ts`
  - File: `apps/web/src/hooks/useTask.ts`
  - File: `apps/web/src/hooks/useCreateTask.ts`
  - File: `apps/web/src/hooks/useUpdateTask.ts`

- [ ] **Connect tasks pages to real data**
  - Update `apps/web/src/app/(employee)/tasks/page.tsx`
  - Update `apps/web/src/app/(employee)/tasks/[id]/page.tsx`
  - Update `apps/web/src/app/(admin)/super-admin/tasks/page.tsx`

### 2.3 Payroll/Invoice System

**Database Schema Required:**
```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');

CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  deductions numeric(12,2) DEFAULT 0,
  net_amount numeric(12,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.invoice_line_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for invoices tables**
  - File: `supabase/migrations/20260210000004_create_invoices_tables.sql`

- [ ] **Create payroll API routes**
  - File: `apps/web/src/app/api/invoices/route.ts`
  - File: `apps/web/src/app/api/invoices/[id]/route.ts`
  - File: `apps/web/src/app/api/invoices/[id]/submit/route.ts`
  - File: `apps/web/src/app/api/invoices/[id]/approve/route.ts`

- [ ] **Connect payroll pages to real data**
  - Update `apps/web/src/app/(employee)/payroll/page.tsx`
  - Update `apps/web/src/app/(admin)/super-admin/payroll-approvals/page.tsx`

### 2.4 Announcements/Resources Hub

**Database Schema Required:**
```sql
CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  published_at timestamptz,
  expires_at timestamptz,
  target_roles user_role[] DEFAULT '{}',
  target_departments text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  author_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE public.resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  file_path text,
  external_url text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
```

- [ ] **Create migration for announcements tables**
  - File: `supabase/migrations/20260210000005_create_announcements_tables.sql`

- [ ] **Create announcements API routes**
  - File: `apps/web/src/app/api/announcements/route.ts`
  - File: `apps/web/src/app/api/resources/route.ts`

- [ ] **Connect announcements page to real data**
  - Update `apps/web/src/app/(employee)/announcements/page.tsx`

---

## Phase 3: Orchestration & Automation (n8n)

### 3.1 n8n Setup

- [ ] **Create n8n Docker configuration**
  - File: `n8n/docker-compose.yml`
  - Configure with PostgreSQL backend
  - Set environment variables for Supabase connection

- [ ] **Create n8n webhook configuration**
  - Document webhook URLs for each workflow
  - Create API route for webhook validation
  - File: `apps/web/src/app/api/webhooks/n8n/route.ts`

### 3.2 Notification Workflows

- [ ] **Birthday reminder workflow**
  - File: `n8n/workflows/notifications-birthday-reminder.json`
  - Trigger: Daily schedule (8 AM)
  - Logic: Query employees with birthday = today
  - Action: Send email to HR + Slack notification
  - Audit: Log notification sent

- [ ] **Work anniversary reminder workflow**
  - File: `n8n/workflows/notifications-anniversary-reminder.json`
  - Trigger: Daily schedule (8 AM)
  - Logic: Query employees with date_hired anniversary = today
  - Action: Send email to employee + manager

- [ ] **Payroll deadline reminder workflow**
  - File: `n8n/workflows/notifications-payroll-reminder.json`
  - Trigger: 3 days before payroll deadline
  - Logic: Query employees with pending invoices
  - Action: Send email reminder

- [ ] **Probation ending reminder workflow**
  - File: `n8n/workflows/notifications-probation-ending.json`
  - Trigger: Daily schedule
  - Logic: Query employees with probation_end_date in next 14 days
  - Action: Notify HR + immediate_head

### 3.3 Onboarding Automation

**Database Schema Required:**
```sql
CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE public.onboarding_checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  status onboarding_status NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.onboarding_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id uuid NOT NULL REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL, -- 'documents', 'training', 'equipment', 'access'
  is_required boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  due_days_from_start integer DEFAULT 7,
  assigned_to uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for onboarding tables**
  - File: `supabase/migrations/20260210000006_create_onboarding_tables.sql`

- [ ] **Create onboarding workflow**
  - File: `n8n/workflows/onboarding-new-employee.json`
  - Trigger: Webhook when employee created
  - Actions:
    - Create onboarding checklist
    - Create default onboarding tasks
    - Notify HR to prepare equipment
    - Schedule welcome email
    - Create calendar events for orientation

- [ ] **Create onboarding API routes**
  - File: `apps/web/src/app/api/onboarding/route.ts`
  - File: `apps/web/src/app/api/onboarding/[id]/tasks/route.ts`

- [ ] **Connect onboarding page to real data**
  - Update `apps/web/src/app/(employee)/onboarding/page.tsx`

### 3.3.1 Post-Signin Onboarding Setup (First-Time Employee/Intern Wizard)

A mandatory multi-step onboarding wizard triggered after first signin. Blocks portal access until completed.

**Database Schema Required:**
```sql
-- Migration: supabase/migrations/20260211000001_create_onboarding_profiles.sql

CREATE TYPE onboarding_step AS ENUM ('personal_info', 'payment_info', 'documents', 'review');

CREATE TABLE public.onboarding_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,

  -- Progress Tracking
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  current_step onboarding_step DEFAULT 'personal_info',

  -- Step 1: Personal Information
  first_name text,
  middle_name text,
  last_name text,
  position text,
  department_id uuid REFERENCES public.departments(id),
  start_date date,
  nationality text,
  contact_number text,
  email_address text,
  education text,
  birthday date,
  age integer,
  address text,
  emergency_contact_name text,
  emergency_contact_number text,
  emergency_contact_relationship text,
  linkedin_profile_url text,

  -- Step 2: Payment/Allowance Information
  payment_account_name text,
  payment_account_number text,
  payment_email text,
  payment_phone_number text,
  payment_address text,
  payment_city text,
  payment_province text,
  payment_zipcode text,

  -- Standard columns
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TYPE onboarding_document_type AS ENUM (
  'valid_id',
  'profile_photo',
  'cv',
  'birth_certificate'
);

CREATE TABLE public.onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_profile_id uuid NOT NULL REFERENCES public.onboarding_profiles(id) ON DELETE CASCADE,
  document_type onboarding_document_type NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(onboarding_profile_id, document_type, deleted_at)
);
```

**Onboarding Form Steps:**

- **Step 1 - Personal Information:**
  - Full Name (First, Middle, Last)
  - Position
  - Department (dropdown from departments table)
  - Start Date
  - Nationality
  - Contact Number
  - Email Address
  - Education
  - Birthday
  - Age (auto-calculated from birthday)
  - Address
  - Emergency Contact Name
  - Emergency Contact Number & Relationship
  - LinkedIn Profile Link

- **Step 2 - Allowance/Payment Information:**
  - Account Name
  - Account Number
  - Email
  - Phone Number
  - Address with Zipcode (City, Province, Zipcode)

- **Step 3 - Required Document Uploads:**
  - Upload Valid ID (any government-issued ID) - image/pdf, max 10MB
  - Upload Profile Photo - image only, max 5MB
  - Upload CV - pdf/doc/docx, max 10MB
  - Upload Birth Certificate - image/pdf, max 10MB

- **Step 4 - Review & Confirm:**
  - Display all entered data for review
  - Confirm and submit

**Implementation Checklist:**

- [ ] **Create migration for onboarding profiles and documents tables**
  - File: `supabase/migrations/20260211000001_create_onboarding_profiles.sql`
  - Include RLS policies (self-access for users, read-all for HR/Admin)
  - Include indexes on user_id, is_completed, current_step

- [ ] **Create Supabase Storage bucket `onboarding-documents`**
  - Private bucket, 10MB file limit
  - Allowed MIME types: image/jpeg, image/png, image/gif, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - RLS policy: users can only access their own folder `{user_id}/`

- [ ] **Create Zod validation schemas**
  - File: `apps/web/src/lib/schemas/onboarding.schema.ts`
  - Schemas: `personalInfoSchema`, `paymentInfoSchema`, `documentsSchema`, `completeOnboardingSchema`

- [ ] **Create onboarding API routes**
  - File: `apps/web/src/app/api/onboarding/profile/route.ts` (GET, POST)
  - File: `apps/web/src/app/api/onboarding/profile/step/route.ts` (PATCH - update specific step data)
  - File: `apps/web/src/app/api/onboarding/profile/complete/route.ts` (POST - finalize and migrate to employees table)
  - File: `apps/web/src/app/api/onboarding/documents/route.ts` (POST upload, GET list)
  - File: `apps/web/src/app/api/onboarding/documents/[id]/route.ts` (DELETE)
  - File: `apps/web/src/app/api/onboarding/documents/[id]/preview/route.ts` (GET signed URL)

- [ ] **Create TanStack Query hooks**
  - File: `apps/web/src/hooks/useOnboardingProfile.ts`
  - File: `apps/web/src/hooks/useCreateOnboardingProfile.ts`
  - File: `apps/web/src/hooks/useUpdateOnboardingProfile.ts`
  - File: `apps/web/src/hooks/useUploadOnboardingDocument.ts`
  - File: `apps/web/src/hooks/useOnboardingWizard.ts` (state management with sessionStorage draft persistence)

- [ ] **Add onboarding query keys**
  - File: `apps/web/src/lib/query-keys.ts`

- [ ] **Create onboarding setup UI components**
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/OnboardingWizard.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/ProgressStepper.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepPersonalInfo.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepPaymentInfo.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepDocuments.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepReview.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/NavigationControls.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/DocumentUploadCard.tsx`

- [ ] **Create onboarding setup pages**
  - File: `apps/web/src/app/(employee)/onboarding/setup/layout.tsx` (full-screen centered layout, no sidebar/header)
  - File: `apps/web/src/app/(employee)/onboarding/setup/page.tsx` (wizard container)
  - File: `apps/web/src/app/(employee)/onboarding/complete/page.tsx` (success/confirmation page)

- [ ] **Update middleware for onboarding redirect**
  - File: `apps/web/src/middleware.ts`
  - Check `onboarding_profiles.is_completed` for authenticated users
  - Redirect to `/onboarding/setup` if onboarding incomplete
  - Exempt paths: `/onboarding/setup`, `/onboarding/complete`, `/api/onboarding/*`

- [ ] **Update AuthContext with onboarding status**
  - File: `apps/web/src/contexts/AuthContext.tsx`
  - Add `isOnboardingComplete` flag to User interface
  - Query `onboarding_profiles` during session build

- [ ] **Update database types**
  - File: `packages/database/src/database.types.ts`
  - Add `OnboardingProfile`, `OnboardingDocument`, `OnboardingStep`, `OnboardingDocumentType` types

- [ ] **Write unit tests for onboarding schemas**
  - File: `tests/schemas/onboarding.test.ts`

- [ ] **Write unit tests for onboarding wizard hook**
  - File: `tests/hooks/useOnboardingWizard.test.ts`

- [ ] **Write E2E tests for onboarding flow**
  - File: `e2e/onboarding.spec.ts`
  - Tests: redirect on first login, complete full wizard, save draft and resume, validation errors

### 3.4 Offboarding/Exit Automation

**Database Schema Required:**
```sql
CREATE TYPE offboarding_status AS ENUM ('initiated', 'in_progress', 'completed');
CREATE TYPE exit_type AS ENUM ('resignation', 'termination', 'end_of_contract', 'retirement');

CREATE TABLE public.offboarding (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  exit_type exit_type NOT NULL,
  last_working_day date NOT NULL,
  status offboarding_status NOT NULL DEFAULT 'initiated',
  exit_interview_date timestamptz,
  exit_interview_notes text,
  initiated_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.offboarding_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  offboarding_id uuid NOT NULL REFERENCES public.offboarding(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL, -- 'access', 'equipment', 'documents', 'knowledge_transfer'
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for offboarding tables**
  - File: `supabase/migrations/20260210000007_create_offboarding_tables.sql`

- [ ] **Create offboarding workflow**
  - File: `n8n/workflows/offboarding-exit-process.json`
  - Trigger: Webhook when offboarding initiated
  - Actions:
    - Create offboarding checklist
    - Notify IT to revoke access on last day
    - Schedule exit interview
    - Generate clearance document
    - Archive employee documents

### 3.5 Leave Management

**Database Schema Required:**
```sql
CREATE TYPE leave_type AS ENUM ('vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE public.leave_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  leave_type leave_type NOT NULL,
  year integer NOT NULL,
  total_days numeric(5,2) NOT NULL,
  used_days numeric(5,2) DEFAULT 0,
  pending_days numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(employee_id, leave_type, year)
);

CREATE TABLE public.leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_requested numeric(5,2) NOT NULL,
  reason text,
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for leave tables**
  - File: `supabase/migrations/20260210000008_create_leave_tables.sql`

- [ ] **Create leave request workflow**
  - File: `n8n/workflows/leave-request-approval.json`
  - Trigger: Webhook when leave request created
  - Actions:
    - Notify manager for approval
    - On approval: Update balance, notify employee
    - On rejection: Notify employee with reason

- [ ] **Create leave API routes**
  - File: `apps/web/src/app/api/leave/requests/route.ts`
  - File: `apps/web/src/app/api/leave/balance/route.ts`

---

## Phase 4: Performance Management

### 4.1 Performance Review System

**Database Schema Required:**
```sql
CREATE TYPE review_cycle_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE review_status AS ENUM ('pending', 'self_review', 'manager_review', 'completed');

CREATE TABLE public.review_cycles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  self_review_deadline date,
  manager_review_deadline date,
  status review_cycle_status NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.performance_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.review_cycles(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  reviewer_id uuid REFERENCES public.users(id),
  status review_status NOT NULL DEFAULT 'pending',
  self_rating integer CHECK (self_rating >= 1 AND self_rating <= 5),
  self_comments text,
  manager_rating integer CHECK (manager_rating >= 1 AND manager_rating <= 5),
  manager_comments text,
  final_rating integer CHECK (final_rating >= 1 AND final_rating <= 5),
  goals_for_next_period text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for performance tables**
  - File: `supabase/migrations/20260210000009_create_performance_tables.sql`

- [ ] **Create OKRs table**
  ```sql
  CREATE TABLE public.okrs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id uuid NOT NULL REFERENCES public.employees(id),
    cycle_id uuid REFERENCES public.review_cycles(id),
    objective text NOT NULL,
    key_results jsonb NOT NULL DEFAULT '[]',
    progress numeric(5,2) DEFAULT 0,
    status text DEFAULT 'in_progress',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  );
  ```

- [ ] **Create KPIs table**
  ```sql
  CREATE TABLE public.kpis (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id uuid NOT NULL REFERENCES public.employees(id),
    name text NOT NULL,
    target_value numeric NOT NULL,
    current_value numeric DEFAULT 0,
    unit text,
    period_start date NOT NULL,
    period_end date NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  );
  ```

- [ ] **Create performance API routes**
  - File: `apps/web/src/app/api/performance/reviews/route.ts`
  - File: `apps/web/src/app/api/performance/okrs/route.ts`
  - File: `apps/web/src/app/api/performance/kpis/route.ts`
  - File: `apps/web/src/app/api/performance/cycles/route.ts`

- [ ] **Connect performance pages to real data**
  - Update `apps/web/src/app/(employee)/performance/page.tsx`
  - Update `apps/web/src/app/(employee)/performance/kpis/page.tsx`
  - Update `apps/web/src/app/(employee)/performance/okrs/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/performance/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/performance/cycles/page.tsx`

### 4.2 Probation Tracking

- [ ] **Create probation workflow**
  - File: `n8n/workflows/probation-tracking.json`
  - Trigger: Daily schedule
  - Logic: Check employees approaching probation end
  - Actions:
    - 30 days before: Notify manager to prepare evaluation
    - 14 days before: Send reminder
    - 7 days before: Escalate if no evaluation submitted
    - On end date: Auto-complete or extend based on evaluation

- [ ] **Create probation API routes**
  - File: `apps/web/src/app/api/probation/route.ts`
  - Includes endpoints for extending probation, completing evaluation

- [ ] **Connect probation page to real data**
  - Update `apps/web/src/app/(admin)/admin/probation/page.tsx`

---

## Phase 5: Internship Management

### 5.1 Internship Tracking

**Database Schema Required:**
```sql
CREATE TYPE internship_status AS ENUM ('active', 'completed', 'terminated', 'converted');

CREATE TABLE public.internships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  required_hours integer NOT NULL DEFAULT 480,
  completed_hours numeric(10,2) DEFAULT 0,
  status internship_status NOT NULL DEFAULT 'active',
  supervisor_id uuid REFERENCES public.users(id),
  department text NOT NULL,
  school text,
  program text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.intern_daily_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  internship_id uuid NOT NULL REFERENCES public.internships(id),
  log_date date NOT NULL,
  hours_worked numeric(4,2) NOT NULL,
  tasks_completed text NOT NULL,
  learnings text,
  challenges text,
  supervisor_notes text,
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(internship_id, log_date)
);
```

- [ ] **Create migration for internship tables**
  - File: `supabase/migrations/20260210000010_create_internship_tables.sql`

- [ ] **Create internship API routes**
  - File: `apps/web/src/app/api/internships/route.ts`
  - File: `apps/web/src/app/api/internships/[id]/route.ts`
  - File: `apps/web/src/app/api/internships/[id]/logs/route.ts`

- [ ] **Connect internship pages to real data**
  - Update `apps/web/src/app/(employee)/intern/dashboard/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/interns/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx`

### 5.2 EOD Report System

- [ ] **Create EOD reminder workflow**
  - File: `n8n/workflows/intern-eod-reminder.json`
  - Trigger: Daily at 4 PM
  - Logic: Check active interns without today's log
  - Action: Send Slack/email reminder

- [ ] **Create weekly hours summary workflow**
  - File: `n8n/workflows/intern-weekly-summary.json`
  - Trigger: Every Friday at 5 PM
  - Logic: Calculate weekly hours for each intern
  - Action: Send summary to supervisor

---

## Phase 6: AI Policy Assistant

### 6.1 Vector Database Setup

- [ ] **Enable pgvector extension in Supabase**
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

- [ ] **Create knowledge base tables**
  ```sql
  CREATE TABLE public.knowledge_sources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    source_type text NOT NULL, -- 'pdf', 'docx', 'url', 'manual'
    file_path text,
    url text,
    content text,
    metadata jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES auth.users(id)
  );

  CREATE TABLE public.knowledge_embeddings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    chunk_text text NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 dimension
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL
  );

  CREATE INDEX ON public.knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  ```

- [ ] **Create migration for knowledge tables**
  - File: `supabase/migrations/20260210000011_create_knowledge_tables.sql`

### 6.2 RAG Implementation

- [ ] **Implement packages/ai module**
  - File: `packages/ai/src/embeddings.ts` - Generate embeddings
  - File: `packages/ai/src/chat.ts` - Chat with context
  - File: `packages/ai/src/chunking.ts` - Document chunking

- [ ] **Create AI API routes**
  - File: `apps/web/src/app/api/ai/chat/route.ts`
  - File: `apps/web/src/app/api/ai/sources/route.ts`
  - File: `apps/web/src/app/api/ai/sources/[id]/route.ts`
  - File: `apps/web/src/app/api/ai/sources/upload/route.ts`

- [ ] **Create Supabase Edge Function for embeddings**
  - File: `supabase/functions/generate-embeddings/index.ts`
  - Trigger: On knowledge source insert
  - Action: Chunk document, generate embeddings, store

- [ ] **Connect AI knowledge pages to real data**
  - Update `apps/web/src/app/(admin)/admin/ai-knowledge/page.tsx`
  - Update `apps/web/src/app/(admin)/super-admin/ai-knowledge/page.tsx`

### 6.3 Chat Interface

- [ ] **Create chat hooks**
  - File: `apps/web/src/hooks/useAIChat.ts`
  - Streaming response support
  - Context retrieval
  - Chat history management

- [ ] **Update AIChatbot component with real API**
  - File: `packages/ui/src/components/AIChatbot.tsx`
  - Connect to /api/ai/chat
  - Implement streaming responses
  - Add source citations

---

## Phase 7: Stand-up Call Recordings

### 7.1 Recording Storage

**Database Schema Required:**
```sql
CREATE TABLE public.standup_recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  recording_date date NOT NULL,
  duration_seconds integer,
  file_path text NOT NULL,
  file_size bigint,
  transcript text,
  summary text,
  attendees uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.standup_topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id uuid NOT NULL REFERENCES public.standup_recordings(id) ON DELETE CASCADE,
  topic text NOT NULL,
  timestamp_start integer,
  timestamp_end integer,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

- [ ] **Create migration for standup tables**
  - File: `supabase/migrations/20260210000012_create_standup_tables.sql`

- [ ] **Create Supabase Storage bucket for recordings**
  - Bucket: `standup-recordings`
  - Configure appropriate size limits

- [ ] **Create standup API routes**
  - File: `apps/web/src/app/api/standups/route.ts`
  - File: `apps/web/src/app/api/standups/[id]/route.ts`
  - File: `apps/web/src/app/api/standups/upload/route.ts`

- [ ] **Create transcription Edge Function**
  - File: `supabase/functions/transcribe-recording/index.ts`
  - Use Whisper API or similar
  - Auto-generate summary with Claude

---

## Phase 8: Production Readiness

### 8.1 Security Hardening

- [ ] **Implement rate limiting**
  - File: `apps/web/src/middleware.ts`
  - Use Upstash Redis for distributed rate limiting
  - Configure limits per endpoint type

- [ ] **Add CSRF protection**
  - Implement for all mutation endpoints
  - Use double-submit cookie pattern

- [ ] **Security headers configuration**
  - File: `apps/web/next.config.ts`
  - Add CSP, HSTS, X-Frame-Options, etc.

- [ ] **Input sanitization audit**
  - Review all API routes for SQL injection
  - Review for XSS vulnerabilities
  - Validate all file uploads

### 8.2 Monitoring & Observability

- [ ] **Add Sentry error monitoring**
  ```bash
  cd apps/web && pnpm add @sentry/nextjs
  ```
  - File: `apps/web/sentry.client.config.ts`
  - File: `apps/web/sentry.server.config.ts`
  - File: `apps/web/sentry.edge.config.ts`

- [ ] **Add application logging**
  - Structured JSON logs
  - Log levels: debug, info, warn, error
  - PII redaction in logs

- [ ] **Create health check endpoint**
  - File: `apps/web/src/app/api/health/route.ts`
  - Check database connectivity
  - Check Supabase storage
  - Return version info

### 8.3 Testing Coverage

- [ ] **Unit tests for all hooks**
  - Minimum 80% coverage
  - Test error states
  - Test loading states

- [ ] **Integration tests for API routes**
  - Test authentication
  - Test authorization (RLS)
  - Test validation

- [ ] **E2E tests for critical flows**
  - Authentication flow
  - Employee profile CRUD
  - Document upload/download
  - Report submission and approval
  - Task assignment and completion
  - Leave request flow
  - Performance review cycle

### 8.4 Documentation

- [ ] **API documentation**
  - File: `docs/api/README.md`
  - Document all endpoints
  - Include request/response examples
  - Document error codes

- [ ] **Database documentation**
  - File: `docs/database/README.md`
  - ERD diagram
  - RLS policy documentation
  - Migration history

- [ ] **Deployment documentation**
  - File: `docs/deployment/README.md`
  - Environment variables
  - Supabase setup
  - n8n configuration
  - Vercel deployment

---

## Appendix: Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic (AI)
ANTHROPIC_API_KEY=

# n8n
N8N_WEBHOOK_URL=
N8N_API_KEY=

# Email (for notifications)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Sentry (monitoring)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Quick Start for New Developers

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in values
3. Run `pnpm install`
4. Run `pnpm db:migrate` to apply migrations
5. Run `pnpm db:seed` to seed test data
6. Run `pnpm dev` to start the development server
7. Access http://localhost:3000
8. Use test accounts from CLAUDE.md to log in

---

*Last Updated: 2026-02-10*
*Generated by SN Connect Architect Agent*
