-- Run against local Supabase with psql -v ON_ERROR_STOP=1. All fixtures roll back.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  receipt_id uuid;
  request_id uuid;
  payment_id uuid;
  before_variances integer;
  overview jsonb;
  trend_spend numeric;
BEGIN
  SELECT id INTO owner_id FROM public.users ORDER BY id LIMIT 1;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Local Finance checks need a user fixture'; END IF;

  -- New AUD rows normalize on insert and after OCR-style amount updates.
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,tax_amount,currency,source_type)
  VALUES(owner_id,'Gap AUD receipt','2031-02-03',0,0,'AUD','direct_payment') RETURNING id INTO receipt_id;
  UPDATE public.expense_entries SET total_amount = 120.40, tax_amount = 10.95 WHERE id = receipt_id;
  IF NOT EXISTS (SELECT 1 FROM public.expense_entries WHERE id = receipt_id
      AND total_amount_aud = 120.40 AND tax_amount_aud = 10.95 AND exchange_rate_to_aud = 1) THEN
    RAISE EXCEPTION 'AUD receipt was not normalized after its amount changed';
  END IF;

  SELECT sum(spend_aud) INTO trend_spend FROM public.finance_spend_trend('2031-02-01', 'week');
  IF trend_spend <> 120.40 THEN RAISE EXCEPTION 'Weekly trend omitted the AUD receipt: %', trend_spend; END IF;

  UPDATE public.expense_entries SET currency = 'USD' WHERE id = receipt_id;
  IF EXISTS (SELECT 1 FROM public.expense_entries WHERE id = receipt_id AND total_amount_aud IS NOT NULL) THEN
    RAISE EXCEPTION 'A row moved away from AUD kept its face value as a conversion';
  END IF;

  -- A matched pair with an amount difference counts once in Overview.
  before_variances := (public.finance_overview('2031-02-01')->>'openVariances')::integer;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type)
  VALUES(owner_id,'Gap request','2031-02-04',50,'AUD','staff_request') RETURNING id INTO request_id;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type)
  VALUES(owner_id,'Gap payment','2031-02-04',55,'AUD','direct_payment') RETURNING id INTO payment_id;
  PERFORM public.reconcile_finance_expense(request_id, payment_id, owner_id, 'Card surcharge');
  overview := public.finance_overview('2031-02-01');
  IF (overview->>'openVariances')::integer <> before_variances + 1 THEN
    RAISE EXCEPTION 'Matched pair counted % times', (overview->>'openVariances')::integer - before_variances;
  END IF;
END $$;
ROLLBACK;
