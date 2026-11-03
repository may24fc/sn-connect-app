BEGIN;

-- AUD is the reporting currency: every write path (log, ingest, OCR worker, import, edits)
-- gets its normalized AUD columns from the face value, so no AUD row waits for FX.
CREATE OR REPLACE FUNCTION public.normalize_aud_expense_amounts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF upper(coalesce(NEW.currency, '')) = 'AUD' THEN
    NEW.total_amount_aud := NEW.total_amount;
    NEW.tax_amount_aud := NEW.tax_amount;
    NEW.exchange_rate_to_aud := 1;
  ELSIF TG_OP = 'UPDATE' AND upper(coalesce(OLD.currency, '')) = 'AUD'
    AND NEW.exchange_rate_to_aud IS NOT DISTINCT FROM 1 THEN
    -- A row moved away from AUD must not keep its AUD face value as a conversion.
    NEW.total_amount_aud := NULL;
    NEW.tax_amount_aud := NULL;
    NEW.exchange_rate_to_aud := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_expense_entries_normalize_aud ON public.expense_entries;
CREATE TRIGGER trigger_expense_entries_normalize_aud
  BEFORE INSERT OR UPDATE OF currency, total_amount, tax_amount, total_amount_aud, exchange_rate_to_aud
  ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.normalize_aud_expense_amounts();

UPDATE public.expense_entries
SET total_amount_aud = total_amount
WHERE deleted_at IS NULL
  AND upper(currency) = 'AUD'
  AND (total_amount_aud IS NULL OR exchange_rate_to_aud IS NULL OR total_amount_aud <> total_amount);

-- Reports trend: same AUD fallback as Overview and filtered ledger totals.
CREATE OR REPLACE FUNCTION public.finance_spend_trend(anchor_month date, granularity text)
RETURNS TABLE(bucket_start date, bucket_end date, spend_aud numeric, converted_count bigint, unconverted_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF granularity NOT IN ('week','quarter','year') THEN
    RAISE EXCEPTION 'Unsupported Finance trend granularity';
  END IF;
  RETURN QUERY
  WITH series AS (
    SELECT generate_series(0, CASE granularity WHEN 'week' THEN 4 WHEN 'quarter' THEN 3 ELSE 3 END) AS n
  ), bucket_bounds AS (
    SELECT CASE granularity
      WHEN 'week' THEN date_trunc('month', anchor_month)::date + n * 7
      WHEN 'quarter' THEN make_date(extract(year from anchor_month)::int, 1 + n * 3, 1)
      ELSE make_date(extract(year from anchor_month)::int - 3 + n, 1, 1)
    END AS starts,
    CASE granularity
      WHEN 'week' THEN least(date_trunc('month', anchor_month)::date + (n + 1) * 7,
                            (date_trunc('month', anchor_month) + interval '1 month')::date)
      WHEN 'quarter' THEN (make_date(extract(year from anchor_month)::int, 1 + n * 3, 1) + interval '3 months')::date
      ELSE make_date(extract(year from anchor_month)::int - 2 + n, 1, 1)
    END AS ends
    FROM series
  ), entries AS (
    SELECT e.id, e.transaction_date,
      CASE WHEN upper(e.currency) = 'AUD' THEN coalesce(e.total_amount_aud, e.total_amount)
           ELSE e.total_amount_aud END AS report_amount_aud
    FROM public.expense_entries e
    WHERE e.deleted_at IS NULL AND e.source_type = 'direct_payment'
  )
  SELECT b.starts, b.ends,
    coalesce(sum(e.report_amount_aud),0),
    count(e.id) FILTER (WHERE e.report_amount_aud IS NOT NULL),
    count(e.id) FILTER (WHERE e.id IS NOT NULL AND e.report_amount_aud IS NULL)
  FROM bucket_bounds b
  LEFT JOIN entries e ON e.transaction_date >= b.starts AND e.transaction_date < b.ends
  WHERE b.starts < b.ends
  GROUP BY b.starts, b.ends
  ORDER BY b.starts;
END $$;
REVOKE ALL ON FUNCTION public.finance_spend_trend(date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_spend_trend(date, text) TO service_role;

-- Overview: a matched request/payment pair is one amount difference, not two.
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
  'openVariances', (
    SELECT count(*) FROM public.expense_entries e
    WHERE e.deleted_at IS NULL AND e.match_status = 'variance_flagged'
      AND NOT (
        e.source_type = 'direct_payment' AND EXISTS (
          SELECT 1 FROM public.expense_entries partner
          WHERE partner.id = e.matched_entry_id AND partner.deleted_at IS NULL
            AND partner.match_status = 'variance_flagged'
        )
      )
  ),
  'pendingApprovals', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND approval_state = 'pending'),
  'submittedInvoices', (SELECT count(*) FROM public.invoices WHERE deleted_at IS NULL AND status = 'submitted'),
  'subscriptionRunRateAud', coalesce((SELECT sum(monthly_amount_aud) FROM public.finance_subscriptions WHERE active),0)
);
$$;
REVOKE ALL ON FUNCTION public.finance_overview(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_overview(date) TO service_role;

-- Non-AUD subscriptions keep their billing amount and record the rate used for the AUD run rate.
ALTER TABLE public.finance_subscriptions
  ADD COLUMN IF NOT EXISTS billing_fx_rate numeric(18,8),
  ADD COLUMN IF NOT EXISTS billing_fx_converted_at timestamptz;

ALTER TABLE public.finance_subscriptions
  ADD CONSTRAINT finance_subscription_billing_fx_rate_check
    CHECK (billing_fx_rate IS NULL OR billing_fx_rate > 0);

COMMIT;
