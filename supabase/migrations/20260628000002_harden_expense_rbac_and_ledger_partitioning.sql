-- Migration: Harden expense RBAC and ledger partitioning
-- Created: 2026-06-28
-- Description:
--   1) Adds expense_type enum and department partitioning for expense ledger filtering.
--   2) Adds targeted indexes for server-side filtering performance.
--   3) Tightens reviewer RLS access to accounting staff/interns + admin leadership.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'expense_type'
  ) THEN
    CREATE TYPE public.expense_type AS ENUM (
      'office_supplies',
      'travel',
      'meals',
      'software',
      'equipment',
      'utilities',
      'maintenance',
      'other'
    );
  END IF;
END
$$;

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS expense_type public.expense_type NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

UPDATE public.expense_entries ee
SET department_id = u.department_id
FROM public.employees e
JOIN public.users u ON u.id = e.user_id
WHERE ee.employee_id = e.id
  AND ee.department_id IS NULL
  AND ee.deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_department_id
  ON public.expense_entries(department_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_transaction_date
  ON public.expense_entries(transaction_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_expense_type
  ON public.expense_entries(expense_type)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.user_is_accounting_member(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical_department_name text;
  canonical_department_description text;
  legacy_department text;
BEGIN
  SELECT d.name, d.description
  INTO canonical_department_name, canonical_department_description
  FROM public.users u
  LEFT JOIN public.departments d ON d.id = u.department_id
  WHERE u.id = target_user_id
    AND u.deleted_at IS NULL
  LIMIT 1;

  IF canonical_department_name IS NOT NULL THEN
    IF lower(trim(canonical_department_name)) LIKE '%accounting%' THEN
      RETURN true;
    END IF;

    IF lower(trim(canonical_department_name)) = 'finance'
      AND lower(coalesce(canonical_department_description, '')) LIKE '%accounting%'
    THEN
      RETURN true;
    END IF;
  END IF;

  SELECT e.department
  INTO legacy_department
  FROM public.employees e
  WHERE e.user_id = target_user_id
    AND e.deleted_at IS NULL
  ORDER BY e.updated_at DESC
  LIMIT 1;

  IF legacy_department IS NULL THEN
    RETURN false;
  END IF;

  RETURN lower(trim(legacy_department)) LIKE '%accounting%'
    OR lower(trim(legacy_department)) IN ('finance', 'accounting intern');
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_is_accounting_member(uuid) TO authenticated;

DROP POLICY IF EXISTS expense_entries_select_reviewer_policy ON public.expense_entries;
CREATE POLICY expense_entries_select_reviewer_policy ON public.expense_entries
  FOR SELECT
  TO authenticated
  USING (
    expense_entries.deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      OR (
        user_has_any_role(auth.uid(), ARRAY['intern', 'employee']::user_role[])
        AND public.user_is_accounting_member(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS expense_entries_update_reviewer_policy ON public.expense_entries;
CREATE POLICY expense_entries_update_reviewer_policy ON public.expense_entries
  FOR UPDATE
  TO authenticated
  USING (
    expense_entries.deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      OR (
        user_has_any_role(auth.uid(), ARRAY['intern', 'employee']::user_role[])
        AND public.user_is_accounting_member(auth.uid())
      )
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR (
      user_has_any_role(auth.uid(), ARRAY['intern', 'employee']::user_role[])
      AND public.user_is_accounting_member(auth.uid())
    )
  );

COMMENT ON COLUMN public.expense_entries.department_id IS 'Denormalized department partition key for rapid filtering and reporting.';
COMMENT ON COLUMN public.expense_entries.expense_type IS 'Required expense classification for ledger allocation and analytics.';

COMMIT;