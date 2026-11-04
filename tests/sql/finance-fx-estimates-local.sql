-- Run against local Supabase with psql -v ON_ERROR_STOP=1. All fixtures roll back.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  usd_id uuid;
  old_id uuid;
  request_id uuid;
  payment_id uuid;
  result jsonb;
BEGIN
  SELECT id INTO owner_id FROM public.users ORDER BY id LIMIT 1;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Local Finance checks need a user fixture'; END IF;
  DELETE FROM public.fx_rates;

  -- No rates yet: a USD expense stays unconverted.
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,tax_amount,currency,source_type)
  VALUES(owner_id,'FX USD tool','2031-03-10',100,10,'USD','direct_payment') RETURNING id INTO usd_id;
  IF (SELECT total_amount_aud FROM public.expense_entries WHERE id = usd_id) IS NOT NULL THEN
    RAISE EXCEPTION 'USD expense converted without any rate';
  END IF;

  -- Daily rates arrive (AUD base: units of currency per AUD); refresh fills the estimate.
  INSERT INTO public.fx_rates(base_currency, rates, fetched_at, provider, rate_date) VALUES
    ('AUD', '{"AUD":1,"USD":0.5}', now(), 'frankfurter', '2031-03-01'),
    ('AUD', '{"AUD":1,"USD":0.8}', now(), 'frankfurter', '2031-03-20');
  PERFORM public.finance_refresh_fx_estimates();
  IF NOT EXISTS (SELECT 1 FROM public.expense_entries WHERE id = usd_id
      AND total_amount_aud = 200 AND tax_amount_aud = 20 AND exchange_rate_to_aud = 2
      AND aud_amount_basis = 'daily_estimate' AND fx_source = 'frankfurter') THEN
    RAISE EXCEPTION 'Estimate did not use the rate on or before the transaction date';
  END IF;

  -- A transaction older than every stored rate uses the earliest rate.
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type)
  VALUES(owner_id,'FX old USD','2030-12-31',10,'USD','direct_payment') RETURNING id INTO old_id;
  IF (SELECT total_amount_aud FROM public.expense_entries WHERE id = old_id) <> 20 THEN
    RAISE EXCEPTION 'Early transaction was not estimated with the earliest rate';
  END IF;

  -- Finance records the statement amount; later refreshes and amount edits keep it.
  UPDATE public.expense_entries SET total_amount_aud = 151.25, aud_amount_basis = 'actual',
    aud_actual_recorded_by = owner_id, aud_actual_recorded_at = now() WHERE id = usd_id;
  PERFORM public.finance_refresh_fx_estimates();
  UPDATE public.expense_entries SET tax_amount = 5 WHERE id = usd_id;
  IF NOT EXISTS (SELECT 1 FROM public.expense_entries WHERE id = usd_id
      AND total_amount_aud = 151.25 AND aud_amount_basis = 'actual' AND exchange_rate_to_aud = 1.5125
      AND tax_amount_aud = 7.56 AND fx_source = 'finance_actual') THEN
    RAISE EXCEPTION 'Actual AUD was overwritten';
  END IF;

  -- Clearing the actual amount returns to the daily estimate.
  UPDATE public.expense_entries SET aud_amount_basis = NULL WHERE id = usd_id;
  IF NOT EXISTS (SELECT 1 FROM public.expense_entries WHERE id = usd_id
      AND total_amount_aud = 200 AND aud_amount_basis = 'daily_estimate' AND aud_actual_recorded_by IS NULL) THEN
    RAISE EXCEPTION 'Clearing the actual AUD did not restore the estimate';
  END IF;

  -- Changing the currency drops an actual amount and re-estimates.
  UPDATE public.expense_entries SET total_amount_aud = 150, aud_amount_basis = 'actual' WHERE id = usd_id;
  UPDATE public.expense_entries SET currency = 'AUD' WHERE id = usd_id;
  IF NOT EXISTS (SELECT 1 FROM public.expense_entries WHERE id = usd_id
      AND total_amount_aud = 100 AND aud_amount_basis = 'reporting_currency') THEN
    RAISE EXCEPTION 'Switching to AUD did not use the face value';
  END IF;

  -- Same-currency pairs on different dates match when face amounts agree.
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type)
  VALUES(owner_id,'FX request','2031-03-02',50,'USD','staff_request') RETURNING id INTO request_id;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type)
  VALUES(owner_id,'FX payment','2031-03-21',50,'USD','direct_payment') RETURNING id INTO payment_id;
  result := public.reconcile_finance_expense(request_id, payment_id, owner_id, '');
  IF result->>'matchStatus' <> 'matched' THEN
    RAISE EXCEPTION 'Same-currency equal amounts were flagged: %', result;
  END IF;

  -- Overview and filtered totals report the estimated portion.
  IF (public.finance_overview('2031-03-01')->>'estimatedSpendAud')::numeric <> 62.5 THEN
    RAISE EXCEPTION 'Overview estimated spend: %', public.finance_overview('2031-03-01')->>'estimatedSpendAud';
  END IF;
  IF (public.finance_expense_filtered_totals('2031-03-01', NULL, NULL, 'FX ')->>'estimatedCount')::integer <> 2 THEN
    RAISE EXCEPTION 'Filtered totals estimated count: %', public.finance_expense_filtered_totals('2031-03-01', NULL, NULL, 'FX ');
  END IF;
END $$;
ROLLBACK;
