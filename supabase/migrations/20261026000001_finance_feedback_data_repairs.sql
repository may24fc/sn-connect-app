BEGIN;

-- AUD is already the reporting currency and must never wait for FX conversion.
UPDATE public.expense_entries
SET total_amount_aud = total_amount,
    exchange_rate_to_aud = 1
WHERE deleted_at IS NULL
  AND upper(currency) = 'AUD'
  AND (total_amount_aud IS NULL OR exchange_rate_to_aud IS NULL);

-- Correct the named legacy vendors from the October Finance review.
UPDATE public.expense_entries
SET category_code = CASE
  WHEN lower(vendor_name) ~ '(meta|facebook|advertis|\bads?\b)' THEN 'advertising'
  WHEN lower(vendor_name) ~ '(amazon web services|\baws\b|sydney data centre|sydney data center)' THEN 'ai_cloud'
  WHEN lower(vendor_name) ~ '(cowork|co-work)' THEN 'rent_workspace'
  WHEN lower(vendor_name) ~ '(chair|desk)' THEN 'equipment'
  ELSE category_code
END
WHERE deleted_at IS NULL
  AND lower(vendor_name) ~ '(meta|facebook|advertis|\bads?\b|amazon web services|\baws\b|sydney data centre|sydney data center|cowork|co-work|chair|desk)';

CREATE OR REPLACE FUNCTION public.finance_overview(target_month date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH bounds AS (
  SELECT date_trunc('month', target_month)::date AS start_date,
         (date_trunc('month', target_month) + interval '1 month')::date AS end_date
), month_entries AS (
  SELECT e.*,
    CASE WHEN upper(e.currency) = 'AUD' THEN coalesce(e.total_amount_aud, e.total_amount)
         ELSE e.total_amount_aud END AS report_amount_aud
  FROM public.expense_entries e, bounds b
  WHERE e.deleted_at IS NULL AND e.source_type = 'direct_payment'
    AND e.transaction_date >= b.start_date AND e.transaction_date < b.end_date
), spend AS (
  SELECT e.category_code, sum(e.report_amount_aud) AS amount_aud,
         count(*) FILTER (WHERE e.report_amount_aud IS NULL) AS unconverted
  FROM month_entries e GROUP BY e.category_code
), source_spend AS (
  SELECT e.payment_source, sum(e.report_amount_aud) AS amount_aud
  FROM month_entries e GROUP BY e.payment_source
), unconverted_totals AS (
  SELECT upper(currency) AS currency, sum(total_amount) AS amount, count(*) AS entry_count
  FROM month_entries WHERE report_amount_aud IS NULL
  GROUP BY upper(currency) ORDER BY upper(currency)
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
  'unconvertedTotals', coalesce((SELECT jsonb_agg(to_jsonb(unconverted_totals)) FROM unconverted_totals),'[]'::jsonb),
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

CREATE OR REPLACE FUNCTION public.reconcile_finance_expense(
  request_id uuid, payment_id uuid, actor_id uuid, reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  request_row public.expense_entries%ROWTYPE; payment_row public.expense_entries%ROWTYPE;
  request_aud numeric; payment_aud numeric; difference numeric; significant boolean;
  ceo_id uuid; coo_id uuid; approver_id uuid;
BEGIN
  SELECT * INTO request_row FROM public.expense_entries WHERE id = request_id AND deleted_at IS NULL FOR UPDATE;
  SELECT * INTO payment_row FROM public.expense_entries WHERE id = payment_id AND deleted_at IS NULL FOR UPDATE;
  IF request_row.id IS NULL OR payment_row.id IS NULL OR request_row.source_type <> 'staff_request'
     OR payment_row.source_type <> 'direct_payment' OR request_row.match_status <> 'unmatched'
     OR payment_row.match_status <> 'unmatched' THEN
    RAISE EXCEPTION 'Only open requests can be matched to open direct payments';
  END IF;
  request_aud := coalesce(request_row.total_amount_aud, CASE WHEN upper(request_row.currency) = 'AUD' THEN request_row.total_amount END);
  payment_aud := coalesce(payment_row.total_amount_aud, CASE WHEN upper(payment_row.currency) = 'AUD' THEN payment_row.total_amount END);
  IF request_aud IS NULL OR payment_aud IS NULL OR request_aud <= 0 THEN RAISE EXCEPTION 'AUD conversions are required before matching'; END IF;
  difference := round(payment_aud - request_aud, 2);
  IF difference <> 0 AND length(trim(coalesce(reason,''))) = 0 THEN RAISE EXCEPTION 'A reason is required for an amount difference'; END IF;
  significant := abs(difference) > 100 OR abs(difference) / request_aud > 0.10;
  SELECT ceo_user_id, coo_user_id INTO ceo_id, coo_id FROM public.finance_approval_settings WHERE id = true;
  approver_id := CASE WHEN request_row.submitted_by = ceo_id THEN coo_id ELSE ceo_id END;
  UPDATE public.expense_entries SET
    match_status = (CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END)::public.expense_match_status,
    matched_entry_id = payment_id, matched_by = actor_id, matched_at = now(),
    matched_variance_amount = difference, matched_notes = nullif(trim(reason),'')
  WHERE id = request_id;
  UPDATE public.expense_entries SET
    match_status = (CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END)::public.expense_match_status,
    matched_entry_id = request_id, matched_by = actor_id, matched_at = now(),
    matched_variance_amount = -difference, matched_notes = nullif(trim(reason),''), payment_status = 'confirmed'
  WHERE id = payment_id;
  IF difference <> 0 THEN
    INSERT INTO public.finance_variance_signoffs(expense_id, reason, required_approver)
    VALUES(request_id, trim(reason), CASE WHEN significant THEN approver_id ELSE NULL END);
  END IF;
  RETURN jsonb_build_object('matchStatus', CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END,
    'varianceAmountAud', difference, 'requiresLeadershipSignoff', significant,
    'approverConfigured', NOT significant OR approver_id IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.reconcile_finance_expense(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_finance_expense(uuid, uuid, uuid, text) TO service_role;

COMMIT;
