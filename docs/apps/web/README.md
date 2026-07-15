# apps/web — Documentation Hub

> **Control Hub HR Portal** — Enterprise HR Portal with AI Agent  
> Next.js 15 (App Router) · React 19 · Supabase · TanStack Query

This is the documentation index for the `apps/web` workspace — the main HR portal application.

---

## By Audience

### End Users (Employees & Interns)

Start here: **[User Guides](user/README.md)**

| Document | Description |
|----------|-------------|
| [user/getting-started.md](user/getting-started.md) | First login, onboarding wizard, browser support |
| [user/dashboard.md](user/dashboard.md) | Dashboard overview and stat cards |
| [user/tasks.md](user/tasks.md) | Viewing and managing assigned tasks |
| [user/documents.md](user/documents.md) | Uploading and managing 201 files |
| [user/reports.md](user/reports.md) | Submitting weekly reports (employees) |
| [user/invoices.md](user/invoices.md) | Submitting payroll invoices (employees) |
| [user/performance.md](user/performance.md) | OKRs, KPIs, and self-assessments |
| [user/information-hub.md](user/information-hub.md) | Announcements, resources, and My Growth |
| [user/ai-assistant.md](user/ai-assistant.md) | Using the AI HR chatbot |
| [user/associate-guide.md](user/associate-guide.md) | Associate-specific features: hours tracking, EOD reports |
| [user/notifications.md](user/notifications.md) | In-app notifications |
| [user/profile.md](user/profile.md) | Updating profile, payment details, and avatar |

### Admins & HR

Start here: **[Admin Guides](admin/README.md)**

| Document | Description |
|----------|-------------|
| [admin/getting-started.md](admin/getting-started.md) | Admin/Super Admin dashboard orientation |
| [admin/employee-management.md](admin/employee-management.md) | Inviting, approving, and managing employees |
| [admin/associate-management.md](admin/associate-management.md) | Overseeing interns and reviewing daily reports |
| [admin/performance-management.md](admin/performance-management.md) | Review cycles, OKRs, KPIs, appraisals |
| [admin/probation.md](admin/probation.md) | Monitoring and evaluating probationary employees |
| [admin/reports.md](admin/reports.md) | Tracking staff submissions and analytics |
| [admin/announcements.md](admin/announcements.md) | Creating, targeting, and publishing announcements |
| [admin/resources.md](admin/resources.md) | Managing company resources and collections |
| [admin/ai-knowledge.md](admin/ai-knowledge.md) | Managing the AI assistant's knowledge base |
| [admin/jobs-management.md](admin/jobs-management.md) | Job postings, ATS pipeline, and hiring |
| [admin/recruitment.md](admin/recruitment.md) | Job requisitions and delegated ATS access |
| [admin/tickets.md](admin/tickets.md) | Managing IT/HR support tickets and triage |
| [admin/super-admin.md](admin/super-admin.md) | Task management, payroll approvals, system health |

### Developers

| Document | Description |
|----------|-------------|
| [api/README.md](api/README.md) | API endpoint index (~300 handlers across 40+ domains) |
| [components/README.md](components/README.md) | UI component index |
| [architecture/README.md](architecture/README.md) | System architecture, layers, request flows |
| [architecture/auth.md](architecture/auth.md) | Auth provider (PKCE), middleware, role system, RLS |
| [architecture/data-flow.md](architecture/data-flow.md) | TanStack Query patterns, cache, realtime, file uploads |
| [architecture/database.md](architecture/database.md) | Database schema reference |

---

## Developer Reference

### Route Groups

| Group | Path | Audience |
|-------|------|----------|
| `(auth)` | `/login`, `/forgot-password` | Unauthenticated users |
| `(employee)` | `/dashboard`, `/profile`, `/files`, `/reports`, `/tasks`, `/performance`, `/invoice`, `/calendar`, `/ats` | Employees and interns |
| `(admin)` | `/admin/*` | Admins and HR |
| `(super-admin)` | `/super-admin/*` | Super admins only |

### Key File Locations

| File | Purpose |
|------|---------|
| `apps/web/src/contexts/AuthContext.tsx` | Auth context with session and role |
| `apps/web/src/lib/query-client.ts` | TanStack Query client configuration |
| `apps/web/src/lib/supabase/server.ts` | Server-side Supabase client factory |
| `apps/web/src/lib/supabase/client.ts` | Client-side Supabase client |
| `apps/web/middleware.ts` | Route protection and session refresh |
| `packages/database/src/database.types.ts` | Generated Supabase types |
| `packages/ui/src/primitives/` | Shared UI primitives (Radix-based) |
| `apps/web/tailwind.config.ts` | Titanium & Indigo design tokens |

---

## Audit & Planning

| Document | Description |
|----------|-------------|
| [audit-2026-03-29.md](audit-2026-03-29.md) | Live page audit — immediate fix list |
| [deferred-backlog-2026-03-29.md](deferred-backlog-2026-03-29.md) | Deferred items from March 2026 audit |
| [user-story-gap-plan.md](user-story-gap-plan.md) | Gap analysis for phone validation and multi-currency |
| [ui-enhancement-checklist.md](ui-enhancement-checklist.md) | UI/UX improvement checklist (SlidePanel sizing, accessibility) |
| [ui-fallback-states.md](ui-fallback-states.md) | Fallback/empty state implementation reference |
| [notifications-bidirectional.md](notifications-bidirectional.md) | Bidirectional notification system summary |
| [credentials-onboarding-flow.md](credentials-onboarding-flow.md) | Credential-first onboarding flow design |
