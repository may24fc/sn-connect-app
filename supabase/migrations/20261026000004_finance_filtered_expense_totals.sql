BEGIN;

CREATE OR REPLACE FUNCTION public.finance_expense_filtered_totals(
  target_month date DEFAULT NULL,
  target_payment_source text DEFAULT NULL,
  target_category text DEFAULT NULL,
  vendor_search text DEFAULT NULL
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
  ) FROM filtered), 0)
);
$$;

REVOKE ALL ON FUNCTION public.finance_expense_filtered_totals(date, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_expense_filtered_totals(date, text, text, text)
  TO service_role;

COMMIT;
