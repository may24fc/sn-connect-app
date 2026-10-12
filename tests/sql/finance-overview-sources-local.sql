-- Run only against local Supabase. All fixtures roll back.
BEGIN;
DO $$
DECLARE
  actor_id uuid;
  report jsonb;
BEGIN
  SELECT id INTO actor_id FROM public.users ORDER BY id LIMIT 1;
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Local user fixture is required'; END IF;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type,payment_source)
  VALUES(actor_id,'Source split test','2024-04-12',25,25,'AUD','direct_payment','company_card');
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type,payment_source)
  VALUES(actor_id,'Unconverted source test','2024-04-13',20,NULL,'USD','direct_payment','personal_card');
  INSERT INTO public.finance_subscriptions(vendor_name,category_code,payment_source,monthly_amount_aud,next_renewal,created_by)
  VALUES('Scheduled test','software','company_card',25,'2024-04-20',actor_id);
  report := public.finance_overview('2024-04-01');
  IF (report->'paymentSourceSpendAud'->>'companyCard')::numeric <> 25 THEN
    RAISE EXCEPTION 'Company-card AUD spend missing';
  END IF;
  IF (report->'paymentSourceSpendAud'->>'personalCard')::numeric <> 0 THEN
    RAISE EXCEPTION 'Unconverted USD appeared in AUD split';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report->'scheduledRenewals') AS r WHERE r->>'vendor_name' = 'Scheduled test') THEN
    RAISE EXCEPTION 'Scheduled renewal missing';
  END IF;
END $$;
ROLLBACK;
