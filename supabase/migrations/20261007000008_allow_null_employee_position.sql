-- Migration: Allow employees without a job title
-- Purpose: employees.position was NOT NULL, so invites, onboarding approval and admin profile setup
--          stored the account role (e.g. "Super Admin", "Associate") as the job title whenever no
--          position was entered. Profiles and directory rows then presented that role label as a
--          real job title. A missing title is now stored as NULL and shown as "Position not set".

BEGIN;

ALTER TABLE public.employees
  ALTER COLUMN position DROP NOT NULL;

-- Clear titles that are exactly the formatted role label the app generated for that same user
-- (role 'super_admin' -> 'Super Admin'). Titles typed by people that differ in any way are kept.
UPDATE public.employees e
SET position = NULL,
    updated_at = now()
FROM public.users u
WHERE u.id = e.user_id
  AND e.position IS NOT NULL
  AND e.position = initcap(replace(u.role::text, '_', ' '));

COMMENT ON COLUMN public.employees.position IS 'Job title. NULL when no title has been set; never filled with the account role.';

COMMIT;
