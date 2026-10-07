-- Complete Finance changes added after the local foundation migration was first applied.
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

ALTER TABLE public.marketing_entries ADD COLUMN IF NOT EXISTS import_source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS marketing_billing_csv_unique
  ON public.marketing_entries(platform_id, transaction_id)
  WHERE import_source = 'billing_csv' AND transaction_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.finance_overview(target_month date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH bounds AS (
  SELECT date_trunc('month', target_month)::date AS start_date,
         (date_trunc('month', target_month) + interval '1 month')::date AS end_date
), spend AS (
  SELECT e.category_code, sum(e.total_amount_aud) AS amount_aud,
         count(*) FILTER (WHERE e.total_amount_aud IS NULL) AS unconverted
  FROM public.expense_entries e, bounds b
  WHERE e.deleted_at IS NULL AND e.source_type = 'direct_payment'
    AND e.transaction_date >= b.start_date AND e.transaction_date < b.end_date
  GROUP BY e.category_code
), budget_rows AS (
  SELECT c.code, c.name, coalesce(s.amount_aud,0) AS spent_aud, b.amount_aud AS budget_aud
  FROM public.finance_categories c
  LEFT JOIN spend s ON s.category_code = c.code
  LEFT JOIN public.finance_budgets b ON b.category_code = c.code AND b.month = (SELECT start_date FROM bounds)
  ORDER BY c.sort_order
)
SELECT jsonb_build_object(
  'month', (SELECT start_date FROM bounds),
  'recordedSpendAud', coalesce((SELECT sum(amount_aud) FROM spend),0),
  'unconvertedEntries', coalesce((SELECT sum(unconverted) FROM spend),0),
  'categoryBudgets', coalesce((SELECT jsonb_agg(to_jsonb(budget_rows)) FROM budget_rows),'[]'::jsonb),
  'openMatches', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND source_type = 'staff_request' AND match_status = 'unmatched'),
  'openVariances', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND match_status = 'variance_flagged'),
  'pendingApprovals', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND approval_state = 'pending'),
  'submittedInvoices', (SELECT count(*) FROM public.invoices WHERE deleted_at IS NULL AND status = 'submitted'),
  'subscriptionRunRateAud', coalesce((SELECT sum(monthly_amount_aud) FROM public.finance_subscriptions WHERE active),0)
);
$$;
REVOKE ALL ON FUNCTION public.finance_overview(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_overview(date) TO service_role;

CREATE OR REPLACE FUNCTION public.create_finance_report_snapshot(
  target_month date, actor_id uuid, payload jsonb, make_final boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  month_start date := date_trunc('month', target_month)::date;
  month_end date := (date_trunc('month', target_month) + interval '1 month')::date;
  unresolved integer;
  new_id uuid;
BEGIN
  SELECT count(*) INTO unresolved FROM public.expense_entries e
  WHERE e.deleted_at IS NULL AND e.transaction_date >= month_start AND e.transaction_date < month_end
    AND (e.match_status = 'variance_flagged'
      OR (e.source_type = 'staff_request' AND e.match_status = 'unmatched')
      OR e.approval_state = 'pending');
  unresolved := unresolved + (
    SELECT count(*) FROM public.finance_variance_signoffs s
    JOIN public.expense_entries e ON e.id = s.expense_id
    WHERE s.decision = 'pending' AND e.transaction_date >= month_start AND e.transaction_date < month_end
  );
  IF make_final AND unresolved > 0 THEN
    RAISE EXCEPTION 'Resolve or approve all month-end exceptions before finalizing';
  END IF;
  INSERT INTO public.finance_report_snapshots(report_month, status, report_data, exception_count, created_by, finalized_at)
  VALUES(month_start, CASE WHEN make_final THEN 'final' ELSE 'draft' END, payload, unresolved, actor_id,
    CASE WHEN make_final THEN now() ELSE NULL END) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.create_finance_report_snapshot(date, uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_finance_report_snapshot(date, uuid, jsonb, boolean) TO service_role;

COMMIT;

