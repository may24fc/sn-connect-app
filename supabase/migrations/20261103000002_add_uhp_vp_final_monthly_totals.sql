BEGIN;

CREATE TABLE public.uhp_vp_month_actuals (
  reporting_month date PRIMARY KEY
    CHECK (date_trunc('month', reporting_month)::date = reporting_month),
  volume_points numeric(12,2) NOT NULL CHECK (volume_points >= 0),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uhp_vp_month_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_vp_month_actuals FORCE ROW LEVEL SECURITY;

CREATE POLICY uhp_vp_month_actuals_read ON public.uhp_vp_month_actuals
  FOR SELECT TO authenticated
  USING (
    public.user_has_uhp_module_access(auth.uid(), 'volume_points')
    OR public.user_has_workspace_access(auth.uid(), 'uhp')
  );

INSERT INTO public.uhp_vp_month_actuals (reporting_month, volume_points, source)
VALUES
  ('2026-01-01', 1319.10, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-02-01', 2224.32, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-03-01', 1852.22, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-04-01', 1249.93, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-05-01', 1355.10, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-06-01', 1231.94, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-07-01', 1348.74, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-08-01', 1993.29, 'Herbalife House - Volume Points 2026 final totals'),
  ('2026-09-01', 1496.58, 'Herbalife House - Volume Points 2026 final totals');

CREATE FUNCTION public.uhp_vp_monthly_actuals()
RETURNS TABLE (
  reporting_month date,
  volume_points numeric,
  source text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH entry_totals AS (
    SELECT e.reporting_month, sum(e.volume_points) AS volume_points
    FROM public.uhp_vp_entries e
    WHERE e.deleted_at IS NULL
    GROUP BY e.reporting_month
  )
  SELECT
    coalesce(f.reporting_month, e.reporting_month),
    coalesce(f.volume_points, e.volume_points),
    CASE WHEN f.reporting_month IS NOT NULL THEN 'final' ELSE 'orders' END
  FROM public.uhp_vp_month_actuals f
  FULL JOIN entry_totals e ON e.reporting_month = f.reporting_month
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.uhp_vp_monthly_actuals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uhp_vp_monthly_actuals() TO authenticated, service_role;

COMMENT ON TABLE public.uhp_vp_month_actuals IS
  'Approved final monthly VP totals. These replace monthly order sums, never add to them; no category or member detail is invented.';
COMMENT ON FUNCTION public.uhp_vp_monthly_actuals() IS
  'Monthly source of truth for VP actuals: approved final totals take precedence over non-deleted orders.';

COMMIT;
