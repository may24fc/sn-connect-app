# Admin Guides

Documentation for HR Administrators and Super Administrators managing the Control Hub HR Portal.

## Quick Links

| Guide | Description | Roles |
|-------|-------------|-------|
| [Getting Started](getting-started.md) | Admin overview and navigation | Admin, Super Admin |
| [Employee Management](employee-management.md) | Inviting, approving, and managing employees | Admin, Super Admin |
| [Associate Management](associate-management.md) | Overseeing associates, reviewing daily reports | Admin, Super Admin |
| [Jobs Management](jobs-management.md) | Job postings and application tracking | Admin, Super Admin |
| [Performance Management](performance-management.md) | Review cycles, OKRs, KPIs, appraisals | Admin, Super Admin |
| [Probation Tracking](probation.md) | Monitoring and evaluating probationary employees | Admin, Super Admin |
| [Reports Analytics](reports.md) | Tracking staff report submissions and analytics | Admin, Super Admin |
| [Announcements](announcements.md) | Creating and managing company announcements | Admin, Super Admin |
| [Resources](resources.md) | Managing company resources and collections | Admin, Super Admin |
| [AI Knowledge Base](ai-knowledge.md) | Managing the AI assistant's knowledge sources | Admin, Super Admin |
| [Tickets](tickets.md) | Managing IT/HR support tickets and triage | Admin, Super Admin |
| [Checklists](checklists.md) | Onboarding/offboarding checklist templates | Admin, Super Admin |
| [Company Pulse](company-pulse.md) | Company activity feed and health metrics | Admin, Super Admin |
| [Recruitment](recruitment.md) | Job requisitions and candidate pipeline | Admin, Super Admin |
| [CRM](crm.md) | Lead and inquiry pipeline management | Admin, Super Admin |
| [Expenses](expenses.md) | Executive expense desk and analytics | Admin, Super Admin |
| [Invoices](invoices.md) | Invoice submission matrix and assisted create flow | Admin, Super Admin |
| [Projects and War Room](projects.md) | Project oversight, war-room view, and project pool | Admin, Super Admin |
| [Settings](settings.md) | Notification preferences and channel linking | Admin, Super Admin |
| [Super Admin Features](super-admin.md) | Task management, payroll approvals, activity log, system health | Super Admin only |

## Role Differences

| Capability | Admin | Super Admin |
|------------|-------|-------------|
| Employee management | ✅ | ✅ |
| Employee directory | ✅ | ✅ |
| Associate management | ✅ | ✅ |
| Jobs & applications | ✅ | ✅ |
| Performance cycles | ✅ | ✅ |
| Probation tracking | ✅ | ✅ |
| Report analytics | ✅ | ✅ |
| Announcements | ✅ | ✅ |
| Resources | ✅ | ✅ |
| AI Knowledge Base | ✅ | ✅ |
| Tickets & triage | ✅ | ✅ |
| Checklist templates | ✅ | ✅ |
| Company Pulse | ✅ | ✅ |
| Recruitment | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Task management | ❌ | ✅ |
| Payroll approvals | ❌ | ✅ |
| System health | ❌ | ✅ |
| Activity log (role-scoped) | ✅ | ✅ |
| Automated system activity | ❌ | ✅ |

## Navigation

Admin and Super Admin each have their own sidebar layout:

**Admin sidebar (14 items):** Dashboard, Directory, Employee Management, Associate Management, Checklists, Performance, Marketing Reports, Recruitment, Jobs, Company Pulse, Announcements, AI Knowledge, Resources, Tickets

**Super Admin sidebar (13 items):** Dashboard, Directory, Employee Management, Associate Management, Checklists, Performance, Marketing Reports, Task Management, Payroll Approvals, Company Pulse, Announcements, AI Knowledge, Resources

> **Note:** Some features like Probation, Notifications, and Activity Log are accessible via direct URL but are not sidebar navigation items.

## Route Coverage Audit (2026-07-21)

This matrix compares actual Next.js pages under `apps/web/src/app/(admin)` against explicit route coverage in this docs folder.

### Current-State Snapshot

| Scope | Total Routes | Routes With Explicit Docs | Routes Missing Explicit Docs |
|-------|--------------|---------------------------|------------------------------|
| Admin (`/admin/*`) | 57 | 57 | 0 |
| Super Admin (`/super-admin/*`) | 27 | 27 | 0 |
| **Total** | **84** | **84** | **0** |

### Coverage Notes

- Route coverage includes dedicated pages, role-prefixed aliases, and redirect/re-export entry routes.
- This section is maintained as a current-state snapshot (not baseline vs delta).
- Re-run route coverage checks after navigation or route-structure changes.

### Prioritized Follow-Up

1. Re-run the route-audit script after each major navigation change and update this section as needed.
2. Keep redirect/re-export route notes synchronized with implementation changes in App Router.
3. Add deep behavioral docs per page as features evolve (beyond route coverage).

---

See also: [User Guides](../user/README.md) · [Developer Docs](../README.md)
