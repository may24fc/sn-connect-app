BEGIN;

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
), source_spend AS (
  SELECT e.payment_source, sum(e.total_amount_aud) AS amount_aud
  FROM public.expense_entries e, bounds b
  WHERE e.deleted_at IS NULL AND e.source_type = 'direct_payment'
    AND e.transaction_date >= b.start_date AND e.transaction_date < b.end_date
  GROUP BY e.payment_source
), budget_rows AS (
  SELECT c.code, c.name, coalesce(s.amount_aud,0) AS spent_aud, b.amount_aud AS budget_aud
  FROM public.finance_categories c
  LEFT JOIN spend s ON s.category_code = c.code
  LEFT JOIN public.finance_budgets b ON b.category_code = c.code AND b.month = (SELECT start_date FROM bounds)
  ORDER BY c.sort_order
), renewals AS (
  SELECT s.id, s.vendor_name, s.next_renewal, s.monthly_amount_aud, s.payment_source
  FROM public.finance_subscriptions s, bounds b
  WHERE s.active AND s.next_renewal >= b.start_date AND s.next_renewal < b.end_date
  ORDER BY s.next_renewal, s.vendor_name
)
SELECT jsonb_build_object(
  'month', (SELECT start_date FROM bounds),
  'recordedSpendAud', coalesce((SELECT sum(amount_aud) FROM spend),0),
  'unconvertedEntries', coalesce((SELECT sum(unconverted) FROM spend),0),
  'categoryBudgets', coalesce((SELECT jsonb_agg(to_jsonb(budget_rows)) FROM budget_rows),'[]'::jsonb),
  'paymentSourceSpendAud', jsonb_build_object(
    'personalCard', coalesce((SELECT amount_aud FROM source_spend WHERE payment_source = 'personal_card'),0),
    'companyCard', coalesce((SELECT amount_aud FROM source_spend WHERE payment_source = 'company_card'),0),
    'bankTransfer', coalesce((SELECT amount_aud FROM source_spend WHERE payment_source = 'bank_transfer'),0),
    'unknown', coalesce((SELECT amount_aud FROM source_spend WHERE payment_source = 'unknown'),0)
  ),
  'scheduledRenewals', coalesce((SELECT jsonb_agg(to_jsonb(renewals)) FROM renewals),'[]'::jsonb),
  'openMatches', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND source_type = 'staff_request' AND match_status = 'unmatched'),
  'openVariances', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND match_status = 'variance_flagged'),
  'pendingApprovals', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND approval_state = 'pending'),
  'submittedInvoices', (SELECT count(*) FROM public.invoices WHERE deleted_at IS NULL AND status = 'submitted'),
  'subscriptionRunRateAud', coalesce((SELECT sum(monthly_amount_aud) FROM public.finance_subscriptions WHERE active),0)
);
$$;
REVOKE ALL ON FUNCTION public.finance_overview(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_overview(date) TO service_role;

COMMIT;
