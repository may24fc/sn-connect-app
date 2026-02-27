# SN Connect — Documentation Hub

> **SN Connect** is an enterprise HR Portal with an AI Agent.  
> "Where Policy Meets Productivity"

This index maps each audience to its documentation entry point.

---

## By Audience

### End Users (Employees & Interns)

| Document | Description |
|----------|-------------|
| [user/getting-started.md](user/getting-started.md) | First login, navigation, and dashboard overview |
| [user/employee-guide.md](user/employee-guide.md) | Full feature guide for regular employees |
| [user/intern-guide.md](user/intern-guide.md) | Intern-specific features: hours tracking, EOD reports |
| [user/faq.md](user/faq.md) | Common questions and answers |

### Admins & HR

| Document | Description |
|----------|-------------|
| [admin/admin-guide.md](admin/admin-guide.md) | HR admin dashboard, employee management |
| [admin/super-admin-guide.md](admin/super-admin-guide.md) | System health, audit logs, payroll approvals |
| [admin/onboarding-management.md](admin/onboarding-management.md) | Invite → onboard → approve workflow |
| [admin/announcements-management.md](admin/announcements-management.md) | Create, target, publish, and analyze announcements |
| [admin/resources-management.md](admin/resources-management.md) | Resource and collection lifecycle |
| [admin/performance-management.md](admin/performance-management.md) | Cycles, evaluations, OKRs, KPIs |
| [admin/reports-management.md](admin/reports-management.md) | Review, approve, and analyze employee reports |
| [admin/ai-knowledge-management.md](admin/ai-knowledge-management.md) | AI knowledge base and chat playground |

### Developers

| Document | Description |
|----------|-------------|
| [api/README.md](api/README.md) | API endpoint index (108 handlers across 16 domains) |
| [components/README.md](components/README.md) | UI component index (19 primitives + 80 composites) |
| [architecture/overview.md](architecture/overview.md) | System architecture and data flow |
| [architecture/realtime.md](architecture/realtime.md) | Supabase Realtime subscription patterns |
| [architecture/testing-strategy.md](architecture/testing-strategy.md) | Vitest + Playwright conventions |
| [architecture/security.md](architecture/security.md) | Zero-trust, RLS, JWT, audit logging |
| [database/schema.md](database/schema.md) | Full schema reference (all tables) |
| [database/rls-policies.md](database/rls-policies.md) | Row Level Security policy inventory |
| [database/helper-functions.md](database/helper-functions.md) | PostgreSQL helper function reference |
| [packages/ui.md](packages/ui.md) | `@hr-portal/ui` package guide |
| [packages/database.md](packages/database.md) | `@hr-portal/database` package guide |
| [packages/config.md](packages/config.md) | `@hr-portal/config` package guide |
| [AGENT-GUIDELINES.md](AGENT-GUIDELINES.md) | Agent coding standards and self-review process |
| [adr/](adr/) | Architecture Decision Records |

### DevOps

| Document | Description |
|----------|-------------|
| [deployment/VERCEL_DEPLOYMENT.md](deployment/VERCEL_DEPLOYMENT.md) | Full Vercel deployment walkthrough |
| [deployment/VERCEL_QUICK_START.md](deployment/VERCEL_QUICK_START.md) | 3-step deployment cheat sheet |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Environment variable reference |

---

## Project-Level References

| Document | Location | Description |
|----------|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | Root | Master project guide (tech stack, conventions, design system) |
| [CHANGELOG.md](../CHANGELOG.md) | Root | Release history ([Keep a Changelog](https://keepachangelog.com/)) |
| [PENDING_TASKS.md](../PENDING_TASKS.md) | Root | Tracked work items and progress |
| [RBAC-IMPLEMENTATION.md](../RBAC-IMPLEMENTATION.md) | Root | Role-based access control implementation details |
| [supabase/SCHEMA_SUMMARY.md](../supabase/SCHEMA_SUMMARY.md) | Supabase | Schema overview and access control matrix |
| [supabase/QUICK_REFERENCE.md](../supabase/QUICK_REFERENCE.md) | Supabase | SQL + TypeScript query examples |

---

## Documentation Standards

All documentation follows the rules in [AGENT-GUIDELINES.md](AGENT-GUIDELINES.md):

- **Every doc states its audience** in the first line
- **Unimplemented features** are marked: `> **Not yet implemented** — tracked in PENDING_TASKS.md`
- **Docs are updated immediately** when the corresponding code changes (see §2.1 trigger table)
- **ADRs are immutable** once accepted — new decisions supersede the old

*Last updated: 2026-02-27*
