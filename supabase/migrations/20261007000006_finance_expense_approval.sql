-- Keep ordinary expense approval separate from reconciliation and payment status.
BEGIN;

CREATE OR REPLACE FUNCTION public.decide_finance_expense(
  entry_id uuid, actor_id uuid, outcome text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  entry_row public.expense_entries%ROWTYPE;
  counterpart public.expense_entries%ROWTYPE;
BEGIN
  IF outcome NOT IN ('approved', 'rejected') THEN RETURN false; END IF;
  SELECT * INTO entry_row FROM public.expense_entries WHERE id = entry_id AND deleted_at IS NULL FOR UPDATE;
  IF entry_row.id IS NULL OR entry_row.approval_state <> 'pending'
     OR entry_row.match_status IN ('variance_flagged', 'resolved')
     OR entry_row.submitted_by = actor_id THEN RETURN false; END IF;
  IF entry_row.matched_entry_id IS NOT NULL THEN
    SELECT * INTO counterpart FROM public.expense_entries
    WHERE id = entry_row.matched_entry_id AND deleted_at IS NULL FOR UPDATE;
    IF counterpart.id IS NULL OR counterpart.match_status <> 'matched'
       OR counterpart.approval_state <> 'pending' OR counterpart.submitted_by = actor_id THEN RETURN false; END IF;
  END IF;
  UPDATE public.expense_entries SET approval_state = outcome,
    processing_status = outcome
  WHERE id = entry_row.id OR id = counterpart.id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.decide_finance_expense(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_finance_expense(uuid, uuid, text) TO service_role;

COMMIT;
