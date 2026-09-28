# Work Tracker

The Work Tracker (`/work-tracker`) combines project and task visibility without blending their progress models.

## My Work

- View projects where you are the lead or a contributor.
- View tasks assigned to you, including standalone tasks and tasks linked to projects.
- Filter the list by projects or tasks.
- Update task status directly. Status changes appear immediately and roll back if saving fails.
- Open the existing project or task detail page for milestones, checklists, comments, and proof.

Project progress continues to come from milestone checklist completion. Linked task completion does not also increase project progress.

## Team Visibility

Admins and super-admins can view every active employee and associate, including staff with no current assignments. Each row keeps the following signals separate:

- Active projects and average project progress
- Open tasks and task completion rate
- Overdue and blocked work
- Last Control Hub activity, active days, and session count

Control Hub activity measures authenticated use, not productivity. The tracker does not collect visited routes, page content, IP addresses, or user-agent strings.

## Task and Project Links

Tasks may optionally be linked to a project. Standalone personal and ad hoc tasks remain supported. A linked milestone must belong to the selected project.

## Access

- Employees and associates see only their own work.
- Admins receive organization-wide read-only visibility.
- Super-admins can assign and manage tasks for active employees and associates.

Usage summaries are available for the last 7, 30, or 90 days. Daily aggregates are retained for 12 months using the `Asia/Manila` business date.
