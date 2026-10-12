# Tickets Navigation Optimization

## Relevant Code Map

- [Sidebar navigation](../../../packages/ui/src/layout/Sidebar.tsx): role-specific ticket destinations and Knowledge & Support grouping.
- [Super-admin Tickets page](../../../apps/web/src/app/(app)/(admin)/super-admin/tickets/page.tsx): dedicated intake route.
- [Super-admin ticket panel](../../../apps/web/src/components/tickets/SuperAdminTicketsPanel.tsx): triage and dispatch workspace shared with the legacy tab.
- [Admin Tickets page](../../../apps/web/src/app/(app)/(admin)/admin/tickets/page.tsx): assigned HR ticket workspace.
- [Ticket creation API](../../../apps/web/src/app/api/tickets/route.ts): notification destination for new intake items.
- [Sidebar tests](../../../packages/ui/src/layout/Sidebar.test.tsx): role visibility and active-route behavior.

## Visual Guide

```mermaid
flowchart LR
    A[Admin sidebar] --> B[/admin/tickets]
    B --> C[Assigned HR tickets]
    D[Super-admin sidebar] --> E[/super-admin/tickets]
    E --> F[All-ticket intake and dispatch]
    G[New-ticket notification] --> E
```

## Entries

### 2026-10-12: Discoverable role-specific ticket navigation — Implemented

- Problem/evidence: Admin had a visible `/admin/tickets` item, but `superAdminNavItems` had no Tickets entry. Super-admin intake existed only as `?tab=tickets` inside Task Management, so the support workflow was easy to miss and Work Tracker appeared active instead.
- Delivered solution: Added `/super-admin/tickets`, reused the established intake panel with an `h1` page heading, placed Tickets in the super-admin Knowledge & Support sidebar section, and changed new-ticket notifications to the dedicated route. The admin destination remains `/admin/tickets` because it intentionally exposes only assigned HR tickets.
- Relevant paths: sidebar, dedicated page, shared intake panel, ticket API, and tests linked above.
- Validation: focused Sidebar suite passed 13/13 and `pnpm build` passed across the monorepo. The Next.js route manifest contains `/super-admin/tickets`; no data contract or mutation behavior changed.

## Measurements

- No latency, request-count, or query behavior changed. This is a navigation-only improvement, so latency measurement was not applicable and no performance claim is made.

## Change Log

- 2026-10-12: Added dedicated super-admin Tickets navigation and updated notification routing. No production deployment.
