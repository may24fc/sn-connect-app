-- Migration: Realign expense ledger to Request-vs-Payment matching model
-- Created: 2026-07-04
-- Description:
--   Implements the "Control Hub Expense Tracking & Matching System" proposal:
--   1) Staff/interns log spend REQUESTS manually (no receipt required).
--   2) Admins/Accounting/Marketing log direct PAYMENTS (receipt upload, OCR optional).
--   3) Accounting/Admin reconcile requests against payments via a matching queue.
--   Reuses the existing expense_entries ledger (RLS, FX normalization, audit trigger,
--   indexes) instead of introducing parallel tables, to avoid duplicating infrastructure.

BEGIN;

-- 1) Source type discriminator: was this row logged as a staff request or a direct payment?
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_source_type') THEN
    CREATE TYPE public.expense_source_type AS ENUM ('staff_request', 'direct_payment');
  END IF;
END
$$;

-- 2) Matching lifecycle state for the reconciliation queue.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_match_status') THEN
    CREATE TYPE public.expense_match_status AS ENUM (
      'unmatched',
      'matched',
      'variance_flagged',
      'resolved'
    );
  END IF;
END
$$;

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS source_type public.expense_source_type NOT NULL DEFAULT 'direct_payment',
  ADD COLUMN IF NOT EXISTS match_status public.expense_match_status NOT NULL DEFAULT 'unmatched',
  ADD COLUMN IF NOT EXISTS matched_entry_id uuid REFERENCES public.expense_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS matched_variance_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS matched_notes text;

-- Existing rows all originated from the legacy receipt-upload-by-anyone flow; treat
-- them as direct payments so they remain visible in the desk/analytics views.
UPDATE public.expense_entries
SET source_type = 'direct_payment'
WHERE source_type IS NULL;

-- Receipts are now optional: staff requests are logged manually without a document.
ALTER TABLE public.expense_entries
  ALTER COLUMN receipt_document_id DROP NOT NULL;

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_matched_entry_not_self CHECK (matched_entry_id IS NULL OR matched_entry_id <> id);

CREATE INDEX IF NOT EXISTS idx_expense_entries_source_type
  ON public.expense_entries(source_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_match_status
  ON public.expense_entries(match_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_entries_matched_entry_id
  ON public.expense_entries(matched_entry_id)
  WHERE deleted_at IS NULL;

-- 3) Marketing department membership helper, mirroring user_is_accounting_member.
CREATE OR REPLACE FUNCTION public.user_is_marketing_member(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical_department_name text;
  legacy_department text;
BEGIN
  SELECT d.name
  INTO canonical_department_name
  FROM public.users u
  LEFT JOIN public.departments d ON d.id = u.department_id
  WHERE u.id = target_user_id
    AND u.deleted_at IS NULL
  LIMIT 1;

  IF canonical_department_name IS NOT NULL
    AND lower(trim(canonical_department_name)) LIKE '%marketing%'
  THEN
    RETURN true;
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

  RETURN lower(trim(legacy_department)) LIKE '%marketing%';
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_is_marketing_member(uuid) TO authenticated;

-- 4) Staff requests no longer require a receipt document; allow self-insert of
--    'staff_request' rows without a receipt_document_id.
DROP POLICY IF EXISTS expense_entries_insert_own_policy ON public.expense_entries;
CREATE POLICY expense_entries_insert_own_policy ON public.expense_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = expense_entries.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
    AND submitted_by = auth.uid()
    AND (
      (source_type = 'staff_request')
      OR (
        source_type = 'direct_payment'
        AND (
          user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
          OR public.user_is_accounting_member(auth.uid())
          OR public.user_is_marketing_member(auth.uid())
        )
      )
    )
  );

-- 5) Reviewer/matching visibility now includes Marketing (own department payments only
--    via department_id scoping is enforced at the API layer; RLS grants base visibility).
DROP POLICY IF EXISTS expense_entries_select_reviewer_policy ON public.expense_entries;
CREATE POLICY expense_entries_select_reviewer_policy ON public.expense_entries
  FOR SELECT
  TO authenticated
  USING (
    expense_entries.deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      OR public.user_is_accounting_member(auth.uid())
      OR public.user_is_marketing_member(auth.uid())
    )
  );

-- 6) Matching updates (linking request <-> payment) restricted to Accounting/Admin only.
DROP POLICY IF EXISTS expense_entries_update_reviewer_policy ON public.expense_entries;
CREATE POLICY expense_entries_update_reviewer_policy ON public.expense_entries
  FOR UPDATE
  TO authenticated
  USING (
    expense_entries.deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      OR public.user_is_accounting_member(auth.uid())
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR public.user_is_accounting_member(auth.uid())
  );

COMMENT ON COLUMN public.expense_entries.source_type IS 'staff_request = manually logged spend request; direct_payment = admin/accounting/marketing paid + receipt upload';
COMMENT ON COLUMN public.expense_entries.match_status IS 'Reconciliation state between a staff request and its matching direct payment';
COMMENT ON COLUMN public.expense_entries.matched_entry_id IS 'Cross-reference to the counterpart entry (request<->payment) once matched';

COMMIT;
