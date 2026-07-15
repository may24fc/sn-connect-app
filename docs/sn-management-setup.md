# Control Hub HR Portal - Implementation Checklist

This document provides a comprehensive, actionable checklist for implementing the Control Hub HR Portal. Tasks are organized by phase and domain, with clear dependencies and file locations.

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
- [x] Associate: /associate/dashboard
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
- [x] Implement 4 test accounts (employee, associate, admin, super_admin)
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

**Problem:** Database has 6 roles (admin, hr, cos, ceo, employee, associate) but UI uses 4 roles (super_admin, admin, employee, associate). This mismatch will cause authorization bugs.

**Decision Required:** Choose one approach:
- Option A: Add `super_admin` to database enum, keep 4 UI roles
- Option B: Map multiple DB roles to UI roles (hr+cos+ceo = admin)
- Option C: Expose all 6 roles in UI

- [x] **Create ADR document for role mapping decision**
  - File: [docs/adr/ADR-001-role-mapping.md](docs/adr/ADR-001-role-mapping.md)
  - Document the chosen approach and rationale

- [x] **If Option A chosen: Create migration to add super_admin role**
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

- [x] **Install form libraries**
  ```bash
  cd apps/web && pnpm add react-hook-form @hookform/resolvers zod
  ```

- [x] **Create Zod schemas for all entities**
  - File: `apps/web/src/lib/schemas/auth.schema.ts`
  - File: `apps/web/src/lib/schemas/employee.schema.ts`
  - File: `apps/web/src/lib/schemas/document.schema.ts`
  - File: `apps/web/src/lib/schemas/report.schema.ts`
  - File: `apps/web/src/lib/schemas/task.schema.ts`

- [x] **Create reusable form components with React Hook Form**
  - File: `packages/ui/src/components/forms/Form.tsx`
  - File: `packages/ui/src/components/forms/FormField.tsx`
  - File: `packages/ui/src/components/forms/FormInput.tsx`
  - File: `packages/ui/src/components/forms/FormSelect.tsx`
  - File: `packages/ui/src/components/forms/FormTextarea.tsx`

### 1.4 Query Keys Factory

- [x] **Create centralized query key factory**
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

- [x] **Create employees API route**
  - File: `apps/web/src/app/api/employees/route.ts`
  - GET: List employees with pagination, search, filters
  - POST: Create new employee (HR/Admin/Super Admin only)
  - Validate JWT, apply RLS through Supabase client

- [x] **Create employee detail API route**
  - File: `apps/web/src/app/api/employees/[id]/route.ts`
  - GET: Single employee details
  - PATCH: Update employee
  - DELETE: Soft delete employee

- [x] **Create employee hooks**
  - File: `apps/web/src/hooks/useEmployees.ts`
  - Includes: useEmployees, useEmployee, useCreateEmployee, useUpdateEmployee, useDeleteEmployee

- [x] **Connect /profile page to real data**
  - Update `apps/web/src/app/(employee)/profile/page.tsx`
  - Fetches logged-in user's employee record
  - Enabled profile editing with form validation

- [x] **Add unit tests for employee hooks**
  - File: `tests/hooks/useEmployees.test.ts`
  - 35+ test cases covering all hooks with filters, pagination, error handling

### 1.6 Documents/Files API

- [x] **Configure Supabase Storage bucket**
  - Create bucket: `employee-documents`
  - Set RLS policies matching documents table access
  - Note: Need to configure this in Supabase dashboard

- [x] **Create documents API routes**
  - File: `apps/web/src/app/api/documents/route.ts`
  - GET: List documents for employee
  - POST: Create document metadata

- [x] **Create document upload API route**
  - File: `apps/web/src/app/api/documents/upload/route.ts`
  - Handles multipart form data
  - Uploads to Supabase Storage
  - Creates document record in database
  - Includes file validation (size, type)

- [x] **Create document download API route**
  - File: `apps/web/src/app/api/documents/[id]/download/route.ts`
  - Generates signed URL from Supabase Storage
  - Checks access permissions via RLS

- [x] **Create document hooks**
  - File: `apps/web/src/hooks/useDocuments.ts`
  - Includes: useDocuments, useUploadDocument, useDownloadDocument

- [x] **Connect /files page to real data**
  - Updated `apps/web/src/app/(employee)/files/page.tsx`
  - Implemented file upload with document type selection
  - Implemented file download with signed URLs
  - Shows document list with real-time data

### 1.7 Departments API

- [x] **Create departments API routes**
  - File: `apps/web/src/app/api/departments/route.ts`
  - GET: List all departments with pagination
  - POST: Create department (Admin/Super Admin only)

- [x] **Create department hooks**
  - File: `apps/web/src/hooks/useDepartments.ts`
  - Includes: useDepartments, useCreateDepartment

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

- [x] **Create migration for reports tables**
  - File: `supabase/migrations/20260210000002_create_reports_tables.sql`
  - Include RLS policies for employee self-access, manager access, admin access
- [x] **Create reports API routes**
  - File: `apps/web/src/app/api/reports/route.ts`
  - File: `apps/web/src/app/api/reports/[id]/route.ts`
  - File: `apps/web/src/app/api/reports/[id]/submit/route.ts`
  - File: `apps/web/src/app/api/reports/[id]/approve/route.ts`
- [x] **Create reports hooks**
  - File: `apps/web/src/hooks/useReports.ts`
  - File: `apps/web/src/hooks/useReport.ts`
  - File: `apps/web/src/hooks/useCreateReport.ts`
  - File: `apps/web/src/hooks/useSubmitReport.ts`
- [x] **Connect reports pages to real data**
  - Update `apps/web/src/app/(employee)/reports/page.tsx`
  - Update `apps/web/src/app/(employee)/reports/new/page.tsx`
  - Update `apps/web/src/app/(employee)/reports/[id]/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/reports/page.tsx`

 - [x] **Create migration for reports tables**
   - File: `supabase/migrations/20260210000002_create_reports_tables.sql`
   - Include RLS policies for employee self-access, manager access, admin access

 - [x] **Create reports API routes**
   - File: `apps/web/src/app/api/reports/route.ts`
   - File: `apps/web/src/app/api/reports/[id]/route.ts`
   - File: `apps/web/src/app/api/reports/[id]/submit/route.ts`
   - File: `apps/web/src/app/api/reports/[id]/approve/route.ts`

 - [x] **Create reports hooks**
   - File: `apps/web/src/hooks/useReports.ts`
   - File: `apps/web/src/hooks/useReport.ts`
   - File: `apps/web/src/hooks/useCreateReport.ts`
   - File: `apps/web/src/hooks/useSubmitReport.ts`

 - [x] **Connect reports pages to real data**
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

- [x] **Create migration for tasks tables**
  - File: `supabase/migrations/20260210000003_create_tasks_tables.sql`
  - Include RLS policies
- [x] **Create tasks API routes**
  - File: `apps/web/src/app/api/tasks/route.ts`
  - File: `apps/web/src/app/api/tasks/[id]/route.ts`
  - File: `apps/web/src/app/api/tasks/[id]/comments/route.ts`
- [x] **Create tasks hooks**
  - File: `apps/web/src/hooks/useTasks.ts`
  - File: `apps/web/src/hooks/useTask.ts`
  - File: `apps/web/src/hooks/useCreateTask.ts`
  - File: `apps/web/src/hooks/useUpdateTask.ts`
- [x] **Connect tasks pages to real data**
  - Update `apps/web/src/app/(employee)/tasks/page.tsx`
  - Update `apps/web/src/app/(employee)/tasks/[id]/page.tsx`
  - Update `apps/web/src/app/(admin)/super-admin/tasks/page.tsx`

 - [x] **Create migration for tasks tables**
   - File: `supabase/migrations/20260210000003_create_tasks_tables.sql`
   - Include RLS policies

 - [x] **Create tasks API routes**
   - File: `apps/web/src/app/api/tasks/route.ts`
   - File: `apps/web/src/app/api/tasks/[id]/route.ts`
   - File: `apps/web/src/app/api/tasks/[id]/comments/route.ts`

 - [x] **Create tasks hooks**
   - File: `apps/web/src/hooks/useTasks.ts`
   - File: `apps/web/src/hooks/useTask.ts`
   - File: `apps/web/src/hooks/useCreateTask.ts`
   - File: `apps/web/src/hooks/useUpdateTask.ts`

 - [x] **Connect tasks pages to real data**
   - Update `apps/web/src/app/(employee)/tasks/page.tsx`
   - Update `apps/web/src/app/(employee)/tasks/[id]/page.tsx`
   - Update `apps/web/src/app/(admin)/super-admin/tasks/page.tsx`

### 2.3 Payroll/Invoice System

**Overview:** Manages employee invoicing and payroll processing with WISE integration for international money transfers. This system handles invoice creation, approval workflows, and automated payment processing via the WISE API.

**WISE Integration:** This system will integrate with WISE (formerly TransferWise) for secure, cost-effective international money transfers. WISE API enables automated batch payments to employees across multiple currencies with competitive exchange rates.

**Database Schema Required:**
```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');
CREATE TYPE payment_method AS ENUM ('wise', 'bank_transfer', 'check', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_amount numeric(12,2) NOT NULL,
  deductions numeric(12,2) DEFAULT 0,
  net_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status invoice_status NOT NULL DEFAULT 'draft',
  payment_method payment_method DEFAULT 'wise',
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

-- WISE payments tracking table
CREATE TABLE public.wise_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  wise_transfer_id text NOT NULL UNIQUE,
  wise_quote_id text NOT NULL,
  recipient_id text NOT NULL,
  source_currency text NOT NULL,
  target_currency text NOT NULL,
  source_amount numeric(12,2) NOT NULL,
  target_amount numeric(12,2) NOT NULL,
  fee numeric(12,2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  wise_status text,
  error_message text,
  initiated_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Employee banking information for WISE
CREATE TABLE public.employee_banking_info (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) UNIQUE,
  wise_recipient_id text,
  account_holder_name text NOT NULL,
  bank_name text,
  account_number text, -- Encrypted in production
  routing_number text,
  swift_code text,
  iban text,
  account_type text,
  currency text NOT NULL DEFAULT 'USD',
  country_code text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
```

- [x] **Create migration for invoices tables**
  - File: `supabase/migrations/20260210000004_create_invoices_tables.sql`
  - Updated to include WISE-related tables and enums

- [x] **Create payroll API routes**
  - File: `apps/web/src/app/api/invoices/route.ts`
  - File: `apps/web/src/app/api/invoices/[id]/route.ts`
  - File: `apps/web/src/app/api/invoices/[id]/submit/route.ts`
  - File: `apps/web/src/app/api/invoices/[id]/approve/route.ts`

- [x] **Connect payroll pages to real data**
  - Update `apps/web/src/app/(employee)/payroll/page.tsx`
  - Update `apps/web/src/app/(admin)/super-admin/payroll-approvals/page.tsx`

#### WISE Integration Implementation (To Be Done)

**Prerequisites:**
- [ ] Create WISE Business Account at business.wise.com
- [ ] Complete business verification (KYC/AML compliance)
- [ ] Generate API keys from WISE dashboard (use Sandbox for testing)
- [ ] Add environment variables:
  - `WISE_API_KEY` - API authentication token
  - `WISE_PROFILE_ID` - Business profile ID
  - `WISE_WEBHOOK_SECRET` - For webhook verification
  - `WISE_ENVIRONMENT` - 'sandbox' or 'production'

**WISE SDK Setup:**
- [ ] **Install WISE dependencies**
  ```bash
  cd apps/web && pnpm add @wise/api-client
  cd packages/ai && pnpm add @wise/api-client
  ```

- [ ] **Create WISE client utility**
  - File: `apps/web/src/lib/wise/client.ts`
  - Initialize WISE API client with credentials
  - Implement error handling and retry logic
  - Add rate limiting compliance (5 requests/second)

- [ ] **Create WISE service layer**
  - File: `apps/web/src/lib/wise/service.ts`
  - Functions:
    - `createRecipient(employeeData)` - Create WISE recipient account
    - `createQuote(amount, sourceCurrency, targetCurrency)` - Get transfer quote
    - `createTransfer(quoteId, recipientId)` - Initiate transfer
    - `fundTransfer(transferId)` - Fund approved transfer
    - `getTransferStatus(transferId)` - Check transfer status
    - `cancelTransfer(transferId)` - Cancel pending transfer

**API Routes for WISE Integration:**
- [ ] **Create employee banking info API routes**
  - File: `apps/web/src/app/api/employees/[id]/banking/route.ts`
  - GET: Retrieve employee banking info (masked for security)
  - POST: Create/update banking info
  - POST: Verify banking info with WISE
  - DELETE: Remove banking info

- [ ] **Create WISE payment API routes**
  - File: `apps/web/src/app/api/wise/quote/route.ts`
  - POST: Generate transfer quote for invoice amount
  
  - File: `apps/web/src/app/api/wise/recipients/route.ts`
  - POST: Create WISE recipient from employee banking info
  - GET: List all WISE recipients
  
  - File: `apps/web/src/app/api/wise/transfers/route.ts`
  - POST: Create transfer for approved invoice
  - GET: List transfers with status
  
  - File: `apps/web/src/app/api/wise/transfers/[id]/route.ts`
  - GET: Get transfer details and status
  - POST: Fund transfer (execute payment)
  - DELETE: Cancel transfer
  
  - File: `apps/web/src/app/api/wise/webhook/route.ts`
  - POST: Handle WISE webhook events (transfer status updates)
  - Verify webhook signature
  - Update payment status in database

**Hooks for WISE Integration:**
- [ ] **Create banking hooks**
  - File: `apps/web/src/hooks/useBankingInfo.ts`
  - `useBankingInfo(employeeId)` - Fetch banking info
  - `useCreateBankingInfo()` - Add banking details
  - `useVerifyBankingInfo()` - Verify with WISE
  
- [ ] **Create WISE payment hooks**
  - File: `apps/web/src/hooks/useWisePayments.ts`
  - `useWiseQuote(amount, currencies)` - Get transfer quote
  - `useCreateWiseTransfer()` - Initiate WISE transfer
  - `useFundWiseTransfer()` - Execute payment
  - `useWiseTransferStatus(transferId)` - Poll transfer status

**UI Components:**
- [ ] **Create BankingInfoForm component**
  - File: `packages/ui/src/components/payroll/BankingInfoForm.tsx`
  - Form for employee to enter banking details
  - Support multiple account types (ACH, SWIFT, IBAN)
  - Real-time validation with WISE API
  
- [ ] **Create WiseTransferCard component**
  - File: `packages/ui/src/components/payroll/WiseTransferCard.tsx`
  - Display transfer details (amount, fees, exchange rate)
  - Show transfer status with progress indicator
  - Estimated arrival time
  
- [ ] **Create PaymentApprovalPanel component**
  - File: `packages/ui/src/components/payroll/PaymentApprovalPanel.tsx`
  - Batch approval interface for multiple invoices
  - Generate WISE quotes for selected invoices
  - Execute bulk payments

**n8n Workflows for WISE Automation:**
- [ ] **Create automated payment workflow**
  - File: `n8n/workflows/payroll-wise-auto-payment.json`
  - Trigger: Invoice approved in database
  - Steps:
    1. Fetch employee banking info
    2. Generate WISE quote
    3. Create transfer
    4. Fund transfer (if auto-payment enabled)
    5. Update invoice status
    6. Send notification to employee
  
- [ ] **Create payment status monitoring workflow**
  - File: `n8n/workflows/payroll-wise-status-monitor.json`
  - Trigger: Schedule (every 30 minutes)
  - Steps:
    1. Fetch pending/processing WISE transfers
    2. Check status via WISE API
    3. Update database
    4. Notify on completion or failure
  
- [ ] **Create failed payment handling workflow**
  - File: `n8n/workflows/payroll-wise-failure-handler.json`
  - Trigger: WISE webhook (transfer failed)
  - Steps:
    1. Log failure reason
    2. Notify finance team
    3. Create remediation task
    4. Send employee notification

**Security & Compliance:**
- [ ] **Implement encryption for sensitive banking data**
  - Use Supabase Vault or AWS KMS for encryption at rest
  - Never log or expose full account numbers
  - Mask account numbers in UI (show only last 4 digits)
  
- [ ] **Add audit logging for all WISE operations**
  - Log all payment initiations, approvals, and status changes
  - Track API calls and responses (without sensitive data)
  - Maintain immutable audit trail
  
- [ ] **Implement rate limiting**
  - Comply with WISE API rate limits (5 req/sec)
  - Add exponential backoff for retries
  - Queue batch payments to avoid throttling
  
- [ ] **Add fraud detection**
  - Verify invoice amount matches WISE transfer amount
  - Flag suspicious patterns (duplicate payments, unusual amounts)
  - Require MFA for payment approval above threshold

**Testing:**
- [ ] **Test with WISE Sandbox environment**
  - Create test recipients
  - Simulate transfers with test funds
  - Test webhook event handling
  - Verify error scenarios (insufficient funds, invalid recipient)
  
- [ ] **Create unit tests for WISE service**
  - File: `tests/lib/wise/service.test.ts`
  - Test all WISE API wrapper functions
  - Mock API responses
  
- [ ] **Create E2E tests for payment flow**
  - File: `e2e/payroll-wise-payment.spec.ts`
  - Test: Create invoice → Approve → Generate quote → Execute transfer
  - Test: Payment status updates
  - Test: Failed payment handling

**Documentation:**
- [ ] **Create WISE integration guide**
  - File: `docs/wise-integration.md`
  - Setup instructions
  - API reference
  - Troubleshooting guide
  - Currency support matrix
  
- [ ] **Create employee banking setup guide**
  - File: `docs/guides/employee-banking-setup.md`
  - How to add banking information
  - Supported countries and account types
  - Security best practices

**Notes:**
- WISE supports 160+ countries and 50+ currencies
- Standard transfer time: 1-2 business days
- Fees: ~0.5-1% of transfer amount (significantly lower than traditional banks)
- Requires business verification (can take 1-3 business days)
- Consider multi-currency holding accounts for cost optimization
- Implement currency conversion strategy (lock rates vs. spot rates)

### 2.4 Announcements System
**Status:** ✅ Implemented — backend migration, API routes, hooks, UI components, tests, and automation workflows added.

**Key files added/updated:**
- `supabase/migrations/20260210000005_create_announcements_tables.sql`
- `apps/web/src/app/api/announcements/**` (list, detail, publish, archive, pin, feed, read, comments, attachments, analytics)
- `apps/web/src/lib/schemas/announcement.schema.ts`
- `apps/web/src/lib/query-keys.ts` (announcements/resources keys)
- `apps/web/src/hooks/*` (useAnnouncements, useAnnouncementFeed, useAnnouncement, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement, usePublishAnnouncement, useArchiveAnnouncement, useToggleAnnouncementPin, useMarkAnnouncementRead, useUploadAnnouncementAttachment)
- `packages/ui/src/components/announcements/*` (AnnouncementCard, AnnouncementEditor, AnnouncementFilters, AttachmentUploader, TargetingSelector, AnnouncementAnalytics, etc.)
- `apps/web/src/app/(admin)/admin/announcements/*` and `apps/web/src/app/(employee)/announcements/page.tsx`
- `tests/hooks/useAnnouncements.test.tsx`, `tests/hooks/useAnnouncementFeed.test.tsx`, `tests/hooks/useCreateAnnouncement.test.tsx`
- `n8n/workflows/announcements-auto-publish.json`, `n8n/workflows/announcements-auto-expire.json`

**Notes:** Editor diagnostics/type-check were run and are clean; runtime smoke tests (API + storage/RLS + uploads) recommended next.

This feature provides a comprehensive announcement management system for HR/Admin/Super Admin to create, schedule, and distribute company-wide communications. Employees see a curated feed of relevant announcements based on their role, department, and other targeting criteria.

#### Feature Overview

**Admin/Super Admin Capabilities:**
- Create, edit, delete, and schedule announcements
- Target specific audiences (roles, departments, individual employees)
- Set priority levels (low, normal, high, urgent)
- Pin important announcements to the top
- Schedule publish/expiration dates for automatic visibility control
- Attach files (PDFs, images) to announcements
- Categorize announcements (HR Updates, Benefits, Events, Performance, Training, Policy, General, Emergency)
- View analytics (read counts, engagement metrics)
- Preview announcements before publishing

**Employee/Associate Experience:**
- View announcements filtered by relevance (role, department)
- Filter by category and read/unread status
- Search announcements
- Mark announcements as read
- Access announcement attachments
- View announcement history

**Supported Announcement Types:**
1. **Company-Wide Announcements** - All employees
2. **Department-Specific** - Engineering, HR, Marketing, Sales, etc.
3. **Role-Based** - Interns, employees, managers, admins
4. **Urgent/Emergency Alerts** - High-priority system-wide notifications
5. **Policy Updates** - Changes to company policies, handbooks
6. **Event Announcements** - Town halls, team events, celebrations
7. **Training/Learning** - Course launches, workshops, certifications
8. **Benefits Updates** - Health insurance, perks, compensation changes
9. **Performance Cycles** - Review periods, deadlines
10. **Scheduled Announcements** - Published at a future date/time

**Database Schema Required:**
```sql
-- Migration: supabase/migrations/20260210000005_create_announcements_tables.sql

CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE announcement_status AS ENUM ('draft', 'scheduled', 'published', 'expired', 'archived');
CREATE TYPE announcement_category AS ENUM (
  'hr_updates',
  'benefits',
  'events',
  'performance',
  'training',
  'policy',
  'general',
  'emergency'
);

CREATE TABLE public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text, -- Short summary for list view (auto-generated from first 200 chars if null)

  -- Classification
  category announcement_category NOT NULL DEFAULT 'general',
  priority announcement_priority NOT NULL DEFAULT 'normal',
  status announcement_status NOT NULL DEFAULT 'draft',

  -- Scheduling
  published_at timestamptz, -- Null = draft, future = scheduled, past = published
  expires_at timestamptz,   -- Null = never expires

  -- Targeting
  target_roles user_role[] DEFAULT '{}', -- Empty array = all roles
  target_departments uuid[] DEFAULT '{}', -- Empty array = all departments
  target_employees uuid[] DEFAULT '{}',   -- Specific employees (overrides role/dept)

  -- Display Options
  is_pinned boolean DEFAULT false,
  allow_comments boolean DEFAULT false,

  -- Attachments
  has_attachments boolean DEFAULT false,

  -- Metadata
  author_id uuid NOT NULL REFERENCES public.users(id),
  read_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Announcement attachments (files, images, PDFs)
CREATE TABLE public.announcement_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL, -- Supabase Storage path
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Track which employees have read announcements
CREATE TABLE public.announcement_reads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(announcement_id, user_id)
);

-- Optional: Announcement comments (if allow_comments = true)
CREATE TABLE public.announcement_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Resources library (handbooks, forms, templates, guides)
CREATE TABLE public.resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text NOT NULL, -- 'handbook', 'form', 'template', 'guide', 'policy'
  file_path text,
  external_url text,
  is_public boolean DEFAULT false, -- If true, visible to all roles
  target_roles user_role[] DEFAULT '{}',
  downloads_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at);
CREATE INDEX idx_announcements_category ON public.announcements(category);
CREATE INDEX idx_announcements_priority ON public.announcements(priority);
CREATE INDEX idx_announcements_is_pinned ON public.announcements(is_pinned);
CREATE INDEX idx_announcement_reads_user_id ON public.announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);

-- RLS Policies

-- Announcements: Employees can only see published, non-expired announcements targeted to them
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements FORCE ROW LEVEL SECURITY;

CREATE POLICY announcements_employee_select_policy ON public.announcements
  FOR SELECT
  USING (
    -- Must be published and not expired
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted_at IS NULL
    AND (
      -- Targeted to user's role (or no role targeting)
      (cardinality(target_roles) = 0) OR
      (get_user_role(auth.uid()) = ANY(target_roles))
    )
    AND (
      -- Targeted to user's department (or no department targeting)
      (cardinality(target_departments) = 0) OR
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.department_id = ANY(target_departments)
      )
    )
    AND (
      -- Targeted to specific employees (or no employee targeting)
      (cardinality(target_employees) = 0) OR
      (auth.uid() = ANY(target_employees))
    )
  );

-- Announcements: Admin/HR/Super Admin can see all announcements
CREATE POLICY announcements_admin_all_policy ON public.announcements
  FOR ALL
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Announcement Attachments: Follow announcement access
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_attachments_select_policy ON public.announcement_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id
      -- Employee can see attachment if they can see the announcement
      AND (
        (
          a.status = 'published'
          AND (a.published_at IS NULL OR a.published_at <= now())
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND a.deleted_at IS NULL
        ) OR
        user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
      )
    )
  );

-- Announcement Reads: Users can only insert/select their own reads
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_reads_self_policy ON public.announcement_reads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Announcement Reads: Admins can see all reads (for analytics)
CREATE POLICY announcement_reads_admin_select_policy ON public.announcement_reads
  FOR SELECT
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Resources: Similar targeting logic
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY resources_employee_select_policy ON public.resources
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      is_public = true OR
      (cardinality(target_roles) = 0) OR
      (get_user_role(auth.uid()) = ANY(target_roles)) OR
      user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    )
  );

CREATE POLICY resources_admin_all_policy ON public.resources
  FOR ALL
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );
```

**Implementation Checklist:**

 - [x] **Create migration for announcements tables**
  - File: `supabase/migrations/20260210000005_create_announcements_tables.sql`
  - Include all tables: announcements, announcement_attachments, announcement_reads, announcement_comments, resources
  - Include all RLS policies for employee read access and admin full access
  - Include indexes for performance

 - [x] **Create Supabase Storage bucket `announcement-attachments`**
  - Private bucket, 10MB file limit per file
  - Allowed MIME types: image/jpeg, image/png, image/gif, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - RLS policy: users can only access attachments for announcements they can view

 - [x] **Create Zod validation schemas**
  - File: `apps/web/src/lib/schemas/announcement.schema.ts`
  - Schemas: `createAnnouncementSchema`, `updateAnnouncementSchema`, `announcementFiltersSchema`, `announcementAttachmentSchema`

 - [x] **Update query keys factory**
  - File: `apps/web/src/lib/query-keys.ts`
  - Add comprehensive announcement query keys (list, detail, drafts, scheduled, analytics)

 - [x] **Create announcements API routes (Admin/Super Admin)**
  - File: `apps/web/src/app/api/announcements/route.ts` (GET list with filters, POST create)
  - File: `apps/web/src/app/api/announcements/[id]/route.ts` (GET detail, PATCH update, DELETE soft delete)
  - File: `apps/web/src/app/api/announcements/[id]/publish/route.ts` (POST publish announcement)
  - File: `apps/web/src/app/api/announcements/[id]/archive/route.ts` (POST archive announcement)
  - File: `apps/web/src/app/api/announcements/[id]/pin/route.ts` (POST/DELETE toggle pin)
  - File: `apps/web/src/app/api/announcements/[id]/attachments/route.ts` (GET list, POST upload)
  - File: `apps/web/src/app/api/announcements/[id]/attachments/[attachmentId]/route.ts` (DELETE)
  - File: `apps/web/src/app/api/announcements/[id]/analytics/route.ts` (GET read counts, engagement)

 - [x] **Create announcements API routes (Employee/Associate)**
  - File: `apps/web/src/app/api/announcements/feed/route.ts` (GET targeted announcements for current user)
  - File: `apps/web/src/app/api/announcements/[id]/read/route.ts` (POST mark as read)
  - File: `apps/web/src/app/api/announcements/[id]/comments/route.ts` (GET, POST comments if enabled)

 - [x] **Create resources API routes**
  - File: `apps/web/src/app/api/resources/route.ts` (GET list, POST create - admin only)
  - File: `apps/web/src/app/api/resources/[id]/route.ts` (GET, PATCH, DELETE - admin only)
  - File: `apps/web/src/app/api/resources/[id]/download/route.ts` (GET signed URL)

 - [x] **Create TanStack Query hooks**
  - File: `apps/web/src/hooks/useAnnouncements.ts` (list with filters for admin)
  - File: `apps/web/src/hooks/useAnnouncement.ts` (single announcement detail)
  - File: `apps/web/src/hooks/useCreateAnnouncement.ts` (create announcement)
  - File: `apps/web/src/hooks/useUpdateAnnouncement.ts` (update announcement)
  - File: `apps/web/src/hooks/useDeleteAnnouncement.ts` (soft delete)
  - File: `apps/web/src/hooks/usePublishAnnouncement.ts` (publish/unpublish)
  - File: `apps/web/src/hooks/useAnnouncementFeed.ts` (employee feed)
  - File: `apps/web/src/hooks/useMarkAnnouncementRead.ts` (mark as read)
  - File: `apps/web/src/hooks/useUploadAnnouncementAttachment.ts` (file upload)
  - File: `apps/web/src/hooks/useResources.ts` (resources library)

 - [x] **Create admin announcements management pages**
  - File: `apps/web/src/app/(admin)/admin/announcements/page.tsx`
    - Grid/card view of all announcements (drafts, scheduled, published, expired)
    - Filters: status, category, priority, date range, author
    - Search by title/content
    - Summary stat cards (total, drafts, scheduled, published, read count)
    - Quick actions: Create New, Bulk Archive, Bulk Delete
    - Table columns: Title, Category, Priority, Status, Published Date, Expires, Read Count, Actions
  - File: `apps/web/src/app/(admin)/admin/announcements/new/page.tsx`
    - Multi-step form: Basic Info → Targeting → Attachments → Preview → Publish
    - Rich text editor for announcement content
    - Category/priority selection
    - Audience targeting (roles, departments, specific employees)
    - Schedule publish/expiration dates
    - File attachment upload
    - Preview mode
    - Save as draft or publish immediately
  - File: `apps/web/src/app/(admin)/admin/announcements/[id]/page.tsx`
    - View/edit existing announcement
    - Tabbed layout: Details | Targeting | Attachments | Analytics
    - Analytics tab: read count, read rate, user breakdown, time-series chart
    - Quick actions: Publish/Unpublish, Pin/Unpin, Archive, Delete, Duplicate

- [x] **Create super-admin redirect pages**
  - File: `apps/web/src/app/(admin)/super-admin/announcements/page.tsx` (redirects to `/admin/announcements`)
  - File: `apps/web/src/app/(admin)/super-admin/announcements/new/page.tsx` (redirects to `/admin/announcements/new`)
  - File: `apps/web/src/app/(admin)/super-admin/announcements/[id]/page.tsx` (redirects to `/admin/announcements/[id]`)

- [x] **Update employee announcements page to use real data**
  - File: `apps/web/src/app/(employee)/announcements/page.tsx`
  - Replace mock data with `useAnnouncementFeed` hook
  - Add read/unread filtering
  - Implement mark-as-read on announcement click
  - Add search functionality
  - Keep "My Growth" tab separate (learning/development resources)
  - Add infinite scroll or pagination
  - Show pinned announcements at top

- [x] **Update Sidebar navigation**
  - File: `packages/ui/src/layout/Sidebar.tsx`
  - Add "Announcements" item to `adminNavItems` and `superAdminNavItems`
  - Icon: `Megaphone` from lucide-react (already used for employee sidebar)
  - Path: `/admin/announcements` for admin, `/super-admin/announcements` for super_admin

- [x] **Create reusable announcement components**
  - File: `packages/ui/src/components/announcements/AnnouncementCard.tsx`
    - Card display for announcement (title, excerpt, category badge, priority indicator, date, read status)
  - File: `packages/ui/src/components/announcements/AnnouncementFilters.tsx`
    - Filter controls for status, category, priority, date range
  - File: `packages/ui/src/components/announcements/AnnouncementEditor.tsx`
    - Rich text editor wrapper (use Tiptap or similar)
  - File: `packages/ui/src/components/announcements/TargetingSelector.tsx`
    - Multi-select for roles, departments, employees
  - File: `packages/ui/src/components/announcements/AnnouncementPreview.tsx`
    - Preview how announcement will appear to employees
  - File: `packages/ui/src/components/announcements/AttachmentUploader.tsx`
    - Drag-and-drop file upload with progress
  - File: `packages/ui/src/components/announcements/AnnouncementAnalytics.tsx`
    - Charts and metrics for read counts, engagement

- [x] **Write unit tests for announcement hooks**
  - File: `tests/hooks/useAnnouncements.test.ts`
  - File: `tests/hooks/useAnnouncementFeed.test.ts`
  - File: `tests/hooks/useCreateAnnouncement.test.ts`

- [x] **Write E2E tests for announcement management**
  - File: `e2e/admin-announcements.spec.ts`
  - Tests: create draft, schedule announcement, publish immediately, edit, delete
  - Tests: target specific roles/departments, attach files, pin/unpin
  - Tests: employee sees targeted announcements only
  - Tests: mark as read functionality
  - Tests: analytics dashboard renders correctly

- [x] **Create n8n workflow for scheduled announcements**
  - File: `n8n/workflows/announcements-auto-publish.json`
  - Trigger: Every 15 minutes (cron schedule)
  - Logic: Query announcements with status='scheduled' and published_at <= now()
  - Action: Update status to 'published', increment read_count to 0
  - Notification: Send Slack/email to all targeted users

- [x] **Create n8n workflow for expiring announcements**
  - File: `n8n/workflows/announcements-auto-expire.json`
  - Trigger: Daily at midnight
  - Logic: Query announcements with status='published' and expires_at <= now()
  - Action: Update status to 'expired'

- [x] **Update database types**
  - File: `packages/database/src/database.types.ts`
  - Add types: `Announcement`, `AnnouncementAttachment`, `AnnouncementRead`, `AnnouncementComment`, `Resource`
  - Add enums: `AnnouncementPriority`, `AnnouncementStatus`, `AnnouncementCategory`

**Visual Specifications (Titanium & Indigo Design System):**

**Admin Announcements List Page:**
```typescript
// Container
className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden"

// Header Section
className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"

// Title
className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"

// Summary Stats Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"

// Stat Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"

// Filters Row
className="flex flex-wrap items-center gap-3 mb-4"

// Filter Button
className="border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"

// Content Area (scrollable)
className="flex-1 overflow-y-auto p-6"

// Announcements Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Announcement Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"

// Priority Badge (Urgent)
className="bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 px-2 py-1 rounded text-xs font-medium"

// Priority Badge (High)
className="bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-xs font-medium"

// Category Badge
className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium"

// Status Badge (Published)
className="bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-medium"

// Status Badge (Draft)
className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium"

// Create Button (Primary Action)
className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
```

**Admin Announcement Editor:**
```typescript
// Form Container
className="h-screen bg-zinc-50 dark:bg-zinc-950 flex overflow-hidden"

// Sidebar (Steps Navigation)
className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto"

// Main Editor Area
className="flex-1 flex flex-col overflow-hidden"

// Editor Toolbar
className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-2"

// Editor Content (scrollable)
className="flex-1 overflow-y-auto p-6"

// Rich Text Editor Wrapper
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 min-h-[400px]"

// Footer Actions
className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between"

// Secondary Button
className="border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
```

**Employee Announcements Feed:**
```typescript
// Pinned Announcement
className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-l-4 border-indigo-600 rounded-lg p-4 mb-4"

// Unread Announcement Card
className="bg-white dark:bg-zinc-900 border-l-4 border-indigo-600 border-r border-t border-b border-zinc-200 dark:border-zinc-800 rounded-lg p-4"

// Read Announcement Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 opacity-75"

// Urgent Announcement Banner
className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-600 rounded-lg p-4 mb-4"
```

---

### 2.5 Resources / Information Hub

The **Resources / Information Hub** is a centralized repository where employees and interns can access video recordings, training materials, onboarding documents, policy handbooks, forms, templates, how-to guides, and other useful resources. This feature complements the Announcements system by providing persistent, searchable, categorized content rather than time-sensitive communications.

The Information Hub unifies both Announcements (Section 2.4) and Resources under one conceptual umbrella, making it the single source of truth for all company information and learning materials.

#### Feature Overview

**Admin/HR/Super Admin Capabilities:**
- Upload and manage resources (videos, PDFs, documents, links)
- Organize resources into categories and subcategories
- Tag resources with keywords for improved searchability
- Target resources to specific roles, departments, or individuals
- Pin/feature important resources
- Track resource views and downloads
- Set publish/expiration dates
- Add rich descriptions with markdown support
- Create resource collections (playlists/bundles)
- Bulk upload and import
- Version control for document updates

**Employee/Associate Experience:**
- Browse resources by category
- Search by title, description, tags, or content
- Filter by resource type, category, department, role
- Bookmark/save favorite resources
- View recently accessed resources
- Access featured/recommended resources
- Download documents or view embedded content
- See resource popularity (view counts, ratings)
- Receive notifications for new resources in followed categories
- Track learning progress (for course materials)

**Resource Types Supported:**
1. **Video** - Embedded YouTube/Vimeo links, or uploaded MP4 files
2. **Documents** - PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx)
3. **Images** - JPG, PNG, GIF (infographics, diagrams, posters)
4. **Links** - External URLs (articles, web apps, forms)
5. **Presentations** - SlideShare embeds, Google Slides links
6. **Interactive Content** - Embedded forms, quizzes, surveys

**Resource Categories:**
- **Onboarding** - Welcome videos, first-week checklists, company intro materials
- **Training & Development** - Courses, workshops, skill-building resources
- **Policies & Procedures** - Employee handbook, code of conduct, compliance docs
- **Benefits & Perks** - Health insurance guides, retirement plans, gym memberships
- **Tools & Systems** - Software tutorials, system access guides, IT help
- **Company Culture** - Mission/vision, values, team photos, culture videos
- **Department-Specific** - Engineering, Marketing, Sales, HR, Finance resources
- **Forms & Templates** - Expense reports, templates
- **Performance Management** - Review templates, goal-setting guides, OKR resources
- **Emergency & Safety** - Evacuation plans, first aid, contact lists

#### Database Schema Required

```sql
-- Migration: supabase/migrations/20260211000002_create_resources_tables.sql

CREATE TYPE resource_type AS ENUM (
  'video',
  'document',
  'image',
  'link',
  'presentation',
  'interactive'
);

CREATE TYPE resource_category AS ENUM (
  'onboarding',
  'training',
  'policies',
  'benefits',
  'tools',
  'culture',
  'department_specific',
  'forms_templates',
  'performance',
  'emergency'
);

CREATE TYPE resource_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic Information
  title text NOT NULL,
  description text,
  excerpt text, -- Short summary (auto-generated from first 200 chars if null)

  -- Classification
  resource_type resource_type NOT NULL,
  category resource_category NOT NULL,
  subcategory text, -- Freeform subcategory within main category
  tags text[] DEFAULT '{}', -- Searchable tags (e.g., ['remote-work', 'productivity', 'tips'])

  -- Content Location
  file_path text, -- Supabase Storage path for uploaded files
  external_url text, -- External link (YouTube, Vimeo, Google Docs, etc.)
  thumbnail_path text, -- Thumbnail image for videos/documents

  -- Metadata
  file_size bigint, -- Size in bytes (for uploaded files)
  mime_type text, -- MIME type (e.g., 'video/mp4', 'application/pdf')
  duration_seconds integer, -- Video/audio duration

  -- Publishing
  status resource_status NOT NULL DEFAULT 'draft',
  published_at timestamptz, -- Null = draft, future = scheduled, past = published
  expires_at timestamptz, -- Null = never expires

  -- Targeting (similar to announcements)
  is_public boolean DEFAULT false, -- If true, visible to all roles
  target_roles user_role[] DEFAULT '{}', -- Empty array = all roles
  target_departments uuid[] DEFAULT '{}', -- Empty array = all departments
  target_employees uuid[] DEFAULT '{}', -- Specific employees (overrides role/dept)

  -- Display Options
  is_featured boolean DEFAULT false, -- Show in featured section
  is_pinned boolean DEFAULT false, -- Pin to top of category
  display_order integer DEFAULT 0, -- Custom ordering within category

  -- Engagement Metrics
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  bookmark_count integer DEFAULT 0,

  -- Versioning
  version integer DEFAULT 1,
  previous_version_id uuid REFERENCES public.resources(id), -- Link to previous version

  -- Audit
  author_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Resource collections (playlists/bundles)
CREATE TABLE public.resource_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  thumbnail_path text,
  is_public boolean DEFAULT false,
  target_roles user_role[] DEFAULT '{}',
  target_departments uuid[] DEFAULT '{}',
  author_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Junction table for collection items
CREATE TABLE public.collection_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.resource_collections(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(collection_id, resource_id)
);

-- User bookmarks
CREATE TABLE public.resource_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes text, -- Personal notes about the resource
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(resource_id, user_id)
);

-- Track resource views
CREATE TABLE public.resource_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  duration_seconds integer, -- How long they watched/read (if trackable)
  completed boolean DEFAULT false -- Did they complete the resource (video, course, etc.)
);

-- Indexes for performance
CREATE INDEX idx_resources_status ON public.resources(status);
CREATE INDEX idx_resources_category ON public.resources(category);
CREATE INDEX idx_resources_type ON public.resources(resource_type);
CREATE INDEX idx_resources_is_featured ON public.resources(is_featured);
CREATE INDEX idx_resources_is_pinned ON public.resources(is_pinned);
CREATE INDEX idx_resources_tags ON public.resources USING GIN(tags);
CREATE INDEX idx_resources_published_at ON public.resources(published_at);
CREATE INDEX idx_resource_views_user_id ON public.resource_views(user_id);
CREATE INDEX idx_resource_views_resource_id ON public.resource_views(resource_id);
CREATE INDEX idx_resource_bookmarks_user_id ON public.resource_bookmarks(user_id);

-- Full-text search index (for title, description, tags)
CREATE INDEX idx_resources_search ON public.resources USING GIN(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || array_to_string(tags, ' '))
);

-- RLS Policies

-- Resources: Employees can only see published, non-expired resources targeted to them
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources FORCE ROW LEVEL SECURITY;

CREATE POLICY resources_employee_select_policy ON public.resources
  FOR SELECT
  USING (
    -- Must be published and not expired
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted_at IS NULL
    AND (
      -- Public resources visible to all
      is_public = true OR
      -- Targeted to user's role (or no role targeting)
      (cardinality(target_roles) = 0) OR
      (get_user_role(auth.uid()) = ANY(target_roles))
    )
    AND (
      -- Targeted to user's department (or no department targeting)
      (cardinality(target_departments) = 0) OR
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.department_id = ANY(target_departments)
      )
    )
    AND (
      -- Targeted to specific employees (or no employee targeting)
      (cardinality(target_employees) = 0) OR
      (auth.uid() = ANY(target_employees))
    )
  );

-- Resources: Admin/HR/Super Admin can see and manage all resources
CREATE POLICY resources_admin_all_policy ON public.resources
  FOR ALL
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Resource Collections: Follow same access pattern
ALTER TABLE public.resource_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY collections_employee_select_policy ON public.resource_collections
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      is_public = true OR
      (cardinality(target_roles) = 0) OR
      (get_user_role(auth.uid()) = ANY(target_roles)) OR
      user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    )
  );

CREATE POLICY collections_admin_all_policy ON public.resource_collections
  FOR ALL
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Resource Bookmarks: Users can only manage their own bookmarks
ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookmarks_self_policy ON public.resource_bookmarks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Resource Bookmarks: Admins can see all bookmarks (for analytics)
CREATE POLICY bookmarks_admin_select_policy ON public.resource_bookmarks
  FOR SELECT
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Resource Views: Users can only insert/select their own views
ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY views_self_policy ON public.resource_views
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Resource Views: Admins can see all views (for analytics)
CREATE POLICY views_admin_select_policy ON public.resource_views
  FOR SELECT
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
  );

-- Trigger to increment view_count on resource_views insert
CREATE OR REPLACE FUNCTION increment_resource_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.resources
  SET view_count = view_count + 1
  WHERE id = NEW.resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER resource_view_count_trigger
  AFTER INSERT ON public.resource_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_resource_view_count();

-- Trigger to increment bookmark_count on bookmark insert/delete
CREATE OR REPLACE FUNCTION update_resource_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.resources
    SET bookmark_count = bookmark_count + 1
    WHERE id = NEW.resource_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.resources
    SET bookmark_count = bookmark_count - 1
    WHERE id = OLD.resource_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER resource_bookmark_count_trigger
  AFTER INSERT OR DELETE ON public.resource_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_bookmark_count();
```

#### Implementation Checklist

**Database & Storage:**

- [x] **Create migration for resources tables**
  - File: `supabase/migrations/20260211000002_create_resources_tables.sql`
  - Include all tables: resources, resource_collections, collection_resources, resource_bookmarks, resource_views
  - Include all RLS policies for employee read access and admin full access
  - Include indexes for performance and full-text search
  - Include triggers for view_count and bookmark_count

- [x] **Create Supabase Storage bucket `resources-library`**
  - Private bucket, 100MB file limit per file
  - Allowed MIME types: video/mp4, video/webm, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, image/jpeg, image/png, image/gif
  - RLS policy: users can only access resources they are authorized to view
  - Organize with folder structure: `{category}/{resource_id}/{filename}`

- [x] **Create Supabase Storage bucket `resource-thumbnails`**
  - Public bucket for thumbnail images
  - 5MB file limit per file
  - Allowed MIME types: image/jpeg, image/png, image/webp

**API & Backend:**

- [x] **Create Zod validation schemas**
  - File: `apps/web/src/lib/schemas/resource.schema.ts`
  - Schemas: `createResourceSchema`, `updateResourceSchema`, `resourceFiltersSchema`, `createCollectionSchema`, `bookmarkResourceSchema`

- [x] **Update query keys factory**
  - File: `apps/web/src/lib/query-keys.ts`
  - Add comprehensive resource query keys (list, detail, featured, category, search, bookmarks, collections)

- [x] **Create resources API routes (Admin/Super Admin)**
  - File: `apps/web/src/app/api/resources/route.ts` (GET list with filters, POST create)
  - File: `apps/web/src/app/api/resources/[id]/route.ts` (GET detail, PATCH update, DELETE soft delete)
  - File: `apps/web/src/app/api/resources/[id]/publish/route.ts` (POST publish resource)
  - File: `apps/web/src/app/api/resources/[id]/archive/route.ts` (POST archive resource)
  - File: `apps/web/src/app/api/resources/[id]/featured/route.ts` (POST/DELETE toggle featured)
  - File: `apps/web/src/app/api/resources/upload/route.ts` (POST upload file with metadata)
  - File: `apps/web/src/app/api/resources/[id]/download/route.ts` (GET signed URL for download)
  - File: `apps/web/src/app/api/resources/[id]/analytics/route.ts` (GET view counts, downloads, engagement)
  - File: `apps/web/src/app/api/resources/bulk-upload/route.ts` (POST bulk upload multiple files)

- [x] **Create resources API routes (Employee/Associate)**
  - File: `apps/web/src/app/api/resources/feed/route.ts` (GET targeted resources for current user)
  - File: `apps/web/src/app/api/resources/search/route.ts` (GET full-text search)
  - File: `apps/web/src/app/api/resources/[id]/view/route.ts` (POST track view)
  - File: `apps/web/src/app/api/resources/[id]/bookmark/route.ts` (POST/DELETE bookmark)
  - File: `apps/web/src/app/api/resources/featured/route.ts` (GET featured resources)
  - File: `apps/web/src/app/api/resources/recent/route.ts` (GET recently viewed)
  - File: `apps/web/src/app/api/resources/bookmarks/route.ts` (GET user's bookmarks)

- [x] **Create collections API routes**
  - File: `apps/web/src/app/api/collections/route.ts` (GET list, POST create - admin only)
  - File: `apps/web/src/app/api/collections/[id]/route.ts` (GET, PATCH, DELETE - admin only)
  - File: `apps/web/src/app/api/collections/[id]/resources/route.ts` (GET resources in collection, POST add resource, DELETE remove resource)

**TanStack Query Hooks:**

- [x] **Create TanStack Query hooks**
  - File: `apps/web/src/hooks/useResources.ts` (list with filters for admin)
  - File: `apps/web/src/hooks/useResource.ts` (single resource detail)
  - File: `apps/web/src/hooks/useCreateResource.ts` (create resource)
  - File: `apps/web/src/hooks/useUpdateResource.ts` (update resource)
  - File: `apps/web/src/hooks/useDeleteResource.ts` (soft delete)
  - File: `apps/web/src/hooks/usePublishResource.ts` (publish/unpublish)
  - File: `apps/web/src/hooks/useUploadResource.ts` (file upload with progress)
  - File: `apps/web/src/hooks/useResourceFeed.ts` (employee feed)
  - File: `apps/web/src/hooks/useSearchResources.ts` (full-text search)
  - File: `apps/web/src/hooks/useBookmarkResource.ts` (bookmark/unbookmark)
  - File: `apps/web/src/hooks/useTrackResourceView.ts` (track view)
  - File: `apps/web/src/hooks/useResourceCollections.ts` (collections list)
  - File: `apps/web/src/hooks/useResourceCollection.ts` (single collection detail)

**Admin Pages:**

- [x] **Create admin resources management pages**
  - File: `apps/web/src/app/(admin)/admin/resources/page.tsx`
    - Grid/card view of all resources (drafts, published, archived)
    - Filters: status, category, type, date range, author, tags
    - Search by title/description/tags
    - Summary stat cards (total, published, drafts, view count, download count)
    - Quick actions: Create New, Bulk Upload, Bulk Archive, Bulk Delete
    - Table columns: Title, Type, Category, Status, Published Date, Views, Downloads, Actions
  - File: `apps/web/src/app/(admin)/admin/resources/new/page.tsx`
    - Multi-step form: Basic Info → Content Upload/Link → Targeting → Preview → Publish
    - Rich text editor for description
    - Category/type selection
    - Tag input (multi-select or freeform chips)
    - Audience targeting (roles, departments, specific employees)
    - Schedule publish/expiration dates
    - File upload with drag-and-drop or external URL input
    - Thumbnail upload or auto-generate
    - Save as draft or publish immediately
  - File: `apps/web/src/app/(admin)/admin/resources/[id]/page.tsx`
    - View/edit existing resource
    - Tabbed layout: Details | Targeting | Analytics | Version History
    - Analytics tab: view count, download count, bookmark count, user breakdown, time-series chart
    - Version history: list previous versions with restore option
    - Quick actions: Publish/Unpublish, Feature/Unfeature, Archive, Delete, Duplicate, Update Version

- [x] **Create admin collections management pages**
  - File: `apps/web/src/app/(admin)/admin/resources/collections/page.tsx`
    - List of all collections with create/edit/delete
  - File: `apps/web/src/app/(admin)/admin/resources/collections/new/page.tsx`
    - Create collection form
  - File: `apps/web/src/app/(admin)/admin/resources/collections/[id]/page.tsx`
    - Edit collection, add/remove/reorder resources

- [x] **Create super-admin redirect pages**
  - File: `apps/web/src/app/(admin)/super-admin/resources/collections/page.tsx` (redirects to `/admin/resources/collections`)
  - File: `apps/web/src/app/(admin)/super-admin/resources/collections/new/page.tsx` (redirects to `/admin/resources/collections/new`)
  - File: `apps/web/src/app/(admin)/super-admin/resources/collections/[id]/page.tsx` (redirects to `/admin/resources/collections/[id]`)

**Employee Pages:**

- [x] **Update employee Information Hub page to include Resources**
  - File: `apps/web/src/app/(employee)/information-hub/page.tsx` (rename from `/announcements`)
  - Three tabs: Announcements | Resources | My Growth
  - Announcements tab: use existing announcements feed from Section 2.4
  - Resources tab: new resource browser
  - My Growth tab: existing learning/development section
  - Shared search bar across all tabs
  - Featured/pinned items at top of Resources tab
  - Category filters, type filters, tag filters
  - Grid view with thumbnails
  - Bookmark button, view tracking on click
  - Recently viewed resources section

- [x] **Create resource detail page**
  - File: `apps/web/src/app/(employee)/information-hub/resources/[id]/page.tsx`
    - Full resource view (embedded video player, PDF viewer, or download button)
    - Breadcrumb navigation (category → resource)
    - Bookmark button, download button (if applicable)
    - Related resources section
    - "Mark as completed" button for training resources
    - Track view duration for analytics

- [x] **Create resource category page**
  - File: `apps/web/src/app/(employee)/information-hub/resources/category/[category]/page.tsx`
    - All resources in a specific category
    - Subcategory filters
    - Sort by: newest, most viewed, most downloaded, title

- [x] **Create bookmarks page**
  - File: `apps/web/src/app/(employee)/information-hub/resources/bookmarks/page.tsx`
    - All user's bookmarked resources
    - Personal notes display
    - Remove bookmark option

**UI Components:**

- [x] **Create reusable resource components**
  - File: `packages/ui/src/components/resources/ResourceCard.tsx`
    - Card display for resource (thumbnail, title, type badge, category badge, view count, bookmark button)
  - File: `packages/ui/src/components/resources/ResourceGrid.tsx`
    - Responsive grid layout for resource cards
  - File: `packages/ui/src/components/resources/ResourceFilters.tsx`
    - Filter controls for status, category, type, tags, date range
  - File: `packages/ui/src/components/resources/ResourceUploader.tsx`
    - Drag-and-drop file upload with progress, or URL input
  - File: `packages/ui/src/components/resources/ResourcePreview.tsx`
    - Preview how resource will appear to employees
  - File: `packages/ui/src/components/resources/VideoPlayer.tsx`
    - Embedded video player (YouTube, Vimeo, or native HTML5)
  - File: `packages/ui/src/components/resources/DocumentViewer.tsx`
    - PDF viewer or document download button
  - File: `packages/ui/src/components/resources/ResourceAnalytics.tsx`
    - Charts and metrics for views, downloads, engagement
  - File: `packages/ui/src/components/resources/TargetingSelector.tsx`
    - Multi-select for roles, departments, employees (reuse from announcements)
  - File: `packages/ui/src/components/resources/TagInput.tsx`
    - Chip-style tag input component
  - File: `packages/ui/src/components/resources/CategoryBrowser.tsx`
    - Visual category browser with icons

**Navigation Updates:**

- [x] **Update Sidebar navigation**
  - File: `packages/ui/src/layout/Sidebar.tsx`
  - Rename "Announcements" to "Information Hub" for employee/associate roles
  - Add "Resources" item to `adminNavItems` and `superAdminNavItems`
  - Icon for employee/associate: `Info` from lucide-react for Information Hub
  - Icon for admin: `Library` from lucide-react for Resources
  - Path: `/information-hub` for employee/associate, `/admin/resources` for admin, `/super-admin/resources` for super_admin

**Testing:**

- [x] **Write unit tests for resource hooks**
  - File: `tests/api/collections-route.test.ts` (Collections API routes)
  - File: `tests/api/collection-resources-route.test.ts` (Collection resources API routes)
  - Note: Additional hook tests can be added as needed

- [x] **Write E2E tests for resource management**
  - File: `e2e/admin-resources.spec.ts`
  - File: `e2e/employee-resources.spec.ts`
  - Tests: create draft, upload file, publish resource, edit, delete
  - Tests: target specific roles/departments, add tags, feature/unfeature
  - Tests: employee sees targeted resources only
  - Tests: bookmark functionality
  - Tests: search functionality
  - Tests: analytics dashboard renders correctly

**Workflows (n8n):**

- [x] **Create n8n workflow for scheduled resources**
  - File: `n8n/workflows/resources-auto-publish.json`
  - Trigger: Every 15 minutes (cron schedule)
  - Logic: Query resources with status='draft' and published_at <= now()
  - Action: Update status to 'published'

- [x] **Create n8n workflow for expiring resources**
  - File: `n8n/workflows/resources-auto-expire.json`
  - Trigger: Daily at midnight
  - Logic: Query resources with status='published' and expires_at <= now()
  - Action: Update status to 'archived'

- [x] **Create n8n workflow for new resource notifications**
  - File: `n8n/workflows/resources-new-notification.json`
  - Trigger: Webhook when resource published
  - Logic: Identify targeted users (roles, departments, employees)
  - Action: Send email/Slack notification to targeted users

**Database Types:**

- [x] **Update database types**
  - File: `packages/database/src/database.types.ts`
  - Add types: `Resource`, `ResourceCollection`, `CollectionResource`, `ResourceBookmark`, `ResourceView`
  - Add enums: `ResourceType`, `ResourceCategory`, `ResourceStatus`

#### Visual Specifications (Titanium & Indigo Design System)

**Admin Resources List Page:**
```typescript
// Container
className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden"

// Header Section
className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"

// Title
className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"

// Summary Stats Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"

// Stat Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"

// Filters Row
className="flex flex-wrap items-center gap-3 mb-4"

// Filter Button
className="border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"

// Content Area (scrollable)
className="flex-1 overflow-y-auto p-6"

// Resources Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"

// Resource Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"

// Card Thumbnail
className="w-full h-40 object-cover bg-zinc-100 dark:bg-zinc-800"

// Card Content
className="p-4 space-y-2"

// Resource Type Badge (Video)
className="bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 px-2 py-1 rounded text-xs font-medium"

// Resource Type Badge (Document)
className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium"

// Category Badge
className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium"

// Status Badge (Published)
className="bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-medium"

// Status Badge (Draft)
className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium"

// Featured Badge
className="bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"

// Create Button (Primary Action)
className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
```

**Admin Resource Editor:**
```typescript
// Form Container
className="h-screen bg-zinc-50 dark:bg-zinc-950 flex overflow-hidden"

// Sidebar (Steps Navigation)
className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto"

// Main Editor Area
className="flex-1 flex flex-col overflow-hidden"

// Editor Toolbar
className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-2"

// Editor Content (scrollable)
className="flex-1 overflow-y-auto p-6"

// Upload Zone
className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer"

// Tag Chip
className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-full text-sm flex items-center gap-1"

// Footer Actions
className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between"

// Secondary Button
className="border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
```

**Employee Information Hub / Resources Tab:**
```typescript
// Tab Container
className="space-y-6"

// Search Bar
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-3"

// Featured Section
className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800"

// Category Browser
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"

// Category Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-shadow cursor-pointer"

// Category Icon Wrapper
className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center"

// Resources Grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"

// Resource Card (Employee View)
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group"

// Thumbnail with Play Icon (for videos)
className="relative w-full h-40"

// Play Button Overlay
className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 opacity-0 group-hover:opacity-100 transition-opacity"

// Bookmark Button
className="absolute top-2 right-2 bg-white dark:bg-zinc-900 rounded-full p-2 shadow-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"

// Bookmarked State
className="text-indigo-600 dark:text-indigo-400"

// View Count / Download Count
className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"
```

**Resource Detail Page (Employee):**
```typescript
// Page Container
className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col overflow-hidden"

// Breadcrumb
className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3"

// Content Area
className="flex-1 overflow-y-auto"

// Video Player / Document Viewer Container
className="bg-zinc-900 aspect-video w-full"

// Resource Info Section
className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6"

// Action Buttons Row
className="flex items-center gap-3"

// Bookmark Button (Active)
className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"

// Download Button
className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"

// Mark as Completed Button
className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md"

// Related Resources Section
className="p-6"

// Related Resources Grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

#### Integration Points

**Unified Information Hub Navigation:**
- The employee/associate sidebar shows a single "Information Hub" menu item that routes to `/information-hub`
- The Information Hub page has three tabs: Announcements (from Section 2.4), Resources (this section), and My Growth (existing learning/development)
- Admins have separate menu items: "Announcements" (`/admin/announcements`) and "Resources" (`/admin/resources`)

**Search Integration:**
- Global search bar on Information Hub searches across both announcements and resources
- Full-text search uses PostgreSQL `to_tsvector` on title, description, and tags
- Results grouped by type (Announcements vs Resources)

**Notification Integration:**
- New resource published: send notification to targeted users (via n8n workflow)
- Resource expiring soon: notify users who bookmarked it
- New resources in followed categories: weekly digest email

**Analytics Integration:**
- Admin dashboard shows resource engagement metrics
- Track most viewed, most downloaded, most bookmarked resources
- Identify content gaps (categories with low resource count)

**AI Integration (Future):**
- AI can recommend resources based on user role, recent activity, and questions asked
- AI can summarize long documents or transcribe videos
- AI can suggest tags and categories for new uploads

---

## Phase 3: Orchestration & Automation (n8n)

### 3.1 n8n Setup

- [x] **Create n8n Docker configuration**
  - File: `n8n/docker-compose.yml`
  - Configure with PostgreSQL backend
  - Set environment variables for Supabase connection

- [x] **Create n8n webhook configuration**
  - Document webhook URLs for each workflow
  - Create API route for webhook validation
  - File: `apps/web/src/app/api/webhooks/n8n/route.ts`

### 3.2 Notification Workflows

- [x] **Birthday reminder workflow**
  - File: `n8n/workflows/notifications-birthday-reminder.json`
  - Trigger: Daily schedule (8 AM)
  - Logic: Query employees with birthday = today
  - Action: Send email to HR + Slack notification
  - Audit: Log notification sent

- [x] **Work anniversary reminder workflow**
  - File: `n8n/workflows/notifications-anniversary-reminder.json`
  - Trigger: Daily schedule (8 AM)
  - Logic: Query employees with date_hired anniversary = today
  - Action: Send email to employee + manager

- [x] **Payroll deadline reminder workflow**
  - File: `n8n/workflows/notifications-payroll-reminder.json`
  - Trigger: 3 days before payroll deadline
  - Logic: Query employees with pending invoices
  - Action: Send email reminder

- [x] **Probation ending reminder workflow**
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

- [x] **Create migration for onboarding tables**
  - File: `supabase/migrations/20260210000006_create_onboarding_tables.sql`

- [x] **Create onboarding workflow**
  - File: `n8n/workflows/onboarding-new-employee.json`
  - Trigger: Webhook when employee created
  - Actions:
    - Create onboarding checklist
    - Create default onboarding tasks
    - Notify HR to prepare equipment
    - Schedule welcome email
    - Create calendar events for orientation

- [x] **Create onboarding API routes**
  - File: `apps/web/src/app/api/onboarding/route.ts`
  - File: `apps/web/src/app/api/onboarding/[id]/tasks/route.ts`

- [x] **Connect onboarding page to real data**
  - Update `apps/web/src/app/(employee)/onboarding/page.tsx`

### 3.3.1 Post-Signin Onboarding Setup (First-Time Employee/Associate Wizard)

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

- [x] **Create migration for onboarding profiles and documents tables**
  - File: `supabase/migrations/20260211000001_create_onboarding_profiles.sql`
  - Include RLS policies (self-access for users, read-all for HR/Admin)
  - Include indexes on user_id, is_completed, current_step

- [x] **Create Supabase Storage bucket `onboarding-documents`**
  - Private bucket, 10MB file limit
  - Allowed MIME types: image/jpeg, image/png, image/gif, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - RLS policy: users can only access their own folder `{user_id}/`

- [x] **Create Zod validation schemas**
  - File: `apps/web/src/lib/schemas/onboarding.schema.ts`
  - Schemas: `personalInfoSchema`, `paymentInfoSchema`, `documentsSchema`, `completeOnboardingSchema`

- [x] **Create onboarding API routes**
  - File: `apps/web/src/app/api/onboarding/profile/route.ts` (GET, POST)
  - File: `apps/web/src/app/api/onboarding/profile/step/route.ts` (PATCH - update specific step data)
  - File: `apps/web/src/app/api/onboarding/profile/complete/route.ts` (POST - finalize and migrate to employees table)
  - File: `apps/web/src/app/api/onboarding/documents/route.ts` (POST upload, GET list)
  - File: `apps/web/src/app/api/onboarding/documents/[id]/route.ts` (DELETE)
  - File: `apps/web/src/app/api/onboarding/documents/[id]/preview/route.ts` (GET signed URL)

- [x] **Create TanStack Query hooks**
  - File: `apps/web/src/hooks/useOnboardingProfile.ts`
  - File: `apps/web/src/hooks/useCreateOnboardingProfile.ts`
  - File: `apps/web/src/hooks/useUpdateOnboardingProfile.ts`
  - File: `apps/web/src/hooks/useUploadOnboardingDocument.ts`
  - File: `apps/web/src/hooks/useOnboardingWizard.ts` (state management with sessionStorage draft persistence)

- [x] **Add onboarding query keys**
  - File: `apps/web/src/lib/query-keys.ts`

- [x] **Create onboarding setup UI components**
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/OnboardingWizard.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/ProgressStepper.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepPersonalInfo.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepPaymentInfo.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepDocuments.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepReview.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/NavigationControls.tsx`
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/DocumentUploadCard.tsx`

- [x] **Create onboarding setup pages**
  - File: `apps/web/src/app/(employee)/onboarding/setup/layout.tsx` (full-screen centered layout, no sidebar/header)
  - File: `apps/web/src/app/(employee)/onboarding/setup/page.tsx` (wizard container)
  - File: `apps/web/src/app/(employee)/onboarding/complete/page.tsx` (success/confirmation page)

- [x] **Update middleware for onboarding redirect**
  - File: `apps/web/src/middleware.ts`
  - Check `onboarding_profiles.is_completed` for authenticated users
  - Redirect to `/onboarding/setup` if onboarding incomplete
  - Exempt paths: `/onboarding/setup`, `/onboarding/complete`, `/api/onboarding/*`

- [x] **Update AuthContext with onboarding status**
  - File: `apps/web/src/contexts/AuthContext.tsx`
  - Add `isOnboardingComplete` flag to User interface
  - Query `onboarding_profiles` during session build

- [x] **Update database types**
  - File: `packages/database/src/database.types.ts`
  - Add `OnboardingProfile`, `OnboardingDocument`, `OnboardingStep`, `OnboardingDocumentType` types

- [x] **Write unit tests for onboarding schemas**
  - File: `tests/schemas/onboarding.test.ts`
  - 4 tests passing: personalInfoSchema, paymentInfoSchema, documentsSchema, completeOnboardingSchema

- [x] **Write unit tests for onboarding wizard hook**
  - File: `tests/hooks/useOnboardingWizard.test.ts`
  - 3 tests passing: initialization, navigation, draft persistence

- [x] **Write E2E tests for onboarding flow**
  - File: `e2e/onboarding.spec.ts`
  - Tests: redirect on first login, complete full wizard, save draft and resume, validation errors
  - Coverage: 30+ test scenarios including step progression, data persistence, validation, and document uploads

### 3.3.2 Onboarding Data Viewer (Admin/Super-Admin Read-Only Interface)

A read-only database viewer for HR and admins to see all onboarding submissions from employees and interns. No editing or approval — just visibility into what was filled out during onboarding.

**Features:**
- List page with grid/card view of all onboarding submissions
- Search by name or email
- Filter by status (completed/in_progress), role (employee/associate), department, date range
- Summary stat cards (total, completed, in-progress counts)
- Detail page with tabbed view: Personal Info, Payment Info, Documents
- Document preview/download via Supabase Storage signed URLs
- Payment account numbers masked in list view (last 4 digits only)

**Implementation Checklist:**

- [x] **Create view-only Zod schemas**
  - File: `apps/web/src/lib/schemas/onboarding-view.schema.ts`
  - Schemas: `onboardingProfileViewSchema`, `onboardingDocumentViewSchema`, `onboardingProfileFiltersSchema`

- [x] **Add onboarding query keys to factory**
  - File: `apps/web/src/lib/query-keys.ts`
  - Add `queryKeys.onboarding` with `profiles` and `documents` sub-keys

- [x] **Create TanStack Query hooks for admin data fetching**
  - File: `apps/web/src/hooks/useOnboardingProfiles.ts` (list with filters)
  - File: `apps/web/src/hooks/useOnboardingProfile.ts` (single profile detail)
  - File: `apps/web/src/hooks/useOnboardingDocuments.ts` (documents for a profile)

- [x] **Create read-only API routes (admin/super_admin role-gated)**
  - File: `apps/web/src/app/api/onboarding/profiles/route.ts` (GET list with search, filters, pagination)
  - File: `apps/web/src/app/api/onboarding/profiles/[id]/route.ts` (GET single profile with joined user/department data)
  - File: `apps/web/src/app/api/onboarding/profiles/[id]/documents/route.ts` (GET documents for a profile)
  - File: `apps/web/src/app/api/onboarding/documents/[id]/preview/route.ts` (GET signed URL for document preview)

- [x] **Create admin onboarding list page**
  - File: `apps/web/src/app/(admin)/admin/onboarding/page.tsx`
  - Grid/card view with search, filters (status, role, department, date range)
  - Summary stat cards (total submissions, completed, in-progress)
  - Follows pattern from `/admin/interns/page.tsx`

- [x] **Create admin onboarding detail page**
  - File: `apps/web/src/app/(admin)/admin/onboarding/[id]/page.tsx`
  - Tabbed layout: Personal Info | Payment Info | Documents
  - All fields read-only, document preview via signed URLs
  - Back button, profile header with avatar/name/status badge
  - Follows pattern from `/admin/interns/[id]/page.tsx`

- [x] **Create super-admin redirect pages**
  - File: `apps/web/src/app/(super-admin)/super-admin/onboarding/page.tsx` (redirects to `/admin/onboarding`)
  - File: `apps/web/src/app/(super-admin)/super-admin/onboarding/[id]/page.tsx` (redirects to `/admin/onboarding/[id]`)

- [x] **Update Sidebar navigation**
  - File: `packages/ui/src/layout/Sidebar.tsx`
  - Add "Onboarding Data" item to `adminNavItems` and `superAdminNavItems`
  - Icon: `ClipboardList` from lucide-react

- [x] **Ensure RLS policies allow admin read access**
  - Verify SELECT policies on `onboarding_profiles` and `onboarding_documents` allow admin/hr/cos/ceo/super_admin roles
  - These should already exist from section 3.3.1 migration

- [x] **Write unit tests for admin hooks**
  - File: `tests/hooks/useOnboardingProfiles.test.tsx` (2 tests passing)
  - File: `tests/hooks/useOnboardingProfile.test.tsx` (2 tests passing)

- [ ] **Write E2E tests for onboarding data viewer**
  - File: `e2e/admin-onboarding-viewer.spec.ts`
  - Tests: admin can view list, filters work, detail page renders all tabs, document preview loads
  - Tests: employee/associate roles get 403 forbidden

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

- [x] **Create migration for offboarding tables**
  - File: `supabase/migrations/20260210000007_create_offboarding_tables.sql`

- [x] **Create offboarding workflow**
  - File: `n8n/workflows/offboarding-exit-process.json`
  - Trigger: Webhook when offboarding initiated
  - Actions:
    - Create offboarding checklist
    - Notify IT to revoke access on last day
    - Schedule exit interview
    - Generate clearance document
    - Archive employee documents

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

- [x] **Create migration for performance tables**
  - File: `supabase/migrations/20260210000009_create_performance_tables.sql`

- [x] **Create OKRs table**
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

- [x] **Create KPIs table**
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

- [x] **Create performance API routes**
  - File: `apps/web/src/app/api/performance/reviews/route.ts`
  - File: `apps/web/src/app/api/performance/okrs/route.ts`
  - File: `apps/web/src/app/api/performance/kpis/route.ts`
  - File: `apps/web/src/app/api/performance/cycles/route.ts`

- [x] **Connect performance pages to real data**
  - Update `apps/web/src/app/(employee)/performance/page.tsx`
  - Update `apps/web/src/app/(employee)/performance/kpis/page.tsx`
  - Update `apps/web/src/app/(employee)/performance/okrs/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/performance/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/performance/cycles/page.tsx`

### 4.2 Probation Tracking

- [x] **Create probation workflow**
  - File: `n8n/workflows/probation-tracking.json`
  - Trigger: Daily schedule
  - Logic: Check employees approaching probation end
  - Actions:
    - 30 days before: Notify manager to prepare evaluation
    - 14 days before: Send reminder
    - 7 days before: Escalate if no evaluation submitted
    - On end date: Auto-complete or extend based on evaluation

- [x] **Create probation API routes**
  - File: `apps/web/src/app/api/probation/route.ts`
  - Includes endpoints for extending probation, completing evaluation

- [x] **Connect probation page to real data**
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

- [x] **Create migration for internship tables**
  - File: `supabase/migrations/20260210000010_create_internship_tables.sql`

- [x] **Create internship API routes**
  - File: `apps/web/src/app/api/internships/route.ts`
  - File: `apps/web/src/app/api/internships/[id]/route.ts`
  - File: `apps/web/src/app/api/internships/[id]/logs/route.ts`

- [x] **Connect internship pages to real data**
  - Update `apps/web/src/app/(employee)/associate/dashboard/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/interns/page.tsx`
  - Update `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx`

### 5.2 EOD Report System

- [x] **Create EOD reminder workflow**
  - File: `n8n/workflows/associate-eod-reminder.json`
  - Trigger: Daily at 4 PM
  - Logic: Check active interns without today's log
  - Action: Send Slack/email reminder

- [x] **Create weekly hours summary workflow**
  - File: `n8n/workflows/associate-weekly-summary.json`
  - Trigger: Every Friday at 5 PM
  - Logic: Calculate weekly hours for each associate
  - Action: Send summary to supervisor

---

## Phase 6: AI Policy Assistant

### 6.1 Vector Database Setup

- [x] **Enable pgvector extension in Supabase**
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

- [x] **Create knowledge base tables**
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

- [x] **Create migration for knowledge tables**
  - File: `supabase/migrations/20260221000011_create_knowledge_tables.sql`

### 6.2 RAG Implementation

- [x] **Implement packages/ai module**
  - File: `packages/ai/src/embeddings.ts` - Generate embeddings
  - File: `packages/ai/src/chat.ts` - Chat with context
  - File: `packages/ai/src/chunking.ts` - Document chunking

- [x] **Create AI API routes**
  - File: `apps/web/src/app/api/ai/chat/route.ts`
  - File: `apps/web/src/app/api/ai/sources/route.ts`
  - File: `apps/web/src/app/api/ai/sources/[id]/route.ts`
  - File: `apps/web/src/app/api/ai/sources/upload/route.ts`
  - File: `apps/web/src/app/api/ai/_lib.ts`

- [x] **Create Supabase Edge Function for embeddings**
  - File: `supabase/functions/generate-embeddings/index.ts`
  - Trigger: On knowledge source insert
  - Action: Chunk document, generate embeddings, store

- [x] **Connect AI knowledge pages to real data**
  - Update `apps/web/src/app/(admin)/admin/ai-knowledge/page.tsx`
  - Update `apps/web/src/app/(admin)/super-admin/ai-knowledge/page.tsx`

### 6.3 Chat Interface

- [x] **Create chat hooks**
  - File: `apps/web/src/hooks/useAIChat.ts`
  - Streaming response support
  - Context retrieval
  - Chat history management

- [x] **Update AIChatbot component with real API**
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

- [x] **Create migration for standup tables**
  - File: `supabase/migrations/20260222000012_create_standup_tables.sql`

- [x] **Create Supabase Storage bucket for recordings**
  - Bucket: `standup-recordings`
  - Configure appropriate size limits (500MB, audio/video files)

- [x] **Create standup API routes**
  - File: `apps/web/src/app/api/standups/route.ts`
  - File: `apps/web/src/app/api/standups/[id]/route.ts`
  - File: `apps/web/src/app/api/standups/upload/route.ts`

- [x] **Create transcription Edge Function**
  - File: `supabase/functions/transcribe-recording/index.ts`
  - Use Whisper API or similar
  - Auto-generate summary with Claude

---

## Phase 7.5: User Management & Credential-First Onboarding (Added Post-V1)

These features were implemented after the initial V1 checklist was written and are tracked here for completeness.

### 7.5.1 Credential-First Onboarding Flow

Admin-initiated onboarding: Admin invites user → user receives credentials → user completes onboarding wizard → admin approves → employee/associate record created.

- [x] **Create user invitation API route**
  - File: `apps/web/src/app/api/users/invite/route.ts`
  - POST: Admin creates Supabase Auth user with email/password, inserts users record with pending status

- [x] **Create onboarding approval API route**
  - File: `apps/web/src/app/api/users/approve-onboarding/route.ts`
  - POST: Admin approves completed onboarding, updates user status

- [x] **Create employee assignment API route**
  - File: `apps/web/src/app/api/users/assign-employee/route.ts`
  - POST: Creates employee record from approved onboarding profile data

- [x] **Create associate assignment API route**
  - File: `apps/web/src/app/api/users/assign-associate/route.ts`
  - POST: Creates internship record from approved onboarding profile data

- [x] **Create admin modal components**
  - File: `apps/web/src/components/admin/InviteUserModal.tsx`
  - File: `apps/web/src/components/admin/ApproveOnboardingModal.tsx`
  - File: `apps/web/src/components/admin/AssignEmployeeModal.tsx`

- [x] **Create user management hooks**
  - File: `apps/web/src/hooks/useUserManagement.ts`
  - Includes: useInviteUser, useApproveOnboarding, useAssignEmployee, useAssignIntern

- [x] **Create awaiting approval page**
  - File: `apps/web/src/app/onboarding/awaiting-approval/page.tsx`
  - Shown to users who completed onboarding wizard but haven't been approved yet

- [x] **Documentation**
  - File: `docs/credentials-first-onboarding-flow.md`

### 7.5.2 Realtime Subscriptions

Supabase Realtime hooks for live data updates across the portal.

- [x] **Create realtime internship hooks**
  - File: `apps/web/src/hooks/useRealtimeInternships.ts`
  - File: `apps/web/src/hooks/useRealtimeInternDailyLogs.ts`

- [x] **Create realtime onboarding hooks**
  - File: `apps/web/src/hooks/useRealtimeOnboardingApprovals.ts`

- [x] **Create realtime probation hooks**
  - File: `apps/web/src/hooks/useRealtimeProbationEmployees.ts`

- [x] **Create realtime reports hooks**
  - File: `apps/web/src/hooks/useReportsRealtime.ts`

- [x] **Create realtime performance hooks**
  - File: `apps/web/src/hooks/usePerformanceRealtime.ts`

### 7.5.3 Additional Schemas & Hooks

- [x] **Create performance validation schemas**
  - File: `apps/web/src/lib/schemas/performance.schema.ts`

- [x] **Create AI validation schemas**
  - File: `apps/web/src/lib/schemas/ai.schema.ts`

- [x] **Create probation hooks**
  - File: `apps/web/src/hooks/useProbation.ts`

- [x] **Create associate dashboard experience**
  - Historical note: the temporary `apps/web/src/components/dashboards/InternDashboard.tsx` component was retired on 2026-03-29 after the real route implementation at `apps/web/src/app/(employee)/associate/dashboard/page.tsx` became the canonical surface.

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

*Last Updated: 2026-02-24*
*Generated by Control Hub Architect Agent*
