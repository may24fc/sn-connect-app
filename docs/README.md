# Control Hub — Documentation Hub

> **Control Hub** is an enterprise HR Portal with an AI Agent.  
> "Where Policy Meets Productivity"

This hub maps each application and audience to its documentation entry point.

---

## Applications

| App | Description | Docs |
|-----|-------------|------|
| `apps/web` | HR Portal — employee & admin portal | [apps/web/README.md](apps/web/README.md) |
| `apps/www` | Corporate public website | [apps/www/README.md](apps/www/README.md) |

---

## apps/web — HR Portal

### End Users (Employees & Interns)

→ **[apps/web/user/README.md](apps/web/user/README.md)**

| Document | Description |
|----------|-------------|
| [apps/web/user/getting-started.md](apps/web/user/getting-started.md) | First login, onboarding wizard, browser support |
| [apps/web/user/dashboard.md](apps/web/user/dashboard.md) | Dashboard overview and stat cards |
| [apps/web/user/tasks.md](apps/web/user/tasks.md) | Viewing and managing assigned tasks |
| [apps/web/user/documents.md](apps/web/user/documents.md) | Uploading and managing 201 files |
| [apps/web/user/reports.md](apps/web/user/reports.md) | Submitting weekly reports (employees) |
| [apps/web/user/invoices.md](apps/web/user/invoices.md) | Submitting payroll invoices (employees) |
| [apps/web/user/performance.md](apps/web/user/performance.md) | OKRs, KPIs, and self-assessments |
| [apps/web/user/information-hub.md](apps/web/user/information-hub.md) | Announcements, resources, and My Growth |
| [apps/web/user/ai-assistant.md](apps/web/user/ai-assistant.md) | Using the AI HR chatbot |
| [apps/web/user/intern-guide.md](apps/web/user/intern-guide.md) | Intern-specific features: hours tracking, EOD reports |
| [apps/web/user/notifications.md](apps/web/user/notifications.md) | In-app notifications |
| [apps/web/user/profile.md](apps/web/user/profile.md) | Profile, payment details, and avatar |

### Admins & HR

→ **[apps/web/admin/README.md](apps/web/admin/README.md)**

| Document | Description |
|----------|-------------|
| [apps/web/admin/getting-started.md](apps/web/admin/getting-started.md) | Admin/Super Admin dashboard orientation |
| [apps/web/admin/employee-management.md](apps/web/admin/employee-management.md) | Inviting, approving, and managing employees |
| [apps/web/admin/intern-management.md](apps/web/admin/intern-management.md) | Overseeing interns and reviewing daily reports |
| [apps/web/admin/performance-management.md](apps/web/admin/performance-management.md) | Review cycles, OKRs, KPIs, appraisals |
| [apps/web/admin/probation.md](apps/web/admin/probation.md) | Monitoring and evaluating probationary employees |
| [apps/web/admin/reports.md](apps/web/admin/reports.md) | Tracking staff submissions and analytics |
| [apps/web/admin/announcements.md](apps/web/admin/announcements.md) | Creating, targeting, and publishing announcements |
| [apps/web/admin/resources.md](apps/web/admin/resources.md) | Managing company resources and collections |
| [apps/web/admin/ai-knowledge.md](apps/web/admin/ai-knowledge.md) | Managing the AI assistant's knowledge base |
| [apps/web/admin/jobs-management.md](apps/web/admin/jobs-management.md) | Job postings, ATS pipeline, and hiring |
| [apps/web/admin/recruitment.md](apps/web/admin/recruitment.md) | Job requisitions and delegated ATS access |
| [apps/web/admin/tickets.md](apps/web/admin/tickets.md) | Managing IT/HR support tickets and triage |
| [apps/web/admin/super-admin.md](apps/web/admin/super-admin.md) | Task management, payroll approvals, system health |

### Developers

| Document | Description |
|----------|-------------|
| [apps/web/api/README.md](apps/web/api/README.md) | API endpoint index (~300 handlers across 40+ domains) |
| [apps/web/components/README.md](apps/web/components/README.md) | UI component index |
| [apps/web/architecture/README.md](apps/web/architecture/README.md) | System architecture, layers, request flows |
| [apps/web/architecture/auth.md](apps/web/architecture/auth.md) | Auth provider (PKCE), middleware, role system, RLS |
| [apps/web/architecture/data-flow.md](apps/web/architecture/data-flow.md) | TanStack Query patterns, cache, realtime |
| [apps/web/architecture/database.md](apps/web/architecture/database.md) | Database schema reference |
| [AGENT-GUIDELINES.md](AGENT-GUIDELINES.md) | Agent coding standards and self-review process |
| [adr/](adr/) | Architecture Decision Records (ADR-001 through ADR-006) |

#### Package READMEs

| Package | Doc |
|---------|-----|
| `@hr-portal/database` | [packages/database/README.md](../packages/database/README.md) |
| `@hr-portal/ui` | [packages/ui/README.md](../packages/ui/README.md) |
| `@hr-portal/ai` | [packages/ai/README.md](../packages/ai/README.md) |
| `@hr-portal/config` | [packages/config/README.md](../packages/config/README.md) |
| `@hr-portal/auth` | [packages/auth/README.md](../packages/auth/README.md) |

---

## apps/www — Corporate Website

→ **[apps/www/README.md](apps/www/README.md)**

| Document | Description |
|----------|-------------|
| [apps/www/hidden-sections-2026-03-30.md](apps/www/hidden-sections-2026-03-30.md) | Feature-flagged hidden routes and restore checklist |
| [apps/www/priority-handoff.csv](apps/www/priority-handoff.csv) | Content handoff priority matrix |
| [apps/www/real-data-checklist.csv](apps/www/real-data-checklist.csv) | Mock-to-real-data replacement checklist |
| [apps/www/ui-enhancement-checklist.md](apps/www/ui-enhancement-checklist.md) | UI/UX audit and improvement checklist |
| [apps/www/testing-guide.md](apps/www/testing-guide.md) | Playwright testing guide |

---

## DevOps & Infrastructure

| Document | Description |
|----------|-------------|
| [deployment/VERCEL_DEPLOYMENT.md](deployment/VERCEL_DEPLOYMENT.md) | Full Vercel deployment walkthrough |
| [deployment/VERCEL_QUICK_START.md](deployment/VERCEL_QUICK_START.md) | 3-step deployment cheat sheet |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Environment variable reference |

---

## Developer Guides

| Document | Description |
|----------|-------------|
| [guides/quick-start.md](guides/quick-start.md) | Developer quick start |
| [guides/QUICK-START-RBAC.md](guides/QUICK-START-RBAC.md) | RBAC quick start reference |
| [guides/ui-architecture.md](guides/ui-architecture.md) | UI architecture and route map |
| [guides/user-workflows.md](guides/user-workflows.md) | Comprehensive user workflow reference |
| [guides/user-testing-guide.md](guides/user-testing-guide.md) | QA testing guide with test accounts |

---

## Project-Level References

| Document | Location | Description |
|----------|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | Root | Master project guide (tech stack, conventions, design system) |
| [CHANGELOG.md](../CHANGELOG.md) | Root | Release history |
| [PENDING_TASKS.md](../PENDING_TASKS.md) | Root | Tracked work items and progress |
| [RBAC-IMPLEMENTATION.md](../RBAC-IMPLEMENTATION.md) | Root | Role-based access control implementation details |
| [supabase/SCHEMA_SUMMARY.md](../supabase/SCHEMA_SUMMARY.md) | Supabase | Schema overview (30+ tables, 3 views, 70+ RLS policies) |
| [supabase/QUICK_REFERENCE.md](../supabase/QUICK_REFERENCE.md) | Supabase | SQL + TypeScript query examples (all domains) |

---

## Documentation Standards

All documentation follows the rules in [AGENT-GUIDELINES.md](AGENT-GUIDELINES.md):

- **Every doc states its audience** in the first line
- **Unimplemented features** are marked: `> **Not yet implemented** — tracked in PENDING_TASKS.md`
- **Docs are updated immediately** when the corresponding code changes
- **ADRs are immutable** once accepted — new decisions supersede the old

*Last updated: 2026-05-04*
