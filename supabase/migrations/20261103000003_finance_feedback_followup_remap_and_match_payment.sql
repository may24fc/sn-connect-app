BEGIN;

-- 20261026000001 used `\b`, which PostgreSQL treats as a backspace, so plain "AWS" and
-- "... Ads" vendors were never remapped. Its unbounded `meta`, `desk`, and `chair`
-- alternatives could also catch vendors such as Metabase or Zendesk. Restore those
-- false positives from the audit trail before applying word-bounded (`\y`) rules.
WITH false_positives AS (
  SELECT e.id
  FROM public.expense_entries e
  WHERE e.deleted_at IS NULL
    AND (
      (e.category_code = 'advertising'
        AND lower(e.vendor_name) ~ 'meta'
        AND lower(e.vendor_name) !~ '(\y(meta|facebook|instagram)\y|advertis|\yads?\y)')
      OR (e.category_code = 'equipment'
        AND lower(e.vendor_name) ~ '(chair|desk)'
        AND lower(e.vendor_name) !~ '\y(chairs?|desks?)\y')
    )
), previous_category AS (
  SELECT DISTINCT ON (a.record_id)
    a.record_id,
    a.old_values->>'category_code' AS old_category,
    a.new_values->>'category_code' AS new_category
  FROM public.audit_logs a
  JOIN false_positives f ON f.id = a.record_id
  WHERE a.table_name = 'expense_entries'
    AND a.operation = 'UPDATE'
    AND a.performed_by IS NULL
    AND a.old_values->>'category_code' IS DISTINCT FROM a.new_values->>'category_code'
  ORDER BY a.record_id, a.performed_at DESC
)
UPDATE public.expense_entries e
SET category_code = p.old_category
FROM previous_category p
WHERE e.id = p.record_id
  AND e.category_code = p.new_category
  AND p.old_category IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.finance_categories c WHERE c.code = p.old_category);

-- Only legacy catch-all categories are remapped, so deliberate Finance choices remain.
UPDATE public.expense_entries
SET category_code = CASE
  WHEN lower(vendor_name) ~ '(\y(meta|facebook|instagram)\y|advertis|\yads?\y)' THEN 'advertising'
  WHEN lower(vendor_name) ~ '(\yaws\y|amazon web services|data cent(re|er))' THEN 'ai_cloud'
  WHEN lower(vendor_name) ~ '\yco-?work' THEN 'rent_workspace'
  WHEN lower(vendor_name) ~ '\y(chairs?|desks?)\y' THEN 'equipment'
  ELSE category_code
END
WHERE deleted_at IS NULL
  AND coalesce(category_code, 'other') IN ('other', 'software', 'utilities', 'office_supplies')
  AND lower(vendor_name) ~ '(\y(meta|facebook|instagram)\y|advertis|\yads?\y|\yaws\y|amazon web services|data cent(re|er)|\yco-?work|\y(chairs?|desks?)\y)';

-- A completed match proves payment for both the staff request and its direct payment.
UPDATE public.expense_entries
SET payment_status = 'confirmed'
WHERE deleted_at IS NULL
  AND matched_entry_id IS NOT NULL
  AND match_status IN ('matched', 'variance_flagged', 'resolved')
  AND payment_status <> 'confirmed';

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

COMMIT;
