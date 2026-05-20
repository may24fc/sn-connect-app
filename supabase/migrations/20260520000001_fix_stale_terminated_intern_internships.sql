-- Migration: Fix stale internship statuses for users who were terminated
-- via the employee management UI (DELETE /api/users/[id]).
--
-- Root cause: that path only set users.status = 'terminated' and
-- employees.date_terminated, but never updated internships.status.
-- The code-level fix is in apps/web/src/app/api/users/[id]/route.ts.
-- This migration corrects existing rows already in production.
--
-- The FK chain:  users.id → employees.user_id → employees.id → internships.employee_id

UPDATE public.internships AS i
SET
  status     = 'terminated',
  updated_at = now()
FROM public.employees AS e
JOIN public.users AS u ON u.id = e.user_id
WHERE i.employee_id = e.id
  AND i.status      = 'active'
  AND u.status      = 'terminated';
