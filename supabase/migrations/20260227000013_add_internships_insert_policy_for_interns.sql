-- Migration: 20260227000013_add_internships_insert_policy_for_interns.sql
-- Description: Add INSERT policy allowing interns to self-initialize their internship record.
--   The existing RLS policies only grant SELECT to interns and ALL to admin roles,
--   so associate self-initialization via POST /api/internships/initialize was blocked
--   with error 42501 (row-level security policy violation).
-- Dependencies: 20260216000020_repair_internship_tables.sql

-- 1. Drop if exists (idempotent)
DROP POLICY IF EXISTS internships_insert_self_policy ON public.internships;

-- 2. Allow interns to INSERT their own internship record
--    Constraint: the employee_id must belong to the authenticated user
CREATE POLICY internships_insert_self_policy ON public.internships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = internships.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
    AND user_has_role(auth.uid(), 'associate')
  );

-- 3. Also add UPDATE policy so interns can update their own internship
--    (needed for future edits to hours, status, etc.)
DROP POLICY IF EXISTS internships_update_self_policy ON public.internships;

CREATE POLICY internships_update_self_policy ON public.internships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = internships.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
    AND user_has_role(auth.uid(), 'associate')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = internships.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
    AND user_has_role(auth.uid(), 'associate')
  );

-- Validation (uncomment to verify):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'internships';
