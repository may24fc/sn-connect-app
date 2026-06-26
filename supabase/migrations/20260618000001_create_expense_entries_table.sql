-- Migration: Create Expense Entries table for Custom Intelligent Expense System
-- Created: 2026-06-18
-- Description: Adds staff receipt ingestion, AI draft extraction, intern verification,
-- and exception routing buckets (standard/yellow/red) without introducing full ERP scope.

BEGIN;

CREATE TABLE public.expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership and receipt linkage
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  receipt_document_id uuid NOT NULL REFERENCES public.documents(id),

  -- Raw extracted receipt payload
  vendor_name text NOT NULL,
  transaction_date date NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',

  -- AI-drafted preliminary accounting mapping
  ai_debit_account text,
  ai_credit_account text,
  ai_confidence numeric(5,4) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),

  -- Intern-verified double-entry mapping
  verified_debit_account text,
  verified_credit_account text,
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,

  -- Risk routing and leadership flow
  risk_bucket text NOT NULL DEFAULT 'pending' CHECK (
    risk_bucket IN ('pending', 'standard_recurring', 'price_spike', 'non_recurring')
  ),
  processing_status text NOT NULL DEFAULT 'draft_extracted' CHECK (
    processing_status IN (
      'draft_extracted',
      'awaiting_intern_review',
      'verified',
      'auto_approved',
      'leadership_review_required',
      'approved',
      'rejected'
    )
  ),
  business_justification text,
  leadership_decision_by uuid REFERENCES auth.users(id),
  leadership_decision_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX idx_expense_entries_employee_id
  ON public.expense_entries(employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expense_entries_receipt_document_id
  ON public.expense_entries(receipt_document_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expense_entries_processing_status
  ON public.expense_entries(processing_status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expense_entries_risk_bucket
  ON public.expense_entries(risk_bucket)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expense_entries_vendor_tx_date
  ON public.expense_entries(vendor_name, transaction_date)
  WHERE deleted_at IS NULL;

ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries FORCE ROW LEVEL SECURITY;

-- Employees and interns can create expense entries for themselves.
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
  );

-- Employees and interns can view their own submissions.
CREATE POLICY expense_entries_select_own_policy ON public.expense_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = expense_entries.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
    AND expense_entries.deleted_at IS NULL
  );

-- Intern reviewer and leadership roles can access queue items.
CREATE POLICY expense_entries_select_reviewer_policy ON public.expense_entries
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['intern', 'admin', 'super_admin']::user_role[])
    AND expense_entries.deleted_at IS NULL
  );

-- Intern reviewer verifies entries and updates accounting fields.
CREATE POLICY expense_entries_update_reviewer_policy ON public.expense_entries
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['intern', 'admin', 'super_admin']::user_role[])
    AND expense_entries.deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['intern', 'admin', 'super_admin']::user_role[])
  );

-- Leadership can make final decision for exception items.
CREATE POLICY expense_entries_update_leadership_policy ON public.expense_entries
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND expense_entries.deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE TRIGGER trigger_expense_entries_updated_at
  BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_expense_entries_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.expense_entries IS 'Receipt-driven expense entries with AI draft and intern verification workflow';
COMMENT ON COLUMN public.expense_entries.risk_bucket IS 'Routing result: standard recurring, price spike, or non-recurring';
COMMENT ON COLUMN public.expense_entries.processing_status IS 'Workflow state from extraction to leadership decision';

COMMIT;
