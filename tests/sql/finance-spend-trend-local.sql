-- Local Supabase only. Fixture rows roll back.
BEGIN;
DO $$
DECLARE
  actor_id uuid;
BEGIN
  SELECT id INTO actor_id FROM public.users ORDER BY id LIMIT 1;
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Local user fixture is required'; END IF;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(actor_id,'Trend AUD','2024-04-15',31,31,'AUD','direct_payment');
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(actor_id,'Trend USD','2024-04-16',20,NULL,'USD','direct_payment');
  IF (SELECT count(*) FROM public.finance_spend_trend('2024-04-01','week') WHERE spend_aud = 31 AND converted_count = 1 AND unconverted_count = 1) <> 1 THEN
    RAISE EXCEPTION 'Weekly AUD/FX bucket incorrect';
  END IF;
  IF (SELECT count(*) FROM public.finance_spend_trend('2024-04-01','quarter')) <> 4 THEN
    RAISE EXCEPTION 'Expected four quarterly buckets';
  END IF;
  IF (SELECT count(*) FROM public.finance_spend_trend('2024-04-01','year')) <> 4 THEN
    RAISE EXCEPTION 'Expected four yearly buckets';
  END IF;
  BEGIN
    PERFORM public.finance_spend_trend('2024-04-01','day');
    RAISE EXCEPTION 'Invalid period was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Invalid period was accepted' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
