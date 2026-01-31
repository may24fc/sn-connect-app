# Claude Code Setup Guide: HR Portal AI Agent

> **Project**: AI Agent for HR Portal  
> **Architecture**: Next.js/Capacitor → n8n → Supabase + Claude API  
> **Development Approach**: Phased delivery with TDD, comprehensive documentation

---

## Table of Contents

1. [Initial Project Setup](#1-initial-project-setup)
2. [CLAUDE.md Configuration](#2-claudemd-configuration)
3. [Phase 1: Foundation & Security](#3-phase-1-foundation--security)
4. [Phase 2: Automated Notifications & Workflows](#4-phase-2-automated-notifications--workflows)
5. [Phase 3: Dashboards & Performance Management](#5-phase-3-dashboards--performance-management)
6. [Custom Slash Commands](#6-custom-slash-commands)
7. [Testing Strategy](#7-testing-strategy)
8. [Version Control Workflow](#8-version-control-workflow)
9. [Documentation Standards](#9-documentation-standards)

---

## 1. Initial Project Setup

### 1.1 Project Initialization Prompt

```
Initialize a monorepo for an HR Portal with the following structure:

/hr-portal
├── apps/
│   ├── web/                 # Next.js 14+ App Router
│   └── mobile/              # Capacitor wrapper
├── packages/
│   ├── ui/                  # Shared component library
│   ├── database/            # Supabase client & types
│   ├── auth/                # JWT authentication utilities
│   └── ai/                  # Claude API integration
├── n8n/
│   └── workflows/           # n8n workflow JSON exports
├── supabase/
│   ├── migrations/          # SQL migrations
│   ├── seed/                # Seed data
│   └── functions/           # Edge functions
├── docs/                    # Documentation
└── tests/                   # E2E and integration tests

Use:
- pnpm as package manager with workspaces
- TypeScript strict mode throughout
- Biome for linting/formatting
- Vitest for unit tests
- Playwright for E2E tests

Create the initial package.json, tsconfig.json, and workspace configuration.
```

### 1.2 Environment Configuration Prompt

```
Create environment configuration for the HR Portal:

1. Create .env.example with all required variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY
   - N8N_WEBHOOK_URL
   - N8N_API_KEY

2. Create a type-safe env validation using zod in packages/config/env.ts

3. Add .env.local to .gitignore

4. Create documentation in docs/ENVIRONMENT.md explaining each variable
```

---

## 2. CLAUDE.md Configuration

Create this file at the project root to guide Claude Code's behavior:

```markdown
# CLAUDE.md - HR Portal Development Guidelines

## Project Context
This is an HR Portal with an AI Agent serving as a centralized reference point for HR and employees. The system uses a three-tier architecture:
- **Interface**: Next.js 14+ with Capacitor for web/mobile
- **Orchestrator**: n8n workflow automation
- **Data Layer**: Supabase with Row Level Security (RLS)

## Architecture Principles
1. **Zero-Trust Security**: Never trust client-side data. Always validate on server.
2. **RLS as Final Gatekeeper**: Database-level security is the last line of defense.
3. **JWT-Based Auth**: All requests must carry valid JWT tokens.
4. **Separation of Concerns**: UI → API → n8n → Supabase → AI

## Code Standards

### TypeScript
- Use strict mode with no `any` types
- Define explicit return types for all functions
- Use branded types for IDs (e.g., `type EmployeeId = string & { __brand: 'EmployeeId' }`)

### React/Next.js
- Server Components by default, Client Components only when necessary
- Use React Server Actions for mutations
- Implement optimistic updates for better UX
- Follow the Container/Presenter pattern

### Database
- All tables must have RLS policies
- Use snake_case for database columns
- Always include `created_at`, `updated_at`, `created_by` columns
- Soft delete with `deleted_at` column where appropriate

### Security
- Never log sensitive data (SSN, salaries, health info)
- Sanitize all user inputs
- Rate limit API endpoints
- Implement audit logging for sensitive operations

## File Naming Conventions
- Components: PascalCase (e.g., `EmployeeCard.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase with `.types.ts` suffix
- Tests: Same name with `.test.ts` or `.spec.ts` suffix

## Testing Requirements
- Unit tests for all utility functions
- Integration tests for API routes
- E2E tests for critical user flows
- Minimum 80% coverage for business logic

## Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```
Types: feat, fix, docs, style, refactor, test, chore

## PR Requirements
- All tests passing
- No TypeScript errors
- Documentation updated
- Security review for auth/data changes
```

---

## 3. Phase 1: Foundation & Security

### 3.1 Database Schema Setup

```
Create the Supabase database schema for the HR Portal Phase 1.

Design tables for:

1. **users** (extends Supabase auth.users)
   - role: enum ('admin', 'hr', 'cos', 'ceo', 'employee', 'intern')
   - department_id: reference
   - manager_id: self-reference
   - status: enum ('active', 'on_leave', 'terminated')

2. **employees** (201 file data)
   - user_id: reference to users
   - employee_number: unique
   - immediate_head: reference to users (ceo or cos)
   - first_name, middle_name, last_name
   - birthday: date
   - date_hired: date
   - employment_type: enum ('regular', 'probationary', 'intern', 'project-based')
   - work_arrangement: enum ('part_time', 'full-time')
   - position
   - department
   - probation_end_date: date (nullable)
   - payroll_account (payroll_account_name, payroll_account_number)
   - contact info (phone, emergency_contact (emergency_contact_name, emergency_contact_number))
   - email address (personal, company)
   - demographics (address, city, province, postal_code)

3. **departments**
   - name, description
   - head_id: reference to users

4. **documents** (for 201 files)
   - employee_id: reference
   - document_type: enum ('contract', 'id', 'certificate', 'performance_review', etc.)
   - file_path: storage reference
   - uploaded_by, uploaded_at
   - is_confidential: boolean

Include:
- Proper indexes for common queries
- RLS policies ensuring employees can only see their own data
- HR/COS/CEO/Admin can see all data
- Audit trigger for sensitive operations
- Created_at, updated_at timestamps with triggers
```

### 3.2 Row Level Security Policies

```
Create comprehensive RLS policies for the HR Portal:

1. **Base Policies**:
   - Users can always read their own profile
   - Users can update specific fields of their own profile
   - HR/Admin roles have full access

2. **Employee Records**:
   - Employees see only their own records
   - Managers can see their direct reports
   - HR sees all employees

3. **Documents**:
   - Employees see their own non-confidential documents
   - HR sees all documents
   - Confidential documents only visible to HR and user's manager

4. **Invoices** (for payroll):
   - Employees see only their own invoices
   - COS role sees all invoices
   - Other admins cannot see invoice details

Create SQL migration file with:
- Enable RLS on all tables
- Policy definitions with clear naming
- Helper functions for role checking
- Test queries to verify policies work correctly

Include comments explaining each policy's purpose.
```

### 3.3 Authentication System

```
Implement JWT authentication for the HR Portal:

1. **packages/auth/src/index.ts**:
   - Supabase client initialization
   - Sign in/out functions
   - Session management
   - Token refresh logic

2. **packages/auth/src/middleware.ts**:
   - Next.js middleware for protected routes
   - Role-based route protection
   - Redirect logic for unauthorized access

3. **packages/auth/src/hooks.ts**:
   - useAuth hook for client components
   - useUser hook with role information
   - usePermissions hook for granular access

4. **apps/web/app/(auth)/**:
   - Login page with email/password
   - Password reset flow
   - First-time password setup for new employees

Security requirements:
- Secure cookie handling
- CSRF protection
- Session timeout (8 hours)
- Rate limiting on auth endpoints
- Failed login tracking
```

### 3.4 AI Policy Assistant Integration

```
Create the Claude API integration for HR policy queries:

1. **packages/ai/src/client.ts**:
   - Anthropic SDK initialization
   - Rate limiting and retry logic
   - Error handling with user-friendly messages

2. **packages/ai/src/policy-assistant.ts**:
   - System prompt for HR context
   - Function to query policies
   - Response streaming support
   - Citation tracking for policy references

3. **System Prompt** (store in database for easy updates):
```
You are an HR Policy Assistant for [Company Name]. Your role is to:
- Answer employee questions about company policies
- Provide information about benefits, leave, and procedures
- Guide employees through HR processes
- Never disclose confidential information about other employees
- Always cite the specific policy document when referencing rules

Current employee context:
- Name: {employee_name}
- Role: {role}
- Department: {department}
- Employment Type: {employment_type}

Available policy categories:
- Leave policies
- Benefits
- Code of conduct
- Performance management
- Compensation (only general information)
```

4. **n8n Workflow** for policy queries:
   - Receive query from frontend
   - Validate JWT and extract user context
   - Fetch relevant policy documents from Supabase
   - Send to Claude with RAG context
   - Return response with citations

Include vector embedding setup for policy documents.
```

### 3.5 Core UI Components

```
Create the foundational UI component library for the HR Portal:

1. **packages/ui/src/components/**:
   
   Layout Components:
   - AppShell (sidebar + main content)
   - PageHeader (title + breadcrumbs + actions)
   - Card, CardHeader, CardContent, CardFooter
   
   Form Components:
   - Input (text, email, password, date)
   - Select (single, multi)
   - FileUpload (drag-drop, progress)
   - DatePicker
   - Form (with react-hook-form + zod)
   
   Data Display:
   - DataTable (sorting, filtering, pagination)
   - Badge (status indicators)
   - Avatar (with initials fallback)
   - Timeline (for activity feeds)
   
   Feedback:
   - Toast notifications
   - Modal/Dialog
   - ConfirmDialog
   - LoadingSpinner
   - Skeleton loaders

2. **Design Tokens** (packages/ui/src/tokens/):
   - Colors (with dark mode support)
   - Typography scale
   - Spacing scale
   - Border radius
   - Shadows

3. **Styling**:
   - Use Tailwind CSS
   - CSS variables for theming
   - Mobile-first responsive design
   - Accessibility: WCAG 2.1 AA compliance

Include Storybook configuration for component documentation.
```

---

## 4. Phase 2: Automated Notifications & Workflows

### 4.1 Notification System

```
Build the notification infrastructure for the HR Portal:

1. **Database Tables**:
   
   notifications:
   - id, user_id, type, title, body
   - data (jsonb for type-specific payload)
   - is_read, read_at
   - created_at
   
   notification_preferences:
   - user_id, notification_type
   - email_enabled, push_enabled, in_app_enabled
   
2. **packages/notifications/src/**:
   - NotificationService class
   - Email provider integration (Resend/SendGrid)
   - Push notification setup (web-push)
   - In-app notification hooks

3. **n8n Workflows**:
   - Daily birthday checker (runs at 8 AM PHT)
   - Work anniversary checker
   - Notification dispatcher (multi-channel)

4. **UI Components**:
   - NotificationBell with unread count
   - NotificationDropdown
   - NotificationSettings page
   - NotificationItem (with action buttons)

5. **Notification Types** (create enum):
   - BIRTHDAY_GREETING
   - WORK_ANNIVERSARY
   - PAYROLL_REMINDER
   - INVOICE_UPLOADED
   - PAYROLL_CREDITED
   - ONBOARDING_TASK
   - OFFBOARDING_TASK
   - PERFORMANCE_REVIEW
   - SYSTEM_ANNOUNCEMENT
```

### 4.2 Birthday & Anniversary Automation

```
Create automated birthday and work anniversary notifications:

1. **n8n Workflow: Daily Celebraton Check**
   
   Trigger: Cron schedule at 8:00 AM PHT daily
   
   Steps:
   a. Query employees with birthday = today
   b. Query employees with hire_date anniversary = today
   c. For each birthday:
      - Create public announcement notification
      - Send to #general channel (if Slack integrated)
      - Optional: Generate AI greeting message
   d. For each anniversary:
      - Calculate years of service
      - Create public announcement
      - Notify HR for milestone gifts (5, 10, 15+ years)

2. **Supabase Function**: get_daily_celebrations
   ```sql
   CREATE FUNCTION get_daily_celebrations()
   RETURNS TABLE (
     employee_id uuid,
     full_name text,
     celebration_type text,
     years integer
   )
   ```

3. **UI Components**:
   - CelebrationBanner (shows on dashboard)
   - CelebrationCard (for announcements feed)
   
4. **Templates** (store in database):
   - Birthday message templates (multiple variations)
   - Anniversary message templates by milestone
```

### 4.3 Payroll Invoice System

```
Implement the payroll invoice submission and tracking system:

1. **Database Tables**:
   
   invoices:
   - id, employee_id
   - period_start, period_end
   - file_path (Supabase storage)
   - amount: decimal
   - status: enum ('pending', 'submitted', 'reviewed', 'paid')
   - submitted_at, paid_at
   - notes
   
   invoice_periods:
   - id, period_start, period_end
   - deadline: timestamp
   - is_active: boolean

2. **RLS Policies**:
   - Employees: See only their own invoices
   - COS: See all invoices, can update status
   - Other admins: Cannot see invoice details

3. **n8n Workflows**:
   
   a. Invoice Deadline Reminder:
      - Trigger: Thursday 9 AM PHT (day before Friday 4 PM deadline)
      - Check who hasn't submitted
      - Send reminder notifications
   
   b. Invoice Upload Handler:
      - Trigger: Webhook from Supabase
      - Validate file (PDF only, max 10MB)
      - Notify COS of new submission
      - Log audit trail
   
   c. Payment Confirmation:
      - Trigger: COS marks as paid
      - Notify employee
      - Update payroll records

4. **UI Pages**:
   
   Employee View:
   - /invoices - List of their invoices
   - /invoices/upload - Upload new invoice
   - Invoice status tracker
   
   COS View:
   - /admin/invoices - All pending invoices
   - Bulk actions (approve, mark paid)
   - Filter by period, status, employee
```

### 4.4 Onboarding Automation

```
Create the automated onboarding system for new hires and interns:

1. **Database Tables**:
   
   onboarding_checklists:
   - id, name, description
   - employment_type: enum ('regular', 'intern')
   - is_active: boolean
   
   onboarding_tasks:
   - id, checklist_id
   - title, description, instructions
   - responsible_party: enum ('employee', 'hr', 'it', 'manager')
   - due_days_from_start: integer
   - is_required: boolean
   - order: integer
   
   employee_onboarding:
   - id, employee_id, checklist_id
   - started_at, completed_at
   - status: enum ('in_progress', 'completed', 'overdue')
   
   employee_onboarding_tasks:
   - id, employee_onboarding_id, task_id
   - status: enum ('pending', 'in_progress', 'completed', 'blocked')
   - completed_at, completed_by
   - notes

2. **n8n Workflows**:
   
   a. New Employee Trigger:
      - When employee record created
      - Create onboarding instance
      - Send welcome email with first-day instructions
      - Notify IT for system access setup
      - Notify manager
   
   b. Daily Onboarding Check:
      - Check for overdue tasks
      - Send reminders to responsible parties
      - Escalate if significantly overdue
   
   c. Task Completion Handler:
      - Update progress
      - Trigger next tasks if dependencies met
      - Notify relevant parties

3. **Default Checklist Items**:
   
   New Hire:
   - [ ] Complete employment contract (HR, Day 0)
   - [ ] Submit government IDs (Employee, Day 1)
   - [ ] IT system access setup (IT, Day 1)
   - [ ] Company orientation (HR, Day 1)
   - [ ] Department introduction (Manager, Day 1)
   - [ ] Benefits enrollment (Employee, Day 5)
   - [ ] Tool training completion (Employee, Day 7)
   
   Intern:
   - [ ] Internship agreement signed (HR, Day 0)
   - [ ] School endorsement submitted (Employee, Day 1)
   - [ ] IT access (limited) setup (IT, Day 1)
   - [ ] Mentor assignment (Manager, Day 1)

4. **UI Pages**:
   - /onboarding - Employee's checklist view
   - /admin/onboarding - HR dashboard
   - Progress tracking visualization
```

### 4.5 Offboarding & Exit Process

```
Implement the offboarding and exit checklist system:

1. **Database Tables**:
   
   offboarding_checklists:
   - id, name, description
   - separation_type: enum ('resignation', 'termination', 'end_of_contract', 'retirement')
   
   offboarding_tasks:
   - Similar structure to onboarding_tasks
   - due_days_before_last: integer
   
   employee_offboarding:
   - id, employee_id
   - last_working_day: date
   - separation_type
   - exit_interview_scheduled: timestamp
   - exit_interview_completed: boolean
   - clearance_status: enum ('pending', 'in_progress', 'cleared')

2. **n8n Workflows**:
   
   a. Offboarding Initiation:
      - Trigger: HR marks employee as separating
      - Create offboarding instance
      - Notify all relevant departments
      - Schedule exit interview
   
   b. Clearance Automation:
      - Daily check for pending clearances
      - Send reminders to approvers
      - Track equipment returns, access revocations
   
   c. Exit Interview Reminder:
      - 3 days before last day
      - Send exit interview form link
      - Notify HR when completed

3. **Clearance Departments**:
   - IT (equipment return, access revocation)
   - Finance (final pay, loans)
   - Admin (ID return, parking)
   - Direct Manager (knowledge transfer)
   - HR (exit documents, certificate of employment)

4. **UI Pages**:
   - /offboarding - Employee's clearance view
   - /admin/offboarding - HR management
   - Clearance approval workflow
   - Exit interview form
```

---

## 5. Phase 3: Dashboards & Performance Management

### 5.1 Probation Status Dashboard

```
Build the probation tracking dashboard for HR:

1. **Database Enhancements**:
   
   probation_reviews:
   - id, employee_id
   - review_type: enum ('30_day', '60_day', '90_day', 'final')
   - scheduled_date: date
   - completed_date: date
   - status: enum ('pending', 'completed', 'overdue')
   - reviewer_id (manager)
   - rating: enum ('exceeds', 'meets', 'needs_improvement', 'unsatisfactory')
   - recommendation: enum ('continue', 'extend', 'regularize', 'terminate')
   - feedback: text
   - hr_notes: text

2. **n8n Workflows**:
   
   a. Probation Review Scheduler:
      - When new probationary employee added
      - Calculate 30/60/90 day dates
      - Create review records
      - Schedule notifications
   
   b. Review Reminder:
      - 7 days before each review date
      - Notify manager
      - 3 days before: escalate if not started
   
   c. Final Decision Handler:
      - When 90-day review completed
      - If regularization: Update employee status, trigger celebration
      - If extension: Create new review schedule
      - If termination: Initiate offboarding

3. **Dashboard Components** (HR View Only):
   
   ProbationDashboard:
   - Summary cards (total, by stage, by status)
   - Status indicators: 🟢 On Track, 🟡 Needs Attention, 🔴 At Risk
   - Filters: department, manager, stage
   
   EmployeeProbationCard:
   - Employee name, photo
   - Start date, current stage
   - Next review date, days remaining
   - Manager response status
   - Quick action buttons
   
   ProbationTimeline:
   - Visual 30-60-90 day timeline
   - Review completion markers
   - Upcoming deadlines

4. **Status Logic**:
   - 🟢 On Track: All reviews completed on time, positive ratings
   - 🟡 Needs Attention: Review overdue < 7 days OR needs improvement rating
   - 🔴 At Risk: Review overdue > 7 days OR unsatisfactory rating OR termination recommended
```

### 5.2 Performance Appraisal System

```
Implement the semi-annual performance management system:

1. **Database Tables**:
   
   performance_cycles:
   - id, name (e.g., "H1 2024")
   - start_date, end_date
   - okr_deadline, kpi_deadline
   - review_start, review_end
   - status: enum ('planning', 'active', 'review', 'closed')
   
   okrs (Objectives and Key Results):
   - id, employee_id, cycle_id
   - objective: text
   - status: enum ('draft', 'submitted', 'approved', 'in_progress', 'completed')
   - progress_percentage: integer
   
   key_results:
   - id, okr_id
   - description, target_value, current_value
   - unit: text
   - weight: decimal
   
   kpis (Key Performance Indicators):
   - id, employee_id, cycle_id
   - name, description
   - target, actual
   - score: decimal
   
   performance_reviews:
   - id, employee_id, cycle_id
   - self_assessment: jsonb
   - manager_assessment: jsonb
   - final_rating: enum ('exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory')
   - manager_id, hr_reviewer_id
   - status: enum ('pending_self', 'pending_manager', 'pending_hr', 'completed')

2. **n8n Workflows**:
   
   a. Cycle Kickoff:
      - When new cycle starts
      - Notify all employees to set OKRs/KPIs
      - Create empty records for tracking
   
   b. OKR/KPI Deadline Reminder:
      - Weekly reminder during planning phase
      - Daily reminder last 3 days
      - Notify HR of non-compliance
   
   c. Review Period Handler:
      - Notify employees for self-assessment
      - Notify managers after self-assessment done
      - Escalate overdue reviews
   
   d. One-on-One Reminder:
      - Monthly reminder for check-ins
      - Track completion

3. **UI Pages**:
   
   Employee:
   - /performance - Current cycle overview
   - /performance/okrs - OKR management
   - /performance/kpis - KPI tracking
   - /performance/review - Self-assessment form
   
   Manager:
   - /manager/team-performance - Team overview
   - /manager/reviews - Pending reviews
   
   HR:
   - /admin/performance - Organization-wide dashboard
   - /admin/performance/cycles - Cycle management
   - Analytics and reporting
```

### 5.3 Internship Management

```
Create internship tracking and automation:

1. **Database Tables**:
   
   internship_periods:
   - id, employee_id
   - start_date, end_date
   - school, program
   - required_hours: integer
   - completed_hours: integer
   - supervisor_id
   
   daily_reports (EOD submissions):
   - id, intern_id, date
   - tasks_completed: text
   - hours_logged: decimal
   - learnings: text
   - challenges: text
   - submitted_at
   - supervisor_feedback: text

2. **n8n Workflows**:
   
   a. Internship Start Reminder:
      - 1 week before start date
      - Notify HR, supervisor, intern
      - Trigger onboarding checklist
   
   b. EOD Reminder:
      - Daily at 4:30 PM PHT
      - Only for active interns
      - Skip weekends/holidays
   
   c. Internship End Handler:
      - 2 weeks before end date
      - Reminder for final evaluation
      - Certificate preparation
      - Exit survey

3. **UI Pages**:
   - /intern/dashboard - Hours tracker, EOD submission
   - /intern/reports - Daily report history
   - /admin/interns - HR intern management
   - /admin/interns/[id] - Individual intern view
```

### 5.4 Reports & Marketing Submissions

```
Implement the weekly reports submission system:

1. **Database Tables**:
   
   report_types:
   - id, name, description
   - frequency: enum ('daily', 'weekly', 'monthly')
   - deadline_day: integer (1-7 for weekly)
   - deadline_time: time
   - required_roles: text[]
   
   report_submissions:
   - id, report_type_id, submitter_id
   - period_start, period_end
   - content: jsonb
   - file_paths: text[]
   - status: enum ('draft', 'submitted', 'reviewed')
   - submitted_at, reviewed_by, reviewed_at

2. **n8n Workflows**:
   
   a. Weekly Report Reminder:
      - Friday 2 PM: First reminder
      - Monday 9 AM: Deadline reminder
      - Monday 12 PM: Overdue escalation
   
   b. Submission Handler:
      - Notify reviewers
      - Track completion rate

3. **Marketing Spend Report**:
   - Template with required fields
   - Spend breakdown by channel
   - Performance metrics
   - File attachments (receipts, screenshots)

4. **UI Pages**:
   - /reports - Employee submission portal
   - /reports/new - Create report
   - /admin/reports - Submission tracking
```

### 5.5 Stand-Up Calls & Resources

```
Build the central resource and announcements hub:

1. **Database Tables**:
   
   resources:
   - id, title, description
   - category: enum ('standup_recording', 'policy', 'training', 'template')
   - file_path, external_url
   - tags: text[]
   - is_featured: boolean
   - uploaded_by, uploaded_at
   
   announcements:
   - id, title, content
   - type: enum ('general', 'urgent', 'celebration', 'policy_update')
   - publish_at: timestamp
   - expires_at: timestamp
   - target_roles: text[] (null = all)
   - target_departments: uuid[]
   - created_by

2. **UI Pages**:
   
   /resources:
   - Searchable resource library
   - Category filters
   - Video player for recordings
   
   /announcements:
   - Feed of announcements
   - Pinned/urgent at top
   - Archive of past announcements
   
   Dashboard Integration:
   - Announcement banner
   - Quick links to resources
```

---

## 6. Custom Slash Commands

Create these custom commands in `.claude/commands/`:

### `/hr-migrate`

```markdown
---
name: hr-migrate
description: Generate a Supabase migration for HR Portal
args:
  - name: description
    description: Brief description of the migration
    required: true
---

Create a new Supabase migration file for: $ARGUMENTS.description

Requirements:
1. Place in supabase/migrations/ with timestamp prefix
2. Include both UP and DOWN migrations
3. Add RLS policies for new tables
4. Include helpful comments
5. Follow existing naming conventions
6. Add to migration index if one exists

After creating, show me how to run and verify the migration.
```

### `/hr-workflow`

```markdown
---
name: hr-workflow
description: Generate an n8n workflow JSON
args:
  - name: name
    description: Name of the workflow
    required: true
  - name: trigger
    description: What triggers this workflow (cron, webhook, etc.)
    required: true
---

Create an n8n workflow for: $ARGUMENTS.name
Trigger: $ARGUMENTS.trigger

Include:
1. Proper error handling nodes
2. Supabase authentication
3. Notification dispatch
4. Logging for debugging
5. Comments explaining each step

Output as importable JSON in n8n/workflows/
```

### `/hr-component`

```markdown
---
name: hr-component
description: Generate a React component for the HR Portal
args:
  - name: name
    description: Component name in PascalCase
    required: true
  - name: type
    description: Component type (page, feature, ui)
    required: true
---

Create a React component: $ARGUMENTS.name
Type: $ARGUMENTS.type

Include:
1. TypeScript with proper types
2. Tailwind CSS styling
3. Accessibility attributes
4. Loading and error states
5. Unit tests
6. Storybook story (for ui components)
```

### `/hr-test`

```markdown
---
name: hr-test
description: Generate tests for HR Portal code
args:
  - name: target
    description: File or feature to test
    required: true
---

Generate comprehensive tests for: $ARGUMENTS.target

Include:
1. Unit tests with Vitest
2. Integration tests where applicable
3. E2E tests for critical paths
4. Mock data and fixtures
5. Edge cases and error scenarios
6. RLS policy tests for database code
```

### `/hr-doc`

```markdown
---
name: hr-doc
description: Generate documentation
args:
  - name: topic
    description: What to document
    required: true
  - name: type
    description: Documentation type (api, guide, adr)
    required: true
---

Create documentation for: $ARGUMENTS.topic
Type: $ARGUMENTS.type

Follow the documentation standards in docs/CONTRIBUTING.md.
Include examples and diagrams where helpful.
```

---

## 7. Testing Strategy

### 7.1 Testing Prompt Template

```
Create a comprehensive test suite for [FEATURE]:

1. **Unit Tests** (Vitest):
   - Test all utility functions
   - Test hooks in isolation
   - Test component rendering
   - Mock external dependencies

2. **Integration Tests**:
   - Test API routes end-to-end
   - Test database operations
   - Test n8n webhook handlers

3. **E2E Tests** (Playwright):
   - Critical user journeys
   - Multi-role scenarios
   - Mobile viewport testing

4. **Security Tests**:
   - RLS policy verification
   - Authentication bypass attempts
   - Input sanitization
   - Rate limiting

Test file structure:
```
tests/
├── unit/
│   ├── utils/
│   └── components/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   ├── auth.spec.ts
│   ├── employee.spec.ts
│   └── admin.spec.ts
└── fixtures/
    └── test-data.ts
```
```

### 7.2 RLS Testing Prompt

```
Create RLS policy tests for the [TABLE] table:

Test scenarios:
1. Employee can read own records
2. Employee cannot read other employees' records
3. Manager can read direct reports' records
4. HR can read all records
5. Unauthorized role gets empty result
6. Service role bypasses RLS

Use Supabase test helpers:
- Create test users with different roles
- Use impersonation for role testing
- Verify query results match expectations
- Clean up test data after each test

Output as executable test file.
```

---

## 8. Version Control Workflow

### 8.1 Branch Strategy

```
Set up Git workflow for HR Portal:

Branches:
- main: Production-ready code
- develop: Integration branch
- feature/*: New features
- fix/*: Bug fixes
- release/*: Release preparation

Rules:
1. All changes via PR
2. Require 1 approval for features
3. Require 2 approvals for security changes
4. Squash merge to develop
5. Merge commit to main

Create:
1. .github/CODEOWNERS
2. Branch protection rules script
3. PR template
4. Issue templates (bug, feature, security)
```

### 8.2 PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring
- [ ] Security fix

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Security Checklist (if applicable)
- [ ] RLS policies reviewed
- [ ] No sensitive data in logs
- [ ] Input validation added
- [ ] Authentication verified

## Documentation
- [ ] Code comments added
- [ ] README updated
- [ ] API docs updated

## Screenshots (if applicable)

## Related Issues
Closes #
```

---

## 9. Documentation Standards

### 9.1 ADR Template

```
Create Architecture Decision Record for [DECISION]:

Location: docs/adr/NNNN-[title].md

Template:
# ADR NNNN: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?

## Alternatives Considered
What other options were evaluated?

## References
Links to relevant resources
```

### 9.2 API Documentation

```
Generate API documentation for [ENDPOINT]:

Format: OpenAPI 3.0 specification

Include:
1. Endpoint path and method
2. Request parameters and body
3. Response schema with examples
4. Authentication requirements
5. Error responses
6. Rate limiting info
7. Example curl commands

Output to: docs/api/[endpoint].yaml
```

---

## Quick Reference: Common Prompts

| Task | Prompt Start |
|------|--------------|
| New database table | "Create a Supabase migration for a new [table] table with RLS policies..." |
| New API endpoint | "Create a Next.js API route at /api/[path] that..." |
| New n8n workflow | "Create an n8n workflow that triggers on [event] and..." |
| New UI component | "Create a React component called [Name] that..." |
| Add notification | "Add a new notification type [TYPE] that..." |
| Security review | "Review the security of [feature] for vulnerabilities..." |
| Performance fix | "Optimize the [query/component] for better performance..." |
| Bug investigation | "Debug the issue where [description]..." |

---

## Phase Completion Checklist

### Phase 1 ✓
- [ ] Database schema created with RLS
- [ ] Authentication working
- [ ] Basic UI shell complete
- [ ] AI policy assistant functional
- [ ] All tests passing

### Phase 2 ✓
- [ ] Notification system operational
- [ ] Birthday/anniversary automation live
- [ ] Payroll invoice system complete
- [ ] Onboarding automation functional
- [ ] Offboarding process automated

### Phase 3 ✓
- [ ] Probation dashboard complete
- [ ] Performance appraisal system live
- [ ] Internship management automated
- [ ] Reports submission working
- [ ] Resource hub populated
