# SN Connect — Documentation Hub

> **SN Connect** is an enterprise HR Portal with an AI Agent.  
> "Where Policy Meets Productivity"

This index maps each audience to its documentation entry point.

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
| [user/intern-guide.md](user/intern-guide.md) | Intern-specific features: hours tracking, EOD reports |

### Admins & HR

Start here: **[Admin Guides](admin/README.md)**

| Document | Description |
|----------|-------------|
| [admin/getting-started.md](admin/getting-started.md) | Admin/Super Admin dashboard orientation |
| [admin/employee-management.md](admin/employee-management.md) | Inviting, approving, and managing employees |
| [admin/intern-management.md](admin/intern-management.md) | Overseeing interns and reviewing daily reports |
| [admin/performance-management.md](admin/performance-management.md) | Review cycles, OKRs, KPIs, appraisals |
| [admin/probation.md](admin/probation.md) | Monitoring and evaluating probationary employees |
| [admin/reports.md](admin/reports.md) | Tracking staff submissions and analytics |
| [admin/announcements.md](admin/announcements.md) | Creating, targeting, and publishing announcements |
| [admin/resources.md](admin/resources.md) | Managing company resources and collections |
| [admin/ai-knowledge.md](admin/ai-knowledge.md) | Managing the AI assistant's knowledge base |
| [admin/super-admin.md](admin/super-admin.md) | Task management, payroll approvals, system health |

### Developers

| Document | Description |
|----------|-------------|
| [api/README.md](api/README.md) | API endpoint index (106 handlers across 16 domains) |
| [components/README.md](components/README.md) | UI component index (19 primitives + 80+ composites) |
| [architecture/README.md](architecture/README.md) | System architecture, layers, request flows, design decisions |
| [architecture/auth.md](architecture/auth.md) | Auth provider (PKCE), middleware, role system, RLS |
| [architecture/data-flow.md](architecture/data-flow.md) | TanStack Query patterns, cache, realtime, file uploads |
| [architecture/database.md](architecture/database.md) | Database schema reference (20+ tables, enums, functions) |
| [AGENT-GUIDELINES.md](AGENT-GUIDELINES.md) | Agent coding standards and self-review process |
| [adr/](adr/) | Architecture Decision Records (ADR-001 through ADR-006) |

#### API Domain Docs

| Domain | Endpoints | Doc |
|--------|-----------|-----|
| Auth | 3 | [api/auth.md](api/auth.md) |
| Employees | 5 | [api/employees.md](api/employees.md) |
| Documents | 4 | [api/documents.md](api/documents.md) |
| Departments | 2 | [api/departments.md](api/departments.md) |
| Tasks | 8 | [api/tasks.md](api/tasks.md) |
| Reports | 6 | [api/reports.md](api/reports.md) |
| Invoices | 6 | [api/invoices.md](api/invoices.md) |
| Onboarding | 16 | [api/onboarding.md](api/onboarding.md) |
| Users | 4 | [api/users.md](api/users.md) |
| Announcements | 17 | [api/announcements.md](api/announcements.md) |
| Collections | 8 | [api/collections.md](api/collections.md) |
| Performance | 14 | [api/performance.md](api/performance.md) |
| Probation | 2 | [api/probation.md](api/probation.md) |
| Internships | 9 | [api/internships.md](api/internships.md) |
| Standups | 6 | [api/standups.md](api/standups.md) |
| AI | 7 | [api/ai.md](api/ai.md) |
| Resources | — | [api/resources.md](api/resources.md) |
| Notifications | 4 | [api/notifications.md](api/notifications.md) |

#### Component Docs

| Doc | Coverage |
|-----|----------|
| [components/primitives.md](components/primitives.md) | 19 Radix-based primitives (Button, Input, Dialog, etc.) |
| [components/forms.md](components/forms.md) | Form, FormField, PhoneInput, CurrencySelector |
| [components/tasks.md](components/tasks.md) | TaskCard, TaskList, TaskFilters, TaskDetailView |
| [components/announcements.md](components/announcements.md) | AnnouncementCard, Editor, TargetingSelector |
| [components/reports.md](components/reports.md) | ReportCard, ReportForm, analytics charts |
| [components/performance.md](components/performance.md) | OKRCard, KPICard, PerformanceCharts |
| [components/internship.md](components/internship.md) | InternCard, DailyReportCard, EODReportForm |
| [components/ai-knowledge.md](components/ai-knowledge.md) | ChatInterface, SourcesInventory, UploadZone |
| [components/data-display.md](components/data-display.md) | StatCard, BentoGrid, DataTable |
| [components/feedback.md](components/feedback.md) | SkeletonCard, SkeletonTable, EmptyState |
| [components/resources.md](components/resources.md) | Resource components reference |

#### Package READMEs

| Package | Doc |
|---------|-----|
| `@hr-portal/database` | [packages/database/README.md](../packages/database/README.md) |
| `@hr-portal/ui` | [packages/ui/README.md](../packages/ui/README.md) |
| `@hr-portal/ai` | [packages/ai/README.md](../packages/ai/README.md) |
| `@hr-portal/config` | [packages/config/README.md](../packages/config/README.md) |
| `@hr-portal/auth` | [packages/auth/README.md](../packages/auth/README.md) |

### DevOps

| Document | Description |
|----------|-------------|
| [deployment/VERCEL_DEPLOYMENT.md](deployment/VERCEL_DEPLOYMENT.md) | Full Vercel deployment walkthrough |
| [deployment/VERCEL_QUICK_START.md](deployment/VERCEL_QUICK_START.md) | 3-step deployment cheat sheet |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Environment variable reference |

---

## Existing Guides

These guides in `docs/guides/` provide additional reference:

| Document | Description |
|----------|-------------|
| [guides/quick-start.md](guides/quick-start.md) | Developer quick start |
| [guides/QUICK-START-RBAC.md](guides/QUICK-START-RBAC.md) | RBAC quick start reference |
| [guides/ui-architecture.md](guides/ui-architecture.md) | UI architecture and route map (532 lines) |
| [guides/user-workflows.md](guides/user-workflows.md) | Comprehensive user workflow reference (1180 lines) |
| [guides/user-testing-guide.md](guides/user-testing-guide.md) | QA testing guide with test accounts |

## Project-Level References

| Document | Location | Description |
|----------|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | Root | Master project guide (tech stack, conventions, design system) |
| [CHANGELOG.md](../CHANGELOG.md) | Root | Release history ([Keep a Changelog](https://keepachangelog.com/)) |
| [PENDING_TASKS.md](../PENDING_TASKS.md) | Root | Tracked work items and progress |
| [RBAC-IMPLEMENTATION.md](../RBAC-IMPLEMENTATION.md) | Root | Role-based access control implementation details |
| [supabase/SCHEMA_SUMMARY.md](../supabase/SCHEMA_SUMMARY.md) | Supabase | Schema overview (30+ tables, 3 views, 70+ RLS policies) |
| [supabase/QUICK_REFERENCE.md](../supabase/QUICK_REFERENCE.md) | Supabase | SQL + TypeScript query examples (all domains) |

---

## Documentation Standards

All documentation follows the rules in [AGENT-GUIDELINES.md](AGENT-GUIDELINES.md):

- **Every doc states its audience** in the first line
- **Unimplemented features** are marked: `> **Not yet implemented** — tracked in PENDING_TASKS.md`
- **Docs are updated immediately** when the corresponding code changes (see §2.1 trigger table)
- **ADRs are immutable** once accepted — new decisions supersede the old

*Last updated: 2026-02-28*
