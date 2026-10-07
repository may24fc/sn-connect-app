-- Qualify the signoff key, which also names an RPC argument.
BEGIN;
CREATE OR REPLACE FUNCTION public.decide_finance_variance(
  expense_id uuid, actor_id uuid, outcome text, decision_note text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  expense_row public.expense_entries%ROWTYPE;
  signoff public.finance_variance_signoffs%ROWTYPE;
  ceo_id uuid;
  coo_id uuid;
  needs_leadership boolean;
BEGIN
  SELECT * INTO expense_row FROM public.expense_entries WHERE id = expense_id AND deleted_at IS NULL FOR UPDATE;
  IF expense_row.id IS NULL OR expense_row.match_status <> 'variance_flagged' OR outcome NOT IN ('approved','rejected') THEN RETURN false; END IF;
  IF expense_row.source_type = 'direct_payment' THEN
    SELECT * INTO expense_row FROM public.expense_entries WHERE id = expense_row.matched_entry_id AND deleted_at IS NULL FOR UPDATE;
  END IF;
  SELECT * INTO signoff FROM public.finance_variance_signoffs s WHERE s.expense_id = expense_row.id FOR UPDATE;
  IF signoff.expense_id IS NULL OR signoff.decision <> 'pending' OR expense_row.submitted_by = actor_id THEN RETURN false; END IF;
  needs_leadership := abs(coalesce(expense_row.matched_variance_amount,0)) > 100
    OR abs(coalesce(expense_row.matched_variance_amount,0)) /
      greatest(coalesce(expense_row.total_amount_aud, CASE WHEN expense_row.currency = 'AUD' THEN expense_row.total_amount ELSE NULL END), 0.01) > 0.10;
  IF needs_leadership AND (signoff.required_approver IS NULL OR signoff.required_approver <> actor_id) THEN RETURN false; END IF;
  UPDATE public.finance_variance_signoffs s SET decision = outcome, decided_by = actor_id, decided_at = now()
  WHERE s.expense_id = expense_row.id;
  UPDATE public.expense_entries SET match_status = 'resolved', approval_state = outcome,
    processing_status = outcome, matched_notes = concat_ws(E'\n', matched_notes, nullif(trim(decision_note),''))
  WHERE id IN (expense_row.id, expense_row.matched_entry_id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.decide_finance_variance(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_finance_variance(uuid, uuid, text, text) TO service_role;

COMMIT;
