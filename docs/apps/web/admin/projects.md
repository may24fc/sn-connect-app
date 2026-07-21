# Projects and War Room

This guide covers project oversight routes for admins and super admins.

## Route Map

### Admin Routes

- `/admin/war-room` — Primary project oversight dashboard
- `/admin/war-room/pool` — Project pool and backlog workspace
- `/admin/projects` — Route alias/re-export to war-room view
- `/admin/projects/[id]` — Project detail route (reused project detail view)
- `/admin/projects/pool` — Route alias/re-export to war-room pool view

### Super Admin Notes

- Super admins can access the same admin project routes based on role permissions.

## War Room (`/admin/war-room`)

The War Room provides two perspectives:

- **My Projects** — Personal/owned project list
- **All Projects** — Organization-wide project status and health view

Typical widgets include:

- Project health and risk indicators
- Points/streak or contribution signals
- Departmental and per-person project views
- Quick navigation to project pool and project detail

## Project Pool (`/admin/war-room/pool`)

The project pool handles backlog ideas and claimable work items.

Core actions:

- Review claimable backlog items
- Edit backlog details
- Archive/restore items (role-permission gated)
- Manage priority and target departments

## Detail Route (`/admin/projects/[id]`)

Project detail route is available for deep inspection of milestones, progress, and contributors.

## Related Docs

- [Performance Management](performance-management.md)
- [Super Admin Features](super-admin.md)
- [API: Projects](../api/projects.md)
