-- Run against local Supabase with psql -v ON_ERROR_STOP=1. All fixtures roll back.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  reviewer_id uuid;
  request_exact uuid;
  payment_exact uuid;
  request_large uuid;
  payment_large uuid;
  ordinary_payment uuid;
  provider_id uuid;
  ai_expense_id uuid;
  response jsonb;
  rejected_final boolean := false;
BEGIN
  SELECT id INTO owner_id FROM public.users ORDER BY id LIMIT 1;
  SELECT id INTO reviewer_id FROM public.users WHERE id <> owner_id ORDER BY id LIMIT 1;
  IF owner_id IS NULL OR reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Local Finance checks need two user fixtures';
  END IF;
  UPDATE public.finance_approval_settings SET ceo_user_id = owner_id, coo_user_id = reviewer_id WHERE id = true;

  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(owner_id,'Boundary request','2026-10-07',1000,1000,'AUD','staff_request') RETURNING id INTO request_exact;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(owner_id,'Boundary payment','2026-10-07',1100,1100,'AUD','direct_payment') RETURNING id INTO payment_exact;
  response := public.reconcile_finance_expense(request_exact,payment_exact,reviewer_id,'Documented AUD 100 difference');
  IF response->>'requiresLeadershipSignoff' <> 'false' THEN RAISE EXCEPTION 'Exactly 10 percent and AUD 100 must not need leadership'; END IF;
  IF public.decide_finance_variance(request_exact,owner_id,'approved','') THEN RAISE EXCEPTION 'Submitter approved own variance'; END IF;
  IF NOT public.decide_finance_variance(request_exact,reviewer_id,'approved','') THEN RAISE EXCEPTION 'Reviewer could not approve small variance'; END IF;

  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(owner_id,'Large request','2026-10-07',2000,2000,'AUD','staff_request') RETURNING id INTO request_large;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(owner_id,'Large payment','2026-10-07',2100.01,2100.01,'AUD','direct_payment') RETURNING id INTO payment_large;
  response := public.reconcile_finance_expense(request_large,payment_large,reviewer_id,'Documented AUD 100.01 difference');
  IF response->>'requiresLeadershipSignoff' <> 'true' THEN RAISE EXCEPTION 'AUD 100.01 must need leadership'; END IF;
  IF (SELECT required_approver FROM public.finance_variance_signoffs WHERE expense_id = request_large) <> reviewer_id THEN
    RAISE EXCEPTION 'CEO item did not route to COO';
  END IF;
  PERFORM public.create_finance_report_snapshot('2026-10-01',reviewer_id,'{}'::jsonb,false);
  BEGIN
    PERFORM public.create_finance_report_snapshot('2026-10-01',reviewer_id,'{}'::jsonb,true);
  EXCEPTION WHEN raise_exception THEN
    rejected_final := true;
  END;
  IF NOT rejected_final THEN RAISE EXCEPTION 'Final report accepted an open variance'; END IF;
  IF public.decide_finance_variance(request_large,owner_id,'approved','') THEN RAISE EXCEPTION 'CEO approved own large variance'; END IF;
  IF NOT public.decide_finance_variance(request_large,reviewer_id,'approved','') THEN RAISE EXCEPTION 'COO could not sign off large variance'; END IF;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,total_amount_aud,currency,source_type)
  VALUES(owner_id,'Ordinary payment','2026-10-07',25,25,'AUD','direct_payment') RETURNING id INTO ordinary_payment;
  IF public.decide_finance_expense(ordinary_payment,owner_id,'approved') THEN RAISE EXCEPTION 'Submitter approved own ordinary expense'; END IF;
  IF NOT public.decide_finance_expense(ordinary_payment,reviewer_id,'approved') THEN RAISE EXCEPTION 'Reviewer could not approve ordinary expense'; END IF;
  PERFORM public.create_finance_report_snapshot('2026-10-01',reviewer_id,'{}'::jsonb,true);

  INSERT INTO public.ai_expense_providers(name) VALUES('Finance local test provider') RETURNING id INTO provider_id;
  INSERT INTO public.ai_expenses(user_id,provider_id,transaction_date,amount_cents,currency,transaction_id,reason)
  VALUES(owner_id,provider_id,'2026-10-07',12345,'AUD','finance-local-test','Temporary AI expense') RETURNING id INTO ai_expense_id;
  IF (SELECT count(*) FROM public.expense_entries WHERE source_system = 'ai_spending' AND source_record_id = ai_expense_id) <> 1 THEN
    RAISE EXCEPTION 'AI expense did not create exactly one ledger entry';
  END IF;
  UPDATE public.ai_expenses SET amount_cents = 22345 WHERE id = ai_expense_id;
  IF (SELECT total_amount FROM public.expense_entries WHERE source_system = 'ai_spending' AND source_record_id = ai_expense_id) <> 223.45 THEN
    RAISE EXCEPTION 'AI update did not reconcile ledger amount';
  END IF;
  DELETE FROM public.ai_expenses WHERE id = ai_expense_id;
  IF (SELECT deleted_at FROM public.expense_entries WHERE source_system = 'ai_spending' AND source_record_id = ai_expense_id) IS NULL THEN
    RAISE EXCEPTION 'AI deletion did not retire ledger entry';
  END IF;
END $$;
ROLLBACK;
