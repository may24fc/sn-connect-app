# Tickets Task Tracker

## Current Status

Admin and super-admin ticket work now has explicit sidebar navigation. Admin HR handlers use `/admin/tickets`; super-admin intake and dispatch uses the dedicated `/super-admin/tickets` route. The older Task Management tickets tab remains available for bookmarked links, but it is no longer the only discoverable entry point. See [optimization.md](optimization.md).

## Tasks

### Done

- [x] Add dedicated super-admin ticket navigation - 2026-10-12; changed `packages/ui/src/layout/Sidebar.tsx`, `apps/web/src/app/(app)/(admin)/super-admin/tickets/page.tsx`, `apps/web/src/components/tickets/SuperAdminTicketsPanel.tsx`, and `packages/ui/src/layout/Sidebar.test.tsx`; validation: 13 Sidebar tests passed and the full monorepo production build compiled `/super-admin/tickets` successfully.
- [x] Point new-ticket notifications to the dedicated intake page - 2026-10-12; changed `apps/web/src/app/api/tickets/route.ts`; validation: static route inspection and web type checking.

### In Progress

None.

### Deferred

- [ ] Remove the legacy Tickets tab from super-admin Task Management - retained for backward compatibility with `/super-admin/tasks?tab=tickets`; reconsider after existing bookmarks and notifications have aged out.

### Skipped

None.

### Blocked

None.

## Session History

- 2026-10-12: Found that admin already had a Tickets sidebar entry, while super-admin could reach intake only through a tab under Task Management. Added a dedicated super-admin route and sidebar entry, kept the legacy tab compatible, and updated notification links. Validation passed with 13 focused Sidebar tests and `pnpm build`; the generated route manifest includes `/super-admin/tickets`. The migration gate found no migration changes, so no database environment was touched.
