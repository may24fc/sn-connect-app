BEGIN;

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
  )
  SELECT b.starts, b.ends,
    coalesce(sum(e.total_amount_aud),0),
    count(e.id) FILTER (WHERE e.total_amount_aud IS NOT NULL),
    count(e.id) FILTER (WHERE e.total_amount_aud IS NULL)
  FROM bucket_bounds b
  LEFT JOIN public.expense_entries e ON e.deleted_at IS NULL AND e.source_type = 'direct_payment'
    AND e.transaction_date >= b.starts AND e.transaction_date < b.ends
  WHERE b.starts < b.ends
  GROUP BY b.starts, b.ends
  ORDER BY b.starts;
END $$;
REVOKE ALL ON FUNCTION public.finance_spend_trend(date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_spend_trend(date, text) TO service_role;

COMMIT;
