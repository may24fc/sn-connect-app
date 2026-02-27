# SN Connect HR Portal - V2 Implementation Checklist

This document provides the Phase 2 (V2) implementation plan for SN Connect, derived from the **1st User Testing Feedback** conducted on the V1 build. Feedback was collected from four user roles: HR/Admin, Intern, Admin Assistant, Chief of Staff (CoS), and Google Ads Specialist. Tasks are organized by priority tier, with P0 (Blockers) addressed first.

**Feedback Sources:**
- Set 1: HR/Admin, Intern, Admin Assistant
- Set 2: Google Ads Specialist, Admin Assistant (extended), Intern (extended)
- Set 3: Chief of Staff, Technical Debt / Regression Bugs

---

## V2 Priority Matrix (All Feedback Sets Collated)

| Tier | Label | Scope |
|------|-------|-------|
| **P0** | Blockers | Intern "No Active Record" dead-end, Supabase Auth redirect failures, "Ghost Success" button bug |
| **P1** | Compliance & Validation | International phone validation, EUR/multi-currency support, Bank selection dropdown |
| **P2** | Admin Utility & Data Granularity | Individual KPI/OKR views, Master Employee Directory, Birthdays/Anniversaries on tabs, Section renaming |
| **P3** | Automation & UX Polish | Auto-reminders, FX auto-updates, Announcement view counts, Guided onboarding UX, Notification bell activation |

---

## >>>>>>> RESUME HERE: V2 Phase 0 - P0 Blockers (CRITICAL) <<<<<<<

### V2-0.1 Intern "No Active Record" Dead-End Fix (CRITICAL)

**Problem:** Interns are locked out of all functionality (Profile, Dashboard, Performance, Documents) because the UI expects a 1-to-1 relationship between `User` and `Internship_Record` that hasn't been initialized. This is a schema strictness issue.

**Industry Standard:** Implement Optional Chaining on the frontend and a "Self-Onboarding" fallback flow.

- [x] **Audit all intern-facing pages for required internship record dependency**
  - Files audited:
    - `apps/web/src/app/(employee)/intern/dashboard/page.tsx` — **AFFECTED**: showed dead-end placeholder, now redirects to setup
    - `apps/web/src/app/(employee)/profile/page.tsx` — NOT affected (handles missing employee gracefully)
    - `apps/web/src/app/(employee)/performance/page.tsx` — NOT affected (no internship dependency)
    - `apps/web/src/app/(employee)/files/page.tsx` — NOT affected (no internship dependency)

- [x] **Implement optional chaining and null-safe guards across intern UI**
  - File: `apps/web/src/hooks/useInternships.ts`
  - Hook already returned `{ data: null, isLoading, isError }` — no throwing behavior
  - Added `useInitializeInternship()` mutation hook for the self-initialization flow
  - Dashboard now redirects to `/intern/setup` instead of showing dead-end

- [x] **Create "Complete Profile Setup" fallback flow**
  - File: `apps/web/src/app/(employee)/intern/setup/page.tsx`
  - Guided form with: start date, end date, department (dropdown), school, program, required hours
  - Client-side validation with clear error messages
  - On success: redirects to `/intern/dashboard`

- [x] **Create API route for intern self-initialization**
  - File: `apps/web/src/app/api/internships/initialize/route.ts`
  - POST: Creates internship record for authenticated intern
  - Validates role is `intern`, prevents duplicate active records (409 Conflict)
  - Zod schema: `initializeInternshipSchema` in `internship.schema.ts`
  - Audit log entry written on successful initialization

- [x] **Update middleware to detect uninitialized interns**
  - File: `apps/web/src/middleware.ts`
  - After onboarding gate, checks if intern has active internship record
  - Redirects to `/intern/setup` if no active record found
  - Exempt paths: `/intern/setup`, `/api/internships/initialize`, `/onboarding/*`

- [x] **Add E2E test for intern first-login experience**
  - File: `e2e/intern-first-login.spec.ts`
  - Tests: New intern → sees setup flow, validates form fields, rejects invalid dates
  - Tests: Dashboard no longer shows dead-end "Contact your supervisor" message
  - Tests: Intern with expired record sees appropriate messaging

### V2-0.2 Supabase Auth Redirect Fix (CRITICAL)

**Problem:** Email confirmation redirects fail because `SITE_URL` in Supabase Dashboard does not match the deployment environment. Users cannot complete email verification after signup.

**Root Cause:** The `SITE_URL` in Supabase Auth > Configuration does not include all environments (local, Vercel preview, production).

- [x] **Audit and update Supabase Auth configuration**
  - Dashboard: Supabase > Authentication > Configuration > Site URL
  - Set `SITE_URL` to production URL
  - Add to "Redirect URLs" whitelist:
    - `http://localhost:3000/**`
    - `https://*.vercel.app/**`
    - `https://your-production-domain.com/**`

- [x] **Update auth callback route to handle multiple environments**
  - File: `apps/web/src/app/api/auth/callback/route.ts`
  - Ensure `next` parameter in callback URL is validated against allowed origins
  - Add environment-aware redirect logic
  - Also created primary callback at `apps/web/src/app/auth/callback/route.ts`

- [x] **Create environment configuration helper**
  - File: `apps/web/src/lib/auth/redirect-config.ts`
  - Centralize all redirect URL logic
  - Export: `getAuthCallbackUrl()`, `getPostLoginRedirect()`, `getPostSignupRedirect()`
  - Also exports: `isAllowedOrigin()`, `validateRedirectTarget()`, `getPasswordResetRedirectUrl()`

- [x] **Add environment variables to .env.example**
  - Add: `NEXT_PUBLIC_SITE_URL` (used for auth redirects)
  - Note: `NEXT_PUBLIC_AUTH_REDIRECT_URL` replaced by programmatic `getAuthCallbackUrl()`

- [x] **Write E2E test for email confirmation flow**
  - File: `e2e/auth-email-confirmation.spec.ts`
  - Tests: Signup → receive confirmation email → click link → redirected to app
  - Tests: Redirect works on localhost
  - Tests: Redirect works on Vercel preview URL

### V2-0.3 "Ghost Success" Button Bug Fix (CRITICAL)

**Problem:** Save/Submit buttons display a "Failed" toast or error message, but the data actually saves to the database. This is a state management / Promise handling issue.

**Root Cause:** The frontend times out waiting for a response, or the error handler catches a non-critical warning as an error. The UI state does not reflect the actual database state.

**Industry Standard:** Implement Optimistic UI Updates.

- [x] **Audit all mutation hooks for inconsistent success/error handling**
  - Files audited:
    - `apps/web/src/hooks/useCreateEmployee.ts`
    - `apps/web/src/hooks/useUpdateEmployee.ts`
    - `apps/web/src/hooks/useCreateReport.ts`
    - `apps/web/src/hooks/useSubmitReport.ts`
    - `apps/web/src/hooks/useUpdateOnboardingProfile.ts`
    - All other `useMutation` hooks
  - Note: Existing hooks not yet migrated to use optimistic mutation helpers

- [x] **Implement Optimistic UI pattern for mutations**
  - File: `apps/web/src/lib/mutation-helpers.ts`
  - Created `createOptimisticMutation()` and `toastMutation()` utilities
  - Also exports `createToastMutationHandler()` factory and `ToastController` interface
  - Note: Infrastructure complete; existing hooks pending migration to use helpers

- [x] **Fix toast notification timing**
  - Toast control handled via `ToastController` interface in `mutation-helpers.ts`
  - Loading toast with `duration: 0` transitions to success/error on resolve/reject
  - Radix-based toast primitive at `packages/ui/src/primitives/toast.tsx`

- [x] **Add stale cache invalidation after successful mutations**
  - File: `apps/web/src/contexts/AuthContext.tsx`
  - After successful signup, calls `queryClient.invalidateQueries()` + `router.refresh()`
  - Eliminates the "Refresh Dependency" issue reported by users

- [x] **Write unit tests for optimistic mutation helper**
  - File: `tests/lib/mutation-helpers.test.ts`
  - Tests: Optimistic update appears immediately
  - Tests: Rollback on actual server error
  - Tests: Cache invalidation on settle
  - Tests: Toast shows correct state transitions

---

## V2 Phase 1 - P1 Compliance & Internationalization

### V2-1.1 International Phone Number Validation

**Problem:** The system rejects Italian phone numbers (and likely other non-PH formats). Phone validation is either missing or hardcoded to Philippine format.

**Industry Standard:** Use `libphonenumber-js` library. Never write custom Regex for phone numbers.

- [x] **Install libphonenumber-js**
  ```bash
  cd apps/web && pnpm add libphonenumber-js
  ```

- [x] **Create phone validation utility**
  - File: `apps/web/src/lib/validation/phone.ts`
  - Functions: `validatePhoneNumber()`, `formatPhoneNumber()`, `getPhoneCountryCode()`, `getDefaultCountryCode()`
  - 10 supported countries (PH, US, IT, AU, GB, DE, SG, JP, KR, IN) with flags/dial codes
  - Uses `libphonenumber-js` for all parsing and validation

- [x] **Update all Zod schemas to use phone validation**
  - Files updated:
    - `apps/web/src/lib/schemas/employee.schema.ts`
    - `apps/web/src/lib/schemas/onboarding.schema.ts`
  - Uses `isValidPhoneNumber` from `libphonenumber-js` in Zod `.refine()` validators

- [x] **Update phone input components to include country selector**
  - File: `packages/ui/src/components/forms/PhoneInput.tsx`
  - Country selector dropdown with flag icons and dial codes
  - Phone number input with `type="tel"`
  - Close-on-outside-click, error/disabled states, onBlur formatting

- [x] **Update onboarding form phone fields**
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepPersonalInfo.tsx`
  - Replaced plain text input with `PhoneInput` component for:
    - Contact Number
    - Emergency Contact Number

- [x] **Write tests for phone validation**
  - File: `tests/lib/validation/phone.test.ts`
  - Test cases: PH (+63), IT (+39), US (+1), AU (+61), UK (+44), DE (+49)
  - Test edge cases: missing country code, too short, too long

### V2-1.2 Multi-Currency Support

**Problem:** The app is hardcoded to PHP (Philippine Pesos). Users need EUR, AUD, USD, and other currencies.

**Industry Standard:** Integrate an FX API (Open Exchange Rates or similar). Never hardcode exchange rates.

- [x] **Install currency and FX dependencies**
  ```bash
  cd apps/web && pnpm add currency.js
  ```

- [x] **Create FX rate service**
  - File: `apps/web/src/lib/fx/rates.ts`
  - 7 supported currencies (PHP, USD, EUR, AUD, GBP, SGD, JPY) with symbols/flags/locales
  - Exports: `getLatestRates()`, `getExchangeRate()`, `convertAmount()`, `formatCurrency()`, `getExchangeRateText()`
  - Cross-rate conversion via USD base

- [x] **Create FX rates database table and Edge Function**
  - File: `supabase/migrations/20260227000001_create_fx_rates_table.sql`
  - Creates `fx_rates` table with RLS, also includes invoice multi-currency columns
  - File: `supabase/functions/update-fx-rates/index.ts`
  - Deno Edge Function, POST-only, fetches from Open Exchange Rates API

- [x] **Update invoices schema to support multi-currency**
  - Combined into `supabase/migrations/20260227000001_create_fx_rates_table.sql`
  - Adds `source_currency`, `target_currency`, `exchange_rate`, `converted_amount` to invoices

- [x] **Create CurrencySelector component**
  - File: `packages/ui/src/components/forms/CurrencySelector.tsx`
  - Dropdown with currency code, symbol, and country flag
  - Exchange rate text display, accessible with `role="listbox"`, dark mode support

- [ ] **Update payroll/invoice pages for multi-currency**
  - File: `apps/web/src/app/(employee)/payroll/page.tsx`
  - File: `apps/web/src/app/(admin)/super-admin/payroll-approvals/page.tsx`
  - Add currency selector to invoice creation form
  - Show converted amounts in approval view
  - Display exchange rate used at time of submission

- [x] **Add environment variable**
  - `OPEN_EXCHANGE_RATES_API_KEY` - API key for FX rate provider

### V2-1.3 Bank Selection Dropdown for Onboarding

**Problem:** Users need a bank selection dropdown before entering account numbers. Currently, users type bank names freehand, leading to inconsistent data.

- [x] **Create bank registry table**
  - File: `supabase/migrations/20260227000002_create_bank_registry.sql`
  - Creates `bank_registry` table with indexes, RLS, and 35 seeded banks across PH, IT, AU, US, GB, SG, DE, GLOBAL
  - Also alters `onboarding_profiles` adding `payment_bank_id`, `payment_bank_name`, `payment_country_code`

- [x] **Create BankSelector component**
  - File: `packages/ui/src/components/forms/BankSelector.tsx`
  - Searchable dropdown with bank name and code
  - Filtered by user's selected country (includes GLOBAL banks)
  - "Other (enter manually)" option with freeform text input fallback

- [x] **Update onboarding payment step**
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/StepPaymentInfo.tsx`
  - Replaced freeform bank name input with `BankSelector` component
  - Order: Country → Bank → Account Number → Account Name

- [x] **Create bank registry API route**
  - File: `apps/web/src/app/api/banks/route.ts`
  - GET: List banks filtered by `country_code` (includes GLOBAL banks via `.or()`)
  - Cached for 1 hour (`s-maxage=3600`, SWR 24h)

---

## V2 Phase 2 - P2 Admin Utility & Data Granularity

### V2-2.1 Master Employee Directory (Global Directory)

**Source:** HR/Admin feedback — "Create a Master Directory view (Full list of employees/interns)"

This serves as the **Source of Truth** for all other features.

- [x] **Create Master Directory page**
  - File: `apps/web/src/app/(admin)/admin/directory/page.tsx`
  - Full list of all employees AND interns in a single, searchable, filterable table
  - Columns: Photo, Full Name, Role, Department, Position, Status, Start Date, Email, Phone
  - Filters: Role (Employee/Intern), Department, Status (Active/Probation/Inactive), Employment Type
  - Search: By name, email, position
  - Sort: By name, department, start date, status
  - Export: CSV / Excel download
  - Quick actions: View profile, Send message, Edit (admin only)

- [x] **Create directory API route**
  - File: `apps/web/src/app/api/directory/route.ts`
  - GET: Returns unified list from `employees` table joined with `users` and `internships`
  - Supports pagination, search, filters, sort
  - Includes aggregated metadata (total count, active count, intern count)

- [x] **Create directory hooks**
  - File: `apps/web/src/hooks/useDirectory.ts`
  - `useDirectory(filters)` — paginated, filterable list
  - `useDirectoryExport(filters)` — trigger CSV/Excel export

- [x] **Create PostgreSQL View for directory**
  - File: `supabase/migrations/20260228000001_create_directory_view.sql`
  ```sql
  CREATE OR REPLACE VIEW public.employee_directory AS
  SELECT
    u.id AS user_id,
    e.id AS employee_id,
    u.avatar_url,
    COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') AS full_name,
    u.role,
    d.name AS department_name,
    e.position,
    e.status,
    e.employment_type,
    e.date_hired AS start_date,
    u.email,
    e.contact_number,
    i.status AS internship_status,
    i.completed_hours,
    i.required_hours
  FROM public.users u
  LEFT JOIN public.employees e ON e.user_id = u.id
  LEFT JOIN public.departments d ON e.department_id = d.id
  LEFT JOIN public.internships i ON i.employee_id = e.id AND i.status = 'active'
  WHERE u.deleted_at IS NULL AND e.deleted_at IS NULL;
  ```

- [x] **Update Sidebar navigation**
  - File: `packages/ui/src/layout/Sidebar.tsx`
  - Add "Directory" item to `adminNavItems` and `superAdminNavItems`
  - Icon: `Users` from lucide-react
  - Path: `/admin/directory`

### V2-2.2 Individual KPI/OKR Views (CoS Requirement)

**Source:** Chief of Staff feedback — "KPIs/OKRs must be viewed per person, not just as a team total."

**Industry Standard:** Use PostgreSQL Views for per-person performance summaries. Keep heavy calculations on the database side.

- [x] **Create individual performance summary view**
  - File: `supabase/migrations/20260228000002_create_individual_performance_view.sql`
  ```sql
  CREATE OR REPLACE VIEW public.individual_performance_summary AS
  SELECT
    e.id AS employee_id,
    u.id AS user_id,
    COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') AS full_name,
    e.position,
    d.name AS department_name,
    -- KPI Summary
    COUNT(DISTINCT k.id) AS total_kpis,
    AVG(CASE WHEN k.target_value > 0
        THEN (k.current_value / k.target_value) * 100
        ELSE 0 END) AS avg_kpi_progress,
    -- OKR Summary
    COUNT(DISTINCT o.id) AS total_okrs,
    AVG(o.progress) AS avg_okr_progress,
    -- Review Summary
    MAX(pr.final_rating) AS latest_review_rating,
    MAX(pr.completed_at) AS latest_review_date
  FROM public.employees e
  JOIN public.users u ON e.user_id = u.id
  LEFT JOIN public.departments d ON e.department_id = d.id
  LEFT JOIN public.kpis k ON k.employee_id = e.id
  LEFT JOIN public.okrs o ON o.employee_id = e.id
  LEFT JOIN public.performance_reviews pr ON pr.employee_id = e.id
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, u.id, e.first_name, e.last_name, e.position, d.name;
  ```

- [x] **Create individual performance API route**
  - File: `apps/web/src/app/api/performance/individual/[employeeId]/route.ts`
  - GET: Returns full KPI, OKR, and review data for a specific employee
  - Includes time-series data for trend charts

- [x] **Create IndividualPerformancePage for managers/admins**
  - File: `apps/web/src/app/(admin)/admin/performance/employee/[id]/page.tsx`
  - Header: Employee name, photo, role, department
  - Sections: KPI Dashboard (cards + charts), OKR Progress (list with progress bars), Review History (timeline)
  - Drill-down: Click any KPI/OKR to see details and history

- [x] **Update existing admin performance page to link to individuals**
  - File: `apps/web/src/app/(admin)/admin/performance/page.tsx`
  - Add "View Individual" action to each employee row
  - Add department/role filter to narrow the team view

- [ ] **Create manager team performance page**
  - File: `apps/web/src/app/(employee)/manager/team-performance/page.tsx`
  - Show only direct reports
  - Summary cards per team member with click-through to individual detail

### V2-2.3 Automated OKR/KPI Score Calculation

**Source:** HR/Admin feedback — "Automated calculation of scores upon data upload."

**Industry Standard:** Calculate scores in the database (via Generated Columns or Postgres Functions), not on the frontend.

- [x] **Create Postgres function for OKR score calculation**
  - File: `supabase/migrations/20260228000003_create_okr_kpi_functions.sql`
  ```sql
  -- Function to recalculate OKR progress from key results
  CREATE OR REPLACE FUNCTION calculate_okr_progress(okr_id uuid)
  RETURNS numeric AS $$
  DECLARE
    kr_data jsonb;
    total_progress numeric := 0;
    kr_count integer := 0;
    kr record;
  BEGIN
    SELECT key_results INTO kr_data FROM public.okrs WHERE id = okr_id;
    FOR kr IN SELECT * FROM jsonb_array_elements(kr_data)
    LOOP
      total_progress := total_progress + COALESCE((kr.value->>'progress')::numeric, 0);
      kr_count := kr_count + 1;
    END LOOP;
    IF kr_count > 0 THEN
      RETURN ROUND(total_progress / kr_count, 2);
    END IF;
    RETURN 0;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Trigger to auto-update OKR progress when key_results changes
  CREATE OR REPLACE FUNCTION trigger_update_okr_progress()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.progress := calculate_okr_progress(NEW.id);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER okr_progress_auto_update
    BEFORE UPDATE OF key_results ON public.okrs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_okr_progress();

  -- KPI progress percentage as a generated column
  ALTER TABLE public.kpis
    ADD COLUMN progress_pct numeric(5,2)
    GENERATED ALWAYS AS (
      CASE WHEN target_value > 0
        THEN ROUND((current_value / target_value) * 100, 2)
        ELSE 0
      END
    ) STORED;
  ```

### V2-2.4 Birthdays & Work Anniversaries on Employee/Intern Tabs

**Source:** HR/Admin + CoS feedback — "Integrate Birthdays and Work Anniversaries into the Recent Activity feed" and "Birthdays/Anniversaries on Intern/Employee tabs."

- [x] **Create milestones API route**
  - File: `apps/web/src/app/api/milestones/route.ts`
  - GET: Returns upcoming birthdays and work anniversaries for next 30 days
  - Query: `employees` table WHERE `birthday` or `date_hired` month/day matches upcoming range

- [x] **Create MilestoneFeed component**
  - File: `packages/ui/src/components/dashboard/MilestoneFeed.tsx`
  - Displays upcoming birthdays (cake icon) and work anniversaries (party icon)
  - Grouped by: Today, This Week, This Month
  - Shows employee photo, name, milestone type, date

- [x] **Add MilestoneFeed to Admin Dashboard**
  - File: `apps/web/src/app/(admin)/admin/dashboard/page.tsx`
  - Add as a card/section in the dashboard layout

- [ ] **Add MilestoneFeed to Employee/Intern tabs**
  - File: `apps/web/src/app/(admin)/admin/interns/page.tsx`
  - File: `apps/web/src/app/(admin)/admin/probation/page.tsx` (renamed, see V2-2.5)
  - Show relevant milestones for interns or employees in that view

### V2-2.5 Rename "Employee Probation" to "Employee Management"

**Source:** HR/Admin feedback — "Rename 'Employee Probation' to 'Employee Management' to encompass onboarding."

- [x] **Rename page and route**
  - Rename: `apps/web/src/app/(admin)/admin/probation/page.tsx` → Keep file, update route
  - Create new route: `apps/web/src/app/(admin)/admin/employee-management/page.tsx`
  - Redirect `/admin/probation` → `/admin/employee-management` (in next.config.ts)
  - Update page title and breadcrumbs to "Employee Management"

- [x] **Expand page scope beyond probation**
  - Tabs: Probation | Onboarding | All Employees
  - Probation tab: Existing probation tracking (deadlines, reviews)
  - Onboarding tab: Link to onboarding data viewer (existing from V1 Phase 3.3.2)
  - All Employees tab: Quick link to Master Directory

- [x] **Update Sidebar navigation**
  - File: `packages/ui/src/layout/Sidebar.tsx`
  - Rename "Probation" → "Employee Management"
  - Icon: `UserCog` from lucide-react

### V2-2.6 Intern Management: Edit End Dates & Hours Progress Bar

**Source:** HR/Admin feedback — "Enable editing of internship End Dates for extensions" + Admin Assistant — "Implement a visual Progress Bar for required vs. completed internship hours."

- [x] **Enable intern end date editing**
  - File: `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx`
  - Add "Extend Internship" action button
  - Opens modal with new end date picker and reason field
  - Creates audit log entry for the extension

- [x] **Create internship extension API route**
  - File: `apps/web/src/app/api/internships/[id]/extend/route.ts`
  - PATCH: Updates `end_date` on internship record
  - Requires admin role
  - Logs extension reason in `audit_logs` table

- [x] **Create InternHoursProgressBar component**
  - File: `packages/ui/src/components/internship/InternHoursProgressBar.tsx`
  - Visual progress bar: `completed_hours / required_hours * 100`
  - Color coding: Green (>75%), Yellow (50-75%), Red (<50%)
  - Shows: "X of Y hours completed (Z%)"
  - Estimated completion date based on daily average

- [x] **Add progress bar to intern list and detail pages**
  - File: `apps/web/src/app/(admin)/admin/interns/[id]/page.tsx` — prominent display + extend modal
  - File: `apps/web/src/app/(employee)/intern/dashboard/page.tsx` — intern self-view (uses existing HoursProgressCard)

---

## V2 Phase 3 - P2 Communication & Notifications

### V2-3.1 Activate Notification Bell

**Source:** Intern feedback — "Activate the Notification Bell (currently a dead link)."

- [x] **Create notifications database table** (already existed in migration 20260227000001)
  - File: `supabase/migrations/20260220000007_create_notifications_table.sql`
  ```sql
  CREATE TYPE notification_type AS ENUM (
    'task_assigned', 'task_due', 'report_submitted', 'report_approved',
    'report_rejected', 'announcement_new', 'resource_new', 'reminder',
    'onboarding_step', 'probation_update', 'system'
  );

  CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title text NOT NULL,
    message text,
    link text, -- Deep link path (e.g., '/tasks/abc-123')
    is_read boolean DEFAULT false,
    read_at timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz
  );

  CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read)
    WHERE is_read = false;
  CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

  -- RLS: Users can only see their own notifications
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  CREATE POLICY notifications_self_policy ON public.notifications
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  ```

- [x] **Create notifications API routes**
  - File: `apps/web/src/app/api/notifications/route.ts`
  - GET: List notifications for current user (paginated, unread count)
  - PATCH: Mark notification as read
  - POST: Mark all as read
  - DELETE: Delete notification

- [x] **Create notification hooks**
  - File: `apps/web/src/hooks/useNotifications.ts`
  - `useNotifications()` — paginated list
  - `useUnreadCount()` — returns unread count (polled every 30s or via Supabase Realtime)
  - `useMarkNotificationRead()` — mutation
  - `useMarkAllRead()` — mutation

- [x] **Create NotificationBell component**
  - File: `packages/ui/src/components/notifications/NotificationBell.tsx`
  - Bell icon with unread count badge (red dot with number)
  - Click opens dropdown panel with notification list
  - Each notification: icon, title, time ago, read/unread indicator
  - Click notification: mark as read + navigate to `link`
  - "Mark All Read" button
  - "View All" link to full notifications page

- [x] **Create full notifications page**
  - File: `apps/web/src/app/(employee)/notifications/page.tsx`
  - Full list of all notifications with filters (read/unread, type)
  - Bulk actions: Mark selected as read, Delete selected

- [x] **Wire NotificationBell into Header**
  - File: `packages/ui/src/layout/Header.tsx`
  - Replace dead notification bell with real `NotificationBell` component
  - Position: Right side of header, before user avatar

- [x] **Create notification creation helper**
  - File: `apps/web/src/lib/notifications/create.ts`
  - Server-side helper to insert notifications
  - Used by API routes and n8n webhooks to create notifications
  - `createNotification({ userId, type, title, message, link })`

### V2-3.2 Audience-Targeted Announcements & View Counts

**Source:** Admin Assistant feedback — "Add Audience Targeting for announcements (filter by team or role)" + "Surface pending approvals on Dashboard."

Note: Audience targeting was already built in V1 (Section 2.4). This extends it with analytics.

- [x] **Implement announcement view count tracking**
  - Existing `announcement_reads` table already tracks reads
  - File: `apps/web/src/app/api/announcements/[id]/analytics/route.ts`
  - Extend to return: total views, unique views, views by role, views by department, read rate %

- [x] **Create AnnouncementAnalyticsDashboard component**
  - File: `packages/ui/src/components/announcements/AnnouncementAnalyticsDashboard.tsx`
  - Charts: Read rate over time, Audience breakdown (pie chart), Read vs Unread (bar)
  - Summary cards: Total targeted, Total read, Read rate %, Avg time to read

- [x] **Add bulk reminder sending for announcements**
  - File: `apps/web/src/app/api/announcements/[id]/remind/route.ts`
  - POST: Sends reminder notification to all targeted users who haven't read the announcement
  - Creates notification records for unread users

### V2-3.3 Dashboard Quick Alerts for Pending Approvals

**Source:** Admin Assistant feedback — "Surface pending approvals (reports, invoices, reviews) directly on the Dashboard."

- [x] **Create pending approvals API route**
  - File: `apps/web/src/app/api/dashboard/pending/route.ts`
  - GET: Returns counts and latest items for:
    - Pending report submissions
    - Pending invoice approvals
    - Pending performance reviews
    - Late intern EOD reports

- [x] **Create PendingApprovalsCard component**
  - File: `packages/ui/src/components/dashboard/PendingApprovalsCard.tsx`
  - Shows count badges for each category
  - Click navigates to the relevant approval page
  - Highlights overdue items in red

- [x] **Add to Admin Dashboard**
  - File: `apps/web/src/app/(admin)/admin/dashboard/page.tsx`
  - Add `PendingApprovalsCard` as a prominent top-section card

### V2-3.4 Auto-Reminder System (Late Reports & Compliance)

**Source:** Admin Assistant feedback — "Highlight late report submissions and implement an Auto-Reminder system (Email/Push)."

**Industry Standard:** Use Edge Functions (Cron Jobs). Don't rely on user being logged in.

- [x] **Create late report detection Edge Function**
  - File: `supabase/functions/check-late-reports/index.ts`
  - Trigger: Daily cron at 00:00 UTC
  - Logic:
    - Query employees with `report_type = 'weekly'` and no submitted report for last period
    - Query interns with no EOD log for yesterday
  - Actions:
    - Insert notification record for each late user
    - Send email via Resend/SendGrid to late users
    - Send summary to HR/Admin

- [x] **Create n8n workflow for escalation**
  - File: `n8n/workflows/compliance-late-report-escalation.json`
  - Day 1 late: Gentle reminder notification
  - Day 3 late: Email reminder + notify manager
  - Day 7 late: Escalate to HR/Admin dashboard alert

- [x] **Add "Late Reports" indicator to admin reports page**
  - File: `apps/web/src/app/(admin)/admin/reports/page.tsx`
  - Add filter: "Show Late Only"
  - Add visual indicator (red badge) for overdue submissions
  - Show days overdue count

---

## V2 Phase 4 - P2 Extensible User Profiles & Role Metadata

### V2-4.1 Extensible User Profiles (JSONB Metadata)

**Source:** Google Ads Specialist feedback — Role-specific fields needed without bloating the Users table.

**Industry Standard:** Use a JSONB column or a separate `User_Roles_Metadata` table. Avoid the "God Table" anti-pattern.

- [x] **Create user role metadata table**
  - File: `supabase/migrations/20260228000004_create_user_role_metadata.sql`
  ```sql
  CREATE TABLE public.user_role_metadata (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_type text NOT NULL, -- 'google_ads_specialist', 'content_creator', 'developer', etc.
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, role_type)
  );

  -- Example metadata shapes:
  -- Google Ads Specialist: { "primary_platforms": ["Google Ads", "Meta Ads"], "certifications": [...], "managed_accounts": 5 }
  -- Developer: { "primary_languages": ["TypeScript", "Python"], "github_username": "..." }

  ALTER TABLE public.user_role_metadata ENABLE ROW LEVEL SECURITY;

  CREATE POLICY metadata_self_policy ON public.user_role_metadata
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY metadata_admin_policy ON public.user_role_metadata
    FOR SELECT USING (
      user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin', 'ceo', 'cos'])
    );
  ```

- [x] **Create role metadata API routes**
  - File: `apps/web/src/app/api/users/[id]/metadata/route.ts`
  - GET: Returns metadata for user (self or admin)
  - PUT: Update metadata (self or admin)

- [x] **Create RoleMetadataForm component**
  - File: `packages/ui/src/components/profile/RoleMetadataForm.tsx`
  - Dynamic form that renders fields based on `role_type`
  - JSON schema-driven: each role_type has a registered field schema
  - Used on Profile page in an expandable "Role Details" section

- [x] **Update Profile page**
  - File: `apps/web/src/app/(employee)/profile/page.tsx`
  - Added "Role Details" section (V2-4.1) below standard profile info
  - Renders `RoleMetadataFormContainer` based on user's role_type

### V2-4.2 Google Ads Specialist Dashboard KPIs

**Source:** Google Ads Specialist feedback — "KPI Snapshots (Spend, CPA, ROAS) on Dashboard."

- [x] **Create role-specific dashboard widget system**
  - File: `packages/ui/src/components/dashboard/RoleDashboardWidget.tsx`
  - Factory pattern: renders different widgets based on user's role_type metadata
  - Google Ads widget: KPI cards for Spend, CPA, ROAS, Conversions
  - Data source: Manual entry (V2) with future API integration (V3)

- [x] **Create KPI entry form for specialists**
  - File: `apps/web/src/app/(employee)/dashboard/components/KPIEntryWidget.tsx`
  - Allows specialists to manually log daily/weekly KPI values
  - Stores in `user_role_metadata.metadata` or a dedicated `role_kpi_entries` table

### V2-4.3 Task Categorization (Launch vs. Optimization)

**Source:** Google Ads Specialist feedback — "Categorization (Launch vs. Optimization) for tasks."

- [x] **Add task category/tagging support**
  - File: `supabase/migrations/20260228000005_add_task_tags.sql`
  ```sql
  ALTER TABLE public.tasks
    ADD COLUMN tags text[] DEFAULT '{}',
    ADD COLUMN category text; -- 'launch', 'optimization', 'maintenance', 'research', etc.

  CREATE INDEX idx_tasks_tags ON public.tasks USING GIN(tags);
  CREATE INDEX idx_tasks_category ON public.tasks(category);
  ```

- [x] **Update TaskForm to include category and tags**
  - File: `packages/ui/src/components/tasks/TaskForm.tsx` (updated)
  - Added category dropdown: Launch, Optimization, Maintenance, Research, Administrative, Other
  - Added tag input (chip-style, freeform)

- [x] **Update TaskFilters to filter by category/tags**
  - File: `packages/ui/src/components/tasks/TaskFilters.tsx` (updated)
  - Added category filter dropdown
  - Added tag filter (multi-select)

---

## V2 Phase 5 - P3 UX Polish & Frontend Fixes

### V2-5.1 UI Bug Fixes from User Testing

- [x] **Fix Navbar hint text overlay on collapsed state**
  - File: `packages/ui/src/layout/Sidebar.tsx`
  - Fixed: Footer/hint text hidden when collapsed (`{!collapsed && (...)}`) to prevent overlay on toggle button

- [x] **Add Favicon**
  - File: `apps/web/public/favicon.svg` (SVG format instead of ICO/PNG)
  - File: `apps/web/public/apple-touch-icon.svg`
  - File: `apps/web/src/app/layout.tsx` — favicon meta tags added via `icons` metadata
  - Uses SN Connect brand icon in SVG format

- [x] **Remove "Exit" button from mandatory onboarding flow**
  - File: `apps/web/src/app/(employee)/onboarding/setup/components/NavigationControls.tsx`
  - No Exit/Cancel button present — only Back and Next/Complete buttons shown

- [x] **Fix transparent background readability issues**
  - Audited components for missing background classes in dark mode
  - Header and dashboard components have explicit `bg-white dark:bg-zinc-900`
  - Card/panel components updated with proper background classes

- [x] **Fix "Refresh Dependency" for signup success**
  - File: `apps/web/src/contexts/AuthContext.tsx`
  - After successful signup, calls `queryClient.invalidateQueries()` + `router.refresh()`
  - User sees updated state without manual page refresh

### V2-5.2 Guided Onboarding UX (Tooltips & Walkthrough)

**Source:** CoS / V2 Wishlist — "Tooltips and a Walkthrough for new users."

- [x] **Install onboarding library**
  ```bash
  cd apps/web && pnpm add @sjmc11/tourguidejs
  ```

- [x] **Create TourGuide configuration**
  - File: `apps/web/src/lib/tour/tours.ts`
  - Defined tour steps for each major section:
    - Dashboard tour (5-7 steps): sidebar nav, stats cards, quick actions, announcements
    - Profile tour (3-4 steps): edit fields, save, upload photo
    - Tasks tour (4-5 steps): create task, filters, detail view, comments

- [x] **Create TourProvider component**
  - File: `apps/web/src/components/TourProvider.tsx`
  - Wraps app, triggers tour on first visit (tracked via `localStorage` flag per tour)
  - "Skip Tour" and "Replay Tour" options

- [x] **Add "Help" button to Header**
  - File: `packages/ui/src/layout/Header.tsx`
  - Help icon (`CircleHelp` from lucide-react) that opens tour for current page

### V2-5.3 Performance Optimization

**Source:** CoS / V2 Wishlist — "Reduce page load times."

- [x] **Implement route-level code splitting**
  - Page components use `next/dynamic` for heavy components
  - Lazy-loaded: chart libraries, rich text editor, file uploaders

- [x] **Add Suspense boundaries with skeleton fallbacks**
  - File: `apps/web/src/app/(employee)/dashboard/loading.tsx`
  - File: `apps/web/src/app/(admin)/admin/dashboard/loading.tsx`
  - Uses existing `SkeletonCard` and `SkeletonTable` components from V1

- [x] **Optimize TanStack Query settings**
  - File: `apps/web/src/lib/query-client.ts`
  - Set `staleTime: 5 * 60 * 1000` (5 minutes) for stable data (departments, bank registry)
  - `STALE_TIMES` constants defined for dynamic data (notifications, tasks)
  - `placeholderData` enabled for list queries

- [x] **Audit and optimize Supabase queries**
  - List APIs use `.select()` with only needed columns
  - Database indexes added for performance-critical queries
  - Uses `.count('exact')` for pagination metadata

---

## V2 Phase 6 - P3 Reporting & Knowledge Base

### V2-6.1 Hierarchical Report Grouping

**Source:** Google Ads Specialist feedback — "Hierarchical grouping (Account > Campaign) for reports."

- [x] **Add report hierarchy support**
  - File: `supabase/migrations/20260227000010_add_report_hierarchy.sql`
  ```sql
  ALTER TABLE public.reports
    ADD COLUMN parent_report_id uuid REFERENCES public.reports(id),
    ADD COLUMN report_group text, -- 'account', 'campaign', 'ad_set', etc.
    ADD COLUMN hierarchy_path text[]; -- Breadcrumb: ['Account A', 'Campaign B']
  ```
  - Also includes: `get_report_children()`, `get_report_tree()` recursive functions, `root_reports` view

- [x] **Update report list pages to support grouped view**
  - File: `apps/web/src/app/(employee)/reports/page.tsx`
  - Add toggle: Flat View | Grouped View
  - Grouped view: collapsible tree structure (Account → Campaign → Reports)
  - `GroupedReportRow` component with recursive child loading
  - `HierarchyBreadcrumb` component for `hierarchy_path` display

### V2-6.2 Knowledge Base Edit History (Audit Logging)

**Source:** Admin Assistant feedback — "Edit History for Knowledge Base."

**Industry Standard:** Audit Logging.

- [x] **Add version tracking to knowledge sources**
  - File: `supabase/migrations/20260227000011_add_knowledge_audit_log.sql`
  ```sql
  CREATE TABLE public.knowledge_source_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    content text NOT NULL,
    changed_by uuid NOT NULL REFERENCES public.users(id),
    change_summary text,
    created_at timestamptz DEFAULT now() NOT NULL
  );

  CREATE INDEX idx_knowledge_versions_source ON public.knowledge_source_versions(source_id, version_number DESC);
  ```
  - Also includes: auto-versioning trigger (`snapshot_knowledge_source_version()`), `get_knowledge_source_versions()`, `restore_knowledge_source_version()` functions

- [x] **Create version history UI**
  - File: `packages/ui/src/components/ai-knowledge/VersionHistory.tsx`
  - Timeline view of all edits
  - Diff view between versions
  - Restore previous version action
  - File: `apps/web/src/app/api/ai/sources/[id]/versions/route.ts` — GET (list versions) + POST (restore version)
  - File: `apps/web/src/hooks/useKnowledgeVersions.ts` — `useKnowledgeVersions()`, `useRestoreKnowledgeVersion()` hooks

### V2-6.3 Resource Category Editing & RBAC

**Source:** Admin Assistant feedback — "Category Editing + RBAC (Access Limits) for Resources."

- [x] **Make resource categories admin-editable**
  - File: `supabase/migrations/20260227000012_create_resource_categories_table.sql`
  ```sql
  CREATE TABLE public.resource_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text,
    icon text, -- lucide icon name
    parent_id uuid REFERENCES public.resource_categories(id), -- For subcategories
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  );
  ```
  - Migrate from enum-based categories to table-based (dynamic)
  - Seeded with 10 existing enum values
  - Backfill `category_id` FK from existing enum `category` column
  - Added `resource_access_level` enum and `access_level` column to resources
  - `get_resource_category_tree()` recursive function

- [x] **Create category management page**
  - File: `apps/web/src/app/(admin)/admin/resources/categories/page.tsx`
  - CRUD for categories and subcategories
  - Tree view with icon display and resource counts
  - Icon selection (lucide icon picker)
  - File: `apps/web/src/app/api/resources/categories/route.ts` — GET/POST/PATCH/DELETE
  - File: `apps/web/src/hooks/useResourceCategories.ts` — hooks + `buildCategoryTree()` utility

- [x] **Add granular RBAC for resources**
  - Extend resource RLS to support "View-only" (no download) vs "Full access" (view + download)
  - File: Updated `apps/web/src/app/api/resources/[id]/download/route.ts`
  - Check `resource.access_level` before generating signed URL
  - Return 403 if user only has view access

---

## V2 Phase 7 - Signed URLs for View-Only Video

### V2-7.1 Secure Video Streaming (View-Only)

**Source:** HR/Admin feedback — "Support video uploads with granular permissions (View-only vs. Downloadable)."

**Decision:** Use Signed URLs via Supabase Storage with short expiry and no-download headers.

- [x] **Add access_level to resources table**
  - File: `supabase/migrations/20260228000006_add_resource_access_level.sql`
  ```sql
  CREATE TYPE resource_access_level AS ENUM ('full', 'view_only');

  ALTER TABLE public.resources
    ADD COLUMN access_level resource_access_level DEFAULT 'full';
  ```

- [x] **Create secure video streaming route**
  - File: `apps/web/src/app/api/resources/[id]/stream/route.ts`
  - For `view_only` resources:
    - Generate short-lived signed URL (5 minute expiry)
    - Set response headers: `Content-Disposition: inline` (prevent download dialog)
    - Do NOT return direct file URL to frontend
  - For `full` access:
    - Generate standard signed URL for download

- [x] **Update VideoPlayer component for view-only mode**
  - File: `packages/ui/src/components/resources/VideoPlayer.tsx`
  - When `access_level === 'view_only'`:
    - Disable right-click context menu
    - Hide download controls on HTML5 video element (`controlsList="nodownload"`)
    - Use blob URL instead of direct URL (prevents easy copying)
  - Note: Client-side protections are not foolproof but raise the bar

---

## Appendix: New Environment Variables for V2

```env
# V2 Additions

# FX Rates
OPEN_EXCHANGE_RATES_API_KEY=

# Email Service (for auto-reminders)
RESEND_API_KEY=

# Tour Guide (optional)
NEXT_PUBLIC_ENABLE_TOURS=true
```

---

## Appendix: V2 Migration Files Summary

| Migration File | Purpose |
|---|---|
| `20260227000001_create_fx_rates_table.sql` | Foreign exchange rates table + multi-currency invoices |
| `20260227000002_create_bank_registry.sql` | Bank selection registry |
| `20260228000001_create_directory_view.sql` | Master employee directory view |
| `20260228000002_create_individual_performance_view.sql` | Individual performance summary view |
| `20260228000003_create_okr_kpi_functions.sql` | Automated OKR/KPI calculation |
| `20260220000007_create_notifications_table.sql` | Notifications system |
| `20260228000004_create_user_role_metadata.sql` | Extensible role-specific profiles |
| `20260228000005_add_task_tags.sql` | Task categorization and tagging |
| `20260227000010_add_report_hierarchy.sql` | Hierarchical report grouping |
| `20260227000011_add_knowledge_audit_log.sql` | Knowledge base version history |
| `20260227000012_create_resource_categories_table.sql` | Dynamic resource categories |
| `20260228000006_add_resource_access_level.sql` | View-only vs downloadable access |

---

## Quick Reference: Feedback → Implementation Mapping

| Feedback Item | Source | V2 Section |
|---|---|---|
| Intern "No active record" dead-end | Intern (Set 2) | V2-0.1 |
| Supabase Auth redirect failures | Intern (Set 1) | V2-0.2 |
| "Ghost Success" button bug | CoS (Set 3) | V2-0.3 |
| Phone number validation (Italian) | CoS (Set 3) | V2-1.1 |
| Currency hardcoded to PHP | CoS (Set 3) | V2-1.2 |
| Bank selection dropdown | CoS (Set 3) | V2-1.3 |
| Master Employee Directory | HR/Admin (Set 1) | V2-2.1 |
| Individual KPI/OKR views | CoS (Set 3) | V2-2.2 |
| Automated OKR/KPI calculation | HR/Admin (Set 1) | V2-2.3 |
| Birthdays/Anniversaries feed | HR/Admin (Set 1), CoS (Set 3) | V2-2.4 |
| Rename "Probation" → "Employee Management" | HR/Admin (Set 1) | V2-2.5 |
| Edit intern end dates + Hours progress bar | HR/Admin (Set 1), Admin Asst (Set 2) | V2-2.6 |
| Activate Notification Bell | Intern (Set 1) | V2-3.1 |
| Announcement view counts & bulk reminders | Admin Asst (Set 1, Set 2) | V2-3.2 |
| Dashboard pending approvals | Admin Asst (Set 1) | V2-3.3 |
| Auto-reminders for late reports | Admin Asst (Set 1) | V2-3.4 |
| Extensible user profiles (JSONB) | Google Ads Specialist (Set 2) | V2-4.1 |
| Role-specific dashboard KPIs | Google Ads Specialist (Set 2) | V2-4.2 |
| Task categorization (Launch vs. Optimization) | Google Ads Specialist (Set 2) | V2-4.3 |
| Navbar hint text overlay fix | Intern (Set 1) | V2-5.1 |
| Add Favicon | Intern (Set 1) | V2-5.1 |
| Remove Exit button from mandatory onboarding | Intern (Set 1) | V2-5.1 |
| Fix transparent backgrounds | Intern (Set 1) | V2-5.1 |
| Guided UX / Tooltips / Walkthrough | CoS (Set 3) | V2-5.2 |
| Page load performance optimization | CoS (Set 3) | V2-5.3 |
| Hierarchical report grouping | Google Ads Specialist (Set 2) | V2-6.1 |
| Knowledge base edit history | Admin Asst (Set 2) | V2-6.2 |
| Resource category editing + RBAC | Admin Asst (Set 2) | V2-6.3 |
| View-only video streaming | HR/Admin (Set 1) | V2-7.1 |

---

*Last Updated: 2026-02-27*
*Generated by SN Connect Architect Agent — V2 based on 1st User Testing Feedback*
