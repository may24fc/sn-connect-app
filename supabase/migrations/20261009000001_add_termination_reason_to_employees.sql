-- Termination comment: why a staff member or associate left (e.g. Resigned, Terminated, AWOL).
--
-- Free text entered by admins / super admins on the Former Employees tab. Deliberately NOT
-- added to the employee_directory view: it is HR-sensitive, so it is read only through the
-- admin-gated directory routes. Cleared when the person is restored to active and when the
-- account is permanently purged.

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS termination_reason text;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_termination_reason_length;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_termination_reason_length
  CHECK (termination_reason IS NULL OR char_length(termination_reason) BETWEEN 1 AND 500);

COMMENT ON COLUMN public.employees.termination_reason IS
  'Admin-entered comment explaining the termination (resigned, terminated, AWOL, ...). Max 500 chars. Not exposed in employee_directory.';

COMMIT;
