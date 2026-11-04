BEGIN;

-- Daily rate snapshots keyed by provider and the date the provider published them, so an
-- expense can be estimated at the rate for its transaction date.
ALTER TABLE public.fx_rates
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'open_exchange_rates',
  ADD COLUMN IF NOT EXISTS rate_date date;

UPDATE public.fx_rates SET rate_date = (fetched_at AT TIME ZONE 'UTC')::date WHERE rate_date IS NULL;

ALTER TABLE public.fx_rates
  ALTER COLUMN rate_date SET NOT NULL,
  ALTER COLUMN provider DROP DEFAULT;

ALTER TABLE public.fx_rates
  ADD CONSTRAINT fx_rates_provider_rate_date_unique UNIQUE (provider, rate_date);

CREATE INDEX IF NOT EXISTS idx_fx_rates_rate_date ON public.fx_rates (rate_date DESC);

COMMENT ON COLUMN public.fx_rates.provider IS 'Rate source, e.g. frankfurter or exchangerate_api';
COMMENT ON COLUMN public.fx_rates.rate_date IS 'Date the provider published these rates';

-- How each expense''s AUD amount was obtained. Finance-entered actual amounts are never replaced
-- by a daily estimate.
ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS aud_amount_basis text,
  ADD COLUMN IF NOT EXISTS aud_actual_recorded_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS aud_actual_recorded_at timestamptz;

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_aud_amount_basis_check
    CHECK (aud_amount_basis IS NULL OR aud_amount_basis IN ('reporting_currency', 'daily_estimate', 'actual')),
  ADD CONSTRAINT expense_entries_actual_aud_present_check
    CHECK (aud_amount_basis IS DISTINCT FROM 'actual' OR total_amount_aud IS NOT NULL);

ALTER TABLE public.expense_entries ALTER COLUMN fx_source DROP DEFAULT;

COMMENT ON COLUMN public.expense_entries.aud_amount_basis IS
  'reporting_currency = AUD face value; daily_estimate = converted at a published daily rate; actual = Finance entered the AUD charged on the card or bank statement';

-- Rate to convert one unit of `currency` into AUD, using the latest published rate on or before
-- `on_date` (or the earliest available when the date predates all stored rates).
CREATE OR REPLACE FUNCTION public.finance_fx_rate_to_aud(currency text, on_date date)
RETURNS TABLE(rate_to_aud numeric, rate_date date, provider text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH candidate AS (
    SELECT f.base_currency, f.rates, f.rate_date, f.provider
    FROM public.fx_rates f
    WHERE upper(f.base_currency) = 'AUD' OR f.rates ? 'AUD'
    ORDER BY (f.rate_date <= coalesce(on_date, current_date)) DESC,
             CASE WHEN f.rate_date <= coalesce(on_date, current_date) THEN f.rate_date END DESC NULLS LAST,
             f.rate_date ASC,
             (f.provider = 'frankfurter') DESC,
             f.fetched_at DESC
    LIMIT 1
  ), parts AS (
    SELECT
      CASE WHEN upper(c.base_currency) = 'AUD' THEN 1::numeric ELSE nullif(c.rates->>'AUD', '')::numeric END AS aud_per_base,
      CASE WHEN upper(c.base_currency) = upper(currency) THEN 1::numeric ELSE nullif(c.rates->>upper(currency), '')::numeric END AS ccy_per_base,
      c.rate_date, c.provider
    FROM candidate c
  )
  SELECT round(p.aud_per_base / p.ccy_per_base, 8), p.rate_date, p.provider
  FROM parts p
  WHERE p.aud_per_base > 0 AND p.ccy_per_base > 0;
$$;
REVOKE ALL ON FUNCTION public.finance_fx_rate_to_aud(text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_fx_rate_to_aud(text, date) TO service_role;

CREATE OR REPLACE FUNCTION public.normalize_aud_expense_amounts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fx record;
  currency_changed boolean := TG_OP = 'UPDATE' AND upper(coalesce(NEW.currency, '')) IS DISTINCT FROM upper(coalesce(OLD.currency, ''));
BEGIN
  IF upper(coalesce(NEW.currency, '')) = 'AUD' THEN
    NEW.total_amount_aud := NEW.total_amount;
    NEW.tax_amount_aud := NEW.tax_amount;
    NEW.exchange_rate_to_aud := 1;
    NEW.aud_amount_basis := 'reporting_currency';
    NEW.fx_source := 'reporting_currency';
    NEW.aud_actual_recorded_by := NULL;
    NEW.aud_actual_recorded_at := NULL;
    RETURN NEW;
  END IF;

  -- Finance's statement amount stands until the currency changes or Finance clears it.
  IF NEW.aud_amount_basis = 'actual' AND NOT currency_changed AND NEW.total_amount_aud IS NOT NULL THEN
    IF coalesce(NEW.total_amount, 0) > 0 THEN
      NEW.exchange_rate_to_aud := round(NEW.total_amount_aud / NEW.total_amount, 8);
      NEW.tax_amount_aud := round(coalesce(NEW.tax_amount, 0) * NEW.exchange_rate_to_aud, 2);
    END IF;
    NEW.fx_source := 'finance_actual';
    RETURN NEW;
  END IF;

  NEW.aud_actual_recorded_by := NULL;
  NEW.aud_actual_recorded_at := NULL;
  SELECT * INTO fx FROM public.finance_fx_rate_to_aud(NEW.currency, NEW.transaction_date);
  IF fx.rate_to_aud IS NOT NULL THEN
    NEW.exchange_rate_to_aud := fx.rate_to_aud;
    NEW.total_amount_aud := round(coalesce(NEW.total_amount, 0) * fx.rate_to_aud, 2);
    NEW.tax_amount_aud := round(coalesce(NEW.tax_amount, 0) * fx.rate_to_aud, 2);
    NEW.aud_amount_basis := 'daily_estimate';
    NEW.fx_source := fx.provider;
    NEW.fx_rates_fetched_at := fx.rate_date::timestamptz;
  ELSIF currency_changed OR NEW.aud_amount_basis IN ('actual', 'reporting_currency') THEN
    NEW.total_amount_aud := NULL;
    NEW.tax_amount_aud := NULL;
    NEW.exchange_rate_to_aud := NULL;
    NEW.aud_amount_basis := NULL;
  ELSIF NEW.total_amount_aud IS NOT NULL THEN
    NEW.aud_amount_basis := 'daily_estimate';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_expense_entries_normalize_aud ON public.expense_entries;
CREATE TRIGGER trigger_expense_entries_normalize_aud
  BEFORE INSERT OR UPDATE OF currency, total_amount, tax_amount, total_amount_aud, exchange_rate_to_aud, transaction_date, aud_amount_basis
  ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.normalize_aud_expense_amounts();

-- Re-estimates every non-actual foreign-currency expense after new rates arrive.
CREATE OR REPLACE FUNCTION public.finance_refresh_fx_estimates()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE refreshed integer;
BEGIN
  UPDATE public.expense_entries e
  SET transaction_date = e.transaction_date
  WHERE e.deleted_at IS NULL
    AND upper(coalesce(e.currency, '')) <> 'AUD'
    AND e.aud_amount_basis IS DISTINCT FROM 'actual'
    AND (
      e.total_amount_aud IS NULL
      OR e.exchange_rate_to_aud IS DISTINCT FROM (
        SELECT fx.rate_to_aud FROM public.finance_fx_rate_to_aud(e.currency, e.transaction_date) fx
      )
    );
  GET DIAGNOSTICS refreshed = ROW_COUNT;
  RETURN refreshed;
END $$;
REVOKE ALL ON FUNCTION public.finance_refresh_fx_estimates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_refresh_fx_estimates() TO service_role;

UPDATE public.expense_entries
SET aud_amount_basis = 'reporting_currency', fx_source = 'reporting_currency'
WHERE upper(coalesce(currency, '')) = 'AUD';

SELECT public.finance_refresh_fx_estimates();

-- Matching compares like with like: same-currency pairs differ only by their face amounts.
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
  IF upper(request_row.currency) = upper(payment_row.currency) AND coalesce(payment_row.total_amount, 0) > 0 THEN
    difference := round((payment_row.total_amount - request_row.total_amount) * (payment_aud / payment_row.total_amount), 2);
  ELSE
    difference := round(payment_aud - request_aud, 2);
  END IF;
  IF difference <> 0 AND length(trim(coalesce(reason,''))) = 0 THEN RAISE EXCEPTION 'A reason is required for an amount difference'; END IF;
  significant := abs(difference) > 100 OR abs(difference) / request_aud > 0.10;
  SELECT ceo_user_id, coo_user_id INTO ceo_id, coo_id FROM public.finance_approval_settings WHERE id = true;
  approver_id := CASE WHEN request_row.submitted_by = ceo_id THEN coo_id ELSE ceo_id END;
  UPDATE public.expense_entries SET
    match_status = (CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END)::public.expense_match_status,
    matched_entry_id = payment_id, matched_by = actor_id, matched_at = now(),
    matched_variance_amount = difference, matched_notes = nullif(trim(reason),''), payment_status = 'confirmed'
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

-- Totals now report how much of the AUD figure is a daily-rate estimate.
CREATE OR REPLACE FUNCTION public.finance_expense_filtered_totals(
  target_month date DEFAULT NULL, target_payment_source text DEFAULT NULL,
  target_category text DEFAULT NULL, vendor_search text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH filtered AS (
  SELECT e.*
  FROM public.expense_entries e
  WHERE e.deleted_at IS NULL
    AND (target_month IS NULL OR (
      e.transaction_date >= date_trunc('month', target_month)::date
      AND e.transaction_date < (date_trunc('month', target_month) + interval '1 month')::date
    ))
    AND (target_payment_source IS NULL OR e.payment_source = target_payment_source)
    AND (target_category IS NULL OR e.category_code = target_category)
    AND (vendor_search IS NULL OR e.vendor_name ILIKE '%' || vendor_search || '%')
), by_currency AS (
  SELECT upper(currency) AS currency, count(*) AS entry_count, sum(total_amount) AS amount
  FROM filtered GROUP BY upper(currency) ORDER BY upper(currency)
)
SELECT jsonb_build_object(
  'count', (SELECT count(*) FROM filtered),
  'totalsByCurrency', coalesce((SELECT jsonb_agg(to_jsonb(by_currency)) FROM by_currency), '[]'::jsonb),
  'convertedAud', coalesce((SELECT sum(
    CASE WHEN upper(currency) = 'AUD' THEN coalesce(total_amount_aud, total_amount)
         ELSE total_amount_aud END
  ) FROM filtered), 0),
  'estimatedAud', coalesce((SELECT sum(total_amount_aud) FROM filtered WHERE aud_amount_basis = 'daily_estimate'), 0),
  'estimatedCount', (SELECT count(*) FROM filtered WHERE aud_amount_basis = 'daily_estimate'),
  'unconvertedCount', (SELECT count(*) FROM filtered WHERE upper(currency) <> 'AUD' AND total_amount_aud IS NULL)
);
$$;
REVOKE ALL ON FUNCTION public.finance_expense_filtered_totals(date, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_expense_filtered_totals(date, text, text, text) TO service_role;

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
), estimated_totals AS (
  SELECT upper(currency) AS currency, sum(total_amount) AS amount, sum(total_amount_aud) AS amount_aud, count(*) AS entry_count
  FROM month_entries WHERE aud_amount_basis = 'daily_estimate'
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
  'estimatedSpendAud', coalesce((SELECT sum(amount_aud) FROM estimated_totals),0),
  'estimatedTotals', coalesce((SELECT jsonb_agg(to_jsonb(estimated_totals)) FROM estimated_totals),'[]'::jsonb),
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

COMMIT;
