-- Run against local Supabase with psql -v ON_ERROR_STOP=1. All fixtures roll back.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  reviewer_id uuid;
  request_id uuid;
  payment_id uuid;
  diff_request_id uuid;
  diff_payment_id uuid;
BEGIN
  SELECT id INTO owner_id FROM public.users ORDER BY id LIMIT 1;
  SELECT id INTO reviewer_id FROM public.users WHERE id <> owner_id ORDER BY id LIMIT 1;
  IF owner_id IS NULL OR reviewer_id IS NULL THEN
    RAISE EXCEPTION 'Local Finance checks need two user fixtures';
  END IF;

  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type,payment_status)
  VALUES(owner_id,'Exact request','2026-10-07',50,'AUD','staff_request','unpaid') RETURNING id INTO request_id;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type,payment_status)
  VALUES(owner_id,'Exact payment','2026-10-07',50,'AUD','direct_payment','unknown') RETURNING id INTO payment_id;
  PERFORM public.reconcile_finance_expense(request_id,payment_id,reviewer_id,'');
  IF (SELECT count(*) FROM public.expense_entries
      WHERE id IN (request_id,payment_id) AND match_status = 'matched' AND payment_status = 'confirmed') <> 2 THEN
    RAISE EXCEPTION 'An exact match must mark both the request and payment paid';
  END IF;

  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type,payment_status)
  VALUES(owner_id,'Difference request','2026-10-07',50,'AUD','staff_request','unpaid') RETURNING id INTO diff_request_id;
  INSERT INTO public.expense_entries(submitted_by,vendor_name,transaction_date,total_amount,currency,source_type,payment_status)
  VALUES(owner_id,'Difference payment','2026-10-07',55,'AUD','direct_payment','unknown') RETURNING id INTO diff_payment_id;
  PERFORM public.reconcile_finance_expense(diff_request_id,diff_payment_id,reviewer_id,'Card surcharge');
  IF (SELECT count(*) FROM public.expense_entries
      WHERE id IN (diff_request_id,diff_payment_id) AND match_status = 'variance_flagged' AND payment_status = 'confirmed') <> 2 THEN
    RAISE EXCEPTION 'A match with an amount difference must still mark both rows paid';
  END IF;
END $$;
ROLLBACK;
