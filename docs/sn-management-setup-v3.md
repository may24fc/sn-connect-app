# CONTROL HUB HR PORTAL — V3 IMPLEMENTATION PLAN

> **Format**: AI-actionable checklist for copilot/CLI execution
> **Generated**: 2026-03-15
> **Predecessor**: V2 Implementation Plan (2026-02-22)
> **Stack**: Next.js + Capacitor | n8n | Supabase (RLS) | Claude API

---

## EXECUTION PROTOCOL

```yaml
priority_order: [P0, P1, P2, P3]
rule_1: Complete ALL P0 items before starting any P1 item.
rule_2: A feature is DONE only when every acceptance criterion passes.
rule_3: If blocked, document the blocker inline and skip to next task in same tier.
rule_4: Never break working V2 functionality — backward compatibility required.
rule_5: All new UI must be mobile-first and responsive.
rule_6: All new API routes must include input validation, error handling, and RLS.
rule_7: Commit after each completed subtask. Commit message format → "V3-X.Y: <subtask summary>"
```

---

## PRIORITY MATRIX

| ID | Pri | Feature | Page | Status |
|----|-----|---------|------|--------|
| V3-0.1 | P0 | Global Error Handling Audit | ALL | 🟡 Partial |
| V3-0.2 | P0 | Password Reset Email Delivery Fix | Auth | 🟡 Partial |
| V3-0.3 | P0 | SSL / Unprotected Site Warning Fix | ALL | 🟡 Partial |
| V3-0.4 | P0 | Post-Onboarding UI Freeze Fix | Dashboard | 🟡 Partial |
| V3-0.5 | ~~P0~~ | ~~Calendar & Leave Request Error Fix~~ | Dashboard | ❌ Cancelled (features removed — see ADR) |
| V3-1.1 | P1 | Hero Section Achievement Display | WWW | ✅ Done |
| V3-1.2 | P1 | Sticky "What's New" Top Banner | WWW | 🟡 Partial |
| V3-1.3 | P1 | Company "Visit Website" Links | WWW | 🟡 Partial |
| V3-1.4 | P1 | Application Confirmation Email | WWW | 🟡 Partial |
| V3-1.5 | P1 | Invoice: Rate, Currency, Auto-Calc | Invoice | ✅ Done |
| V3-1.6 | P1 | Add New Task Button | Tasks | 🟡 Partial |
| V3-1.7 | P1 | Document Delete + Open in New Tab | Documents | 🟡 Partial |
| V3-2.1 | P2 | Dashboard Color Separation | Dashboard | ⬜ Pending |
| V3-2.2 | P2 | Task & Performance Status Colors | Tasks, Perf | ✅ Done |
| V3-2.3 | P2 | Invoice Status Indicators | Invoice | 🟡 Partial |
| V3-2.4 | P2 | Reports Data Visualization (Charts) | Reports | 🟡 Partial |
| V3-2.5 | P2 | Profile: Primary Platform Field | Profile | 🟡 Partial |
| V3-2.6 | P2 | Dead Icon Links Audit & Fix | ALL | 🟡 Partial |
| V3-3.1 | P3 | Reports Viewing Errors + Type Clarity | Reports | 🟡 Partial |
| V3-3.2 | P3 | Navbar Route Audit & Fix | Navigation | ⬜ Pending |

---

## P0 — BLOCKERS (CRITICAL)

### V3-0.1: Global Error Handling Audit — Eliminate "Something went wrong"

- **Page**: ALL PAGES
- **Source**: Task Page screenshot; multiple testers report generic errors; JS crash `undefined is not an object (evaluating 'l.variant')`
- **Why P0**: Generic errors with no recovery block all user flows and erode trust.

#### Subtask 1: Audit all API route handlers

- [x] Grep codebase for `Something went wrong`, `error`, `catch` patterns
- [ ] Map every API endpoint to its failure modes (auth, validation, network, DB)
- [x] Create error-code registry: `E001-AUTH`, `E002-VALIDATION`, `E003-NETWORK`, `E004-DB`, `E005-PERMISSION`

**Acceptance Criteria:**
1. Zero instances of the string "Something went wrong" remain in codebase
2. Every API route returns structured JSON: `{ success: boolean, error?: { code: string, message: string, action: string } }`
3. Every catch block logs full error stack server-side before returning user-friendly message

#### Subtask 2: Implement global ErrorBoundary with contextual recovery

- [x] Create `<ErrorBoundary>` wrapper — displays: (a) plain-language error, (b) Retry button, (c) Go to Dashboard fallback
- [ ] Add per-page error boundaries so one broken section does not crash the full app
- [ ] Wire "Report Issue" button → sends error context (page, action, timestamp, role) to admin log table

**Acceptance Criteria:**
1. No page ever shows a blank white screen or raw browser error
2. Every error state shows at least one recovery action (Retry / Go Back / Dashboard)
3. ErrorBoundary catches and renders graceful UI for: network timeout, 401/403, 500, malformed response

#### Subtask 3: Fix Task Page crash — `l.variant` undefined

- [x] Reproduce crash: navigate to Task Page with missing/null task data
- [x] Add optional chaining (`?.`) to all task object property reads
- [x] Add loading skeleton while task data fetches
- [x] If user has zero tasks → show empty state with "No tasks yet" + Add Task CTA

**Acceptance Criteria:**
1. Task Page loads without error when user has zero tasks
2. Clicking any task nav element never throws a JS exception
3. Console shows zero uncaught errors on Task Page load and interaction

---

### V3-0.2: Password Reset Email Delivery Fix

- **Page**: Auth / Login
- **Source**: Tester did not receive reset email; screenshot shows confirmation for `patrickmong6691@gmail.com`
- **Why P0**: Blocks user access entirely.

#### Subtask 1: Diagnose and fix Supabase email pipeline

- [ ] Check Supabase Dashboard → Authentication → Email Templates — verify reset template exists and is enabled
- [ ] Check SMTP settings — confirm custom SMTP (Resend/SendGrid) is configured (built-in has strict rate limits)
- [ ] Check SMTP provider logs for bounced/rejected emails
- [ ] Verify redirect URL in Supabase Auth config matches deployed domain (not localhost)

**Acceptance Criteria:**
1. Password reset email arrives within 60 seconds for any valid registered email
2. Email contains a working reset link that redirects to the app password-change page
3. If email is not registered, system still shows "Check your email" (no email enumeration) but logs attempt

#### Subtask 2: Add retry and fallback UX

- [x] Add "Resend Email" button — enabled after 60-second cooldown
- [ ] Add helper text: "Check your spam/junk folder. If you still do not receive it, contact your admin."
- [ ] Log all password reset requests to admin-visible audit log

**Acceptance Criteria:**
1. "Resend Email" button appears and is functional after 60 seconds
2. Rate limit: max 3 reset emails per address per hour
3. Admin can view all reset attempts in admin panel audit log

---

### V3-0.3: SSL / "Unprotected" Site Warning Fix

- **Page**: ALL PAGES
- **Source**: Testers report "Cant open. Saying it unprotected" and "Unable to reach the site"
- **Why P0**: Blocks all access for affected users.

#### Subtask 1: Verify and enforce HTTPS with valid SSL

- [ ] Check hosting platform (Vercel/Cloudflare) SSL cert — ensure issued, not expired, covers all subdomains
- [ ] Force HTTPS redirect — all HTTP → HTTPS
- [ ] Check DNS A/CNAME records point to correct host
- [ ] Test from Chrome, Safari, Firefox on desktop and mobile across multiple networks

**Acceptance Criteria:**
1. Browser shows lock icon (valid SSL) on all pages
2. HTTP auto-redirects to HTTPS
3. App accessible from Chrome, Safari, Firefox on desktop and mobile
4. Zero `NET::ERR_CERT` or "unprotected" browser warnings

#### Subtask 2: Add health-check endpoint and uptime monitoring

- [x] Create `GET /api/health` → returns `{ status: "ok", timestamp, version }`
- [ ] Set up uptime monitor (UptimeRobot free tier) → ping `/api/health` every 5 min
- [ ] Configure alert to notify admin channel on downtime

**Acceptance Criteria:**
1. `/api/health` returns 200 OK with < 500ms latency
2. Admin receives alert within 10 minutes of downtime
3. Health endpoint is excluded from auth middleware

---

### V3-0.4: Post-Onboarding UI Freeze Fix

- **Page**: Dashboard
- **Source**: "Sometime the website is unclickable after the UI Tour"
- **Why P0**: Requires force-reload; unusable state.

#### Subtask 1: Fix tour overlay cleanup

- [x] Identify tour library (react-joyride / intro.js / shepherd.js)
- [x] Add `onComplete`/`onSkip` callback → explicitly remove all overlay elements, backdrop divs, `pointer-events: none` styles
- [x] Add 3-second timeout failsafe: if overlay still present after tour ends, force-remove it
- [ ] Test: rapid clicking, skipping steps, browser back button during tour

**Acceptance Criteria:**
1. After tour completion, all elements are immediately clickable
2. After tour skip, all elements are immediately clickable
3. No orphaned overlay divs remain in DOM after tour ends
4. Tour can be restarted from settings without stale overlay state

---

### ~~V3-0.5: Calendar & Leave Request Error Fix~~ — CANCELLED

> **Status:** Features removed from the application. Calendar, leave requests, and company events were removed as premature features (commit `60137af`). Dashboard no longer includes calendar or leave request widgets.

---

## P1 — CORE FUNCTIONALITY

### V3-1.1: WWW Hero Section — Achievement Display

- **Page**: WWW / Landing Page
- **Source**: "Add direct achievement section on Hero Section"

#### Subtask 1: Create AchievementCounter component

- [x] Design animated counter cards (e.g., "X Employees Managed", "X Tasks Completed", "X Countries", "X Projects Active")
- [x] Use count-up animation on scroll-into-view (`IntersectionObserver`)
- [x] Fetch real stats from `GET /api/public/stats` (cached, refreshed hourly)
- [x] Fallback to static values if API unavailable

**Acceptance Criteria:**
1. Hero section displays at least 4 achievement counters
2. Counters animate from 0 to value when scrolled into view
3. Values auto-update from DB without code changes
4. Mobile: 2x2 grid; Desktop: 4x1 row

---

### V3-1.2: WWW Sticky "What's New" Top Banner

- **Page**: WWW / Landing Page
- **Source**: "Move What's New to top banner so it remains visible when scrolling"

#### Subtask 1: Implement sticky announcement banner

- [x] Create thin (32–40px) bar: `position: sticky; top: 0; z-index: 50`
- [x] Migrate existing "What's New" content into banner
- [ ] Add marquee/scroll animation for multiple announcements
- [x] Add dismiss (X) button → sets `sessionStorage` flag, hidden until next session
- [x] Adjust page `padding-top` to account for banner height

**Acceptance Criteria:**
1. Banner remains visible at all scroll positions
2. Banner does not overlap nav or content
3. Dismiss button hides banner for current session only
4. Banner content is admin-editable from CMS/dashboard
5. Mobile: text truncates with ellipsis

---

### V3-1.3: WWW Company "Visit Website" Links

- **Page**: WWW / Landing Page
- **Source**: "Add a Visit Website button/link for each company"

#### Subtask 1: Add website URL field and render buttons

- [x] Add `website_url` column to companies table (nullable TEXT) if not present
- [ ] Update company admin CRUD to include URL field with URL validation
- [x] Render "Visit Website" button on each company card → `target="_blank" rel="noopener noreferrer"`
- [x] No URL set → hide button (no broken link)

**Acceptance Criteria:**
1. Every company with `website_url` shows clickable "Visit Website" button
2. Opens in new tab
3. Companies without URL show no button
4. URL validates format on admin input (must start with `https://`)

---

### V3-1.4: WWW Application Confirmation Email

- **Page**: WWW / Application Form
- **Source**: "Automatically send email confirmation to applicants"

#### Subtask 1: Implement post-submission email trigger

- [x] Create email template — Subject: `Application Received — [Company Name]`; Body: "We have received your application. Our team will review it and reach out if you are shortlisted."
- [x] Wire email send in `POST /api/applications` using SMTP provider (Resend/SendGrid)
- [x] Include applicant name, position, date in email body
- [ ] Log send status (sent/failed) in `applications` table

**Acceptance Criteria:**
1. Applicant receives confirmation within 2 minutes of submission
2. Email includes applicant name, position title, company name
3. Email is branded with company logo and colors
4. Failed sends logged and retried once after 5 minutes
5. Email does not land in spam (SPF/DKIM configured)

---

### V3-1.5: Invoice — Hourly Rate, Currency & Auto-Calculation

- **Page**: Invoice Page
- **Source**: "Add fields for hourly rate, currency, hours worked, auto-calculate total"; "Is there automated AUD to PHP conversion"

#### Subtask 1: Add invoice calculation fields

- [x] Add form fields: `hourly_rate` (number), `currency` (dropdown: PHP, AUD, USD, EUR, GBP), `hours_worked` (number), `period_start` (date), `period_end` (date)
- [x] Add computed display: `subtotal = hourly_rate × hours_worked`
- [x] Add FX rate display + `converted_total` (auto-calculated)
- [x] Store all values in invoices table: rate, hours, currency, fx_rate_used, subtotal_foreign, total_php

**Acceptance Criteria:**
1. User can select from at least 5 currencies (PHP, AUD, USD, EUR, GBP)
2. Subtotal auto-calculates in real time
3. FX conversion applies automatically from stored exchange rates
4. Invoice stores FX rate used at creation (audit trail)
5. Total displays in both original currency and PHP

#### Subtask 2: Implement exchange rate service

- [x] Create `fx_rates` table: `{ from_currency, to_currency, rate, fetched_at }`
- [x] Create Supabase Edge Function or n8n workflow → fetch daily rates from exchangerate.host
- [x] Cache in table; refresh daily at 00:00 UTC
- [x] Invoice form reads from `fx_rates`; shows "Rate as of [date]"

**Acceptance Criteria:**
1. FX rates update daily without manual intervention
2. If fetch fails, last known rate used with warning label
3. Rate source and timestamp displayed on form
4. Historical rates preserved (not overwritten)

---

### V3-1.6: Task Page — Add New Task Button

- **Page**: Tasks Page
- **Source**: "Can there be a button to add new task"; "Clarify if we manually input tasks or someone populates them"

#### Subtask 1: Implement Add Task functionality

- [x] Add FAB or top-right "+  Add Task" button on Tasks Page
- [x] Create `<AddTaskModal>` — fields: title, description, category (dropdown), priority (Low/Med/High), due_date, assignee
- [x] `POST /api/tasks` with validation
- [x] New task appears immediately (optimistic UI)
- [x] Admin/Manager can assign to others; regular users self-assign only

**Acceptance Criteria:**
1. "+ Add Task" button visible on Tasks Page for all roles
2. Modal opens with all required fields
3. Validation: title required (min 3 chars), due date in the future
4. New task appears without page reload
5. Categories match existing system: campaign launch, optimization, testing, reporting, checking leads

#### Subtask 2: Clarify task population model

- [ ] Add help tooltip/info banner: "Tasks can be assigned by your manager or added by you. Use + to create your own."
- [x] Label existing admin-assigned tasks as "Assigned by [Name]"

**Acceptance Criteria:**
1. Users understand self-input vs. manager-assigned model
2. Each task shows creator/assigner
3. Help text is dismissible, does not reappear once dismissed

---

### V3-1.7: Document Delete + Open in New Tab

- **Page**: Documents Page
- **Source**: "Cannot delete PDF mistakenly uploaded"; "Create a new tab instead of using current tab"

#### Subtask 1: Add document delete

- [x] Add delete (trash icon) on each document row
- [x] Confirmation modal: "Are you sure? This cannot be undone."
- [x] `DELETE /api/documents/[id]` — soft delete (retain 30 days) or hard delete from Storage
- [x] Only uploader or admin can delete (RLS enforced)
- [x] List updates immediately (optimistic UI)

**Acceptance Criteria:**
1. Delete button on documents uploaded by current user
2. Admins can delete any document
3. Confirmation prevents accidental deletion
4. Deleted doc disappears immediately
5. Soft-deleted recoverable by admin within 30 days

#### Subtask 2: Open documents in new tab

- [x] Change all view/download links → `target="_blank" rel="noopener noreferrer"`
- [x] PDF: open Supabase Storage URL in new tab
- [ ] Non-PDF: trigger download in new tab

**Acceptance Criteria:**
1. Clicking "View" opens document in new browser tab
2. Main app stays on Documents Page
3. Works for PDF, DOCX, and image files

---

## P2 — UX & VISUAL IMPROVEMENTS

### V3-2.1: Dashboard Color Separation & Sections

- **Page**: Dashboard
- **Source**: "Everything has a white background. Add color separation."

#### Subtask 1: Implement section-based color theming

- [ ] Group widgets: Quick Stats (top), Calendar/Schedule (mid), Activity Feed (bottom)
- [ ] Apply alternating backgrounds: white, `#F8F9FA`, `#EBF5FB`
- [ ] Add colored left-border accents to cards by category (blue=tasks, green=approvals, orange=alerts)
- [ ] Add section headers with divider lines

**Acceptance Criteria:**
1. Dashboard has at least 3 visually distinct sections
2. No two adjacent sections share same background
3. Card borders use consistent color coding app-wide
4. Passes WCAG AA contrast
5. Mobile maintains visual separation

---

### V3-2.2: Task & Performance Status Color Coding

- **Page**: Tasks Page, Performance Review Page
- **Source**: "Add color-coded labels for task status"

#### Subtask 1: Create StatusBadge component

- [x] Create `<StatusBadge>` — color map: Pending `#F39C12`, In Progress `#3498DB`, Completed `#27AE60`, Overdue `#E74C3C`, Under Review `#9B59B6`
- [x] Apply to: task list, task detail, performance list, performance detail
- [x] Add filter-by-status dropdown on Tasks and Performance pages
- [x] Badges include text (not color-only) for accessibility

**Acceptance Criteria:**
1. All task statuses display with colored badges
2. All performance statuses display with colored badges
3. Color mapping consistent across Tasks and Performance
4. Users can filter by status
5. Badges accessible (text + color)

---

### V3-2.3: Invoice Status Indicators

- **Page**: Invoice Page
- **Source**: "Add visual status labels: Pending, Approved, Sent, Rejected"

#### Subtask 1: Add invoice status badges and workflow

- [x] Reuse `<StatusBadge>` — invoice map: Draft `#95A5A6`, Pending `#F39C12`, Approved `#27AE60`, Sent `#3498DB`, Rejected `#E74C3C`, Paid `#2ECC71`
- [x] Display on invoice list and detail view
- [x] Add admin transition buttons: Approve, Reject, Mark Sent, Mark Paid
- [ ] Log transitions with timestamp + actor in `invoice_status_log` table

**Acceptance Criteria:**
1. Every invoice displays colored status badge
2. Admin can transition status via action buttons
3. Status history preserved and viewable on detail page
4. Valid workflow: Draft → Pending → Approved → Sent → Paid (or Rejected at any stage)

---

### V3-2.4: Reports — Data Visualization with Charts

- **Page**: Reports Page
- **Source**: "Present data using charts not just tables"; "Customize report structure for Meta campaigns"

#### Subtask 1: Add chart visualizations

- [x] Install Recharts (recommended for Next.js)
- [ ] Marketing reports: bar (spend vs conversions), line (performance over time), pie (budget by platform)
- [ ] Weekly/monthly reports: trend line (tasks completed), stacked bar (status breakdown)
- [x] Add toggle: "Table View" vs "Chart View"
- [ ] Charts responsive down to 320px

**Acceptance Criteria:**
1. At least 2 chart types per report category
2. Users can toggle table ↔ chart views
3. Charts render on screens ≥ 320px
4. Chart data matches underlying table exactly
5. Axis labels, legends, hover tooltips present

#### Subtask 2: Report structure customization

- [ ] Marketing users select metrics: impressions, clicks, CTR, conversions, spend, ROAS (checkboxes)
- [ ] Support multi-campaign breakdown per period
- [ ] Add template selector: Weekly Summary, Monthly Summary, Campaign Deep-Dive
- [ ] Align format with standard Meta Ads Manager export

**Acceptance Criteria:**
1. Marketing users can select which metrics appear
2. Multi-campaign breakdowns within single period
3. At least 3 report templates available
4. Format comparable to Meta Ads Manager exports

---

### V3-2.5: Profile — Primary Platform & Extended Fields

- **Page**: Profile Page
- **Source**: "Include Primary Platform to categorize responsibilities"

#### Subtask 1: Add extensible profile metadata

- [x] Add `role_metadata` JSONB column to users/profiles table if not present
- [x] Marketing roles: "Primary Platform" dropdown (Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, Other)
- [ ] All roles: "Skills/Tags" multi-select
- [x] Display on profile view; editable by user and admin
- [ ] Searchable from employee directory

**Acceptance Criteria:**
1. Marketing users can set Primary Platform from dropdown
2. All users can add skill tags
3. Fields appear on profile and are editable
4. Admin can filter employees by platform and skills
5. Stored in JSONB — no migration needed for new fields

---

### V3-2.6: Dead Icon Links — Audit & Fix

- **Page**: ALL PAGES
- **Source**: "Icons are clickable but no links given. Make a dummy page."

#### Subtask 1: Audit and fix all dead links

- [ ] Audit every clickable element (icon, button, link) across all pages
- [x] Planned features → show `<ComingSoon>` modal: "This feature is coming soon!"
- [ ] Broken features → fix the link
- [ ] Decorative icons → remove click handler and `cursor: pointer`
- [x] Create `/coming-soon` fallback route

**Acceptance Criteria:**
1. Zero clickable elements lead to broken/blank page
2. Planned features show "Coming Soon" on click
3. Decorative icons are not clickable
4. Navigation audit log produced documenting every link and status

---

## P3 — POLISH & DOCUMENTATION

### V3-3.1: Reports — Fix Viewing Errors & Clarify Report Types

- **Page**: Reports Page
- **Source**: "Constantly encountering error viewing reports"; "Not sure about differences in weekly/monthly/marketing"

#### Subtask 1: Debug report viewing errors

- [ ] Test `GET /api/reports` with different roles and report types
- [ ] Verify RLS on `reports` table allows user to read own reports
- [ ] Add error boundary with contextual message
- [ ] Test with: 0 reports, 1 report, many reports, different periods

**Acceptance Criteria:**
1. Reports load for all user roles
2. Zero reports → empty state with creation instructions
3. Errors are specific ("no permission" vs "not found")

#### Subtask 2: Add report type labels and documentation

- [ ] Add info tooltips explaining: Weekly (task summary), Monthly (aggregated performance), Marketing (campaign + platform metrics)
- [x] Label each report card with type badge
- [x] Add date range and owner to each report card

**Acceptance Criteria:**
1. Each report type has visible label and description
2. Users distinguish types at a glance
3. Help accessible without leaving page

---

### V3-3.2: Navbar Route Audit & Fix

- **Page**: Navigation / All Pages
- **Source**: "Task bar to navigate the website is not working"

#### Subtask 1: Audit and fix all navigation routes

- [ ] Test every navbar link for every user role (admin, manager, associate, marketing)
- [ ] Verify role-based nav hiding (interns cannot see admin links)
- [ ] Fix hardcoded routes referencing non-existent pages
- [ ] Ensure active state highlighting on current page

**Acceptance Criteria:**
1. Every navbar link navigates to correct page for every role
2. No navbar link produces 404 or error
3. Active page highlighted in navigation
4. Role-based visibility correct

---

## V2 CARRY-FORWARD

> These V2 items remain active. V3 takes priority only where items conflict.

- [ ] **V2-0.1** Associate "No Active Record" dead-end → expanded in V3-0.1
- [ ] **V2-0.2** Supabase Auth redirect fix → expanded in V3-0.2, V3-0.3
- [ ] **V2-0.3** Ghost Success button → covered by V3-0.1 error audit
- [ ] **V2-1.x** International phone, EUR, bank dropdown → STILL ACTIVE
- [ ] **V2-2.x** Individual KPI views, Employee Directory, Birthdays → STILL ACTIVE
- [ ] **V2-3.x** Notifications, Announcement analytics, Pending approvals → STILL ACTIVE
- [ ] **V2-4.x** Extensible profiles, Role dashboards, Task categorization → PARTIALLY MERGED into V3-2.5, V3-1.6
- [ ] **V2-5.x** Navbar fixes, Favicon, Guided UX → PARTIALLY MERGED into V3-0.4, V3-3.2
- [ ] **V2-6.x** Report grouping, Knowledge base history, Resource RBAC → STILL ACTIVE
- [ ] **V2-7.1** View-only video streaming → STILL ACTIVE

---

## FEEDBACK TRACEABILITY

| Feedback | V3 ID | Status |
|----------|-------|--------|
| Add achievement section on Hero | V3-1.1 | NEW |
| Move What's New to sticky top banner | V3-1.2 | NEW |
| Add Visit Website button per company | V3-1.3 | NEW |
| Auto-send application confirmation email | V3-1.4 | NEW |
| Fix "Something went wrong" errors | V3-0.1 | NEW (P0) |
| Invoice: hourly rate, currency, auto-calc | V3-1.5 | NEW |
| Add new task button in Task section | V3-1.6 | NEW |
| Task bar nav error (l.variant) | V3-0.1 | NEW (P0) |
| Site shows "unprotected" / cannot open | V3-0.3 | NEW (P0) |
| Tasks page not working | V3-0.1 | NEW (P0) |
| Cannot delete uploaded PDF | V3-1.7 | NEW |
| Dead icon links with no destination | V3-2.6 | NEW |
| Unable to reach site after login | V3-0.3 | NEW (P0) |
| Password reset email not received | V3-0.2 | NEW (P0) |
| UI unclickable after onboarding tour | V3-0.4 | NEW (P0) |
| Dashboard: all white, needs color | V3-2.1 | NEW |
| Task/Performance status color coding | V3-2.2 | NEW |
| Reports: charts not just tables | V3-2.4 | NEW |
| Invoice: status indicators | V3-2.3 | NEW |
| Profile: Primary Platform field | V3-2.5 | NEW |
| Calendar & Leave Request errors | V3-0.5 | NEW (P0) |
| Task input: manual or assigned? | V3-1.6 | NEW |
| Reports: constant errors viewing | V3-3.1 | NEW |
| Report types: weekly vs monthly unclear | V3-3.1 | NEW |
| Invoice: AUD→PHP auto-conversion | V3-1.5 | MERGED |
| Documents: open in new tab | V3-1.7 | NEW |
| Report customization for Meta campaigns | V3-2.4 | NEW |

---

*End of V3 Implementation Plan — AI Execution Document — 2026-03-15*
