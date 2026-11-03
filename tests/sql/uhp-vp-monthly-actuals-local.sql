\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    (VALUES
      ('2026-01-01'::date, 1319.10), ('2026-02-01'::date, 2224.32),
      ('2026-03-01'::date, 1852.22), ('2026-04-01'::date, 1249.93),
      ('2026-05-01'::date, 1355.10), ('2026-06-01'::date, 1231.94),
      ('2026-07-01'::date, 1348.74), ('2026-08-01'::date, 1993.29),
      ('2026-09-01'::date, 1496.58))
    EXCEPT SELECT reporting_month, volume_points FROM public.uhp_vp_month_actuals
  ) THEN
    RAISE EXCEPTION 'Imported monthly totals do not match the approved spreadsheet values';
  END IF;
END$$;

INSERT INTO public.uhp_vp_entries (reporting_month, category, member_name, order_date, volume_points)
VALUES ('2026-01-01', 'personal', 'Monthly actuals local probe', '2026-01-10', 100);

INSERT INTO public.uhp_vp_entries (reporting_month, category, member_name, order_date, volume_points)
SELECT '2098-01-01', 'personal', 'Monthly actuals local probe', '2098-01-10', 0.1
FROM generate_series(1, 1501);

INSERT INTO public.uhp_vp_entries (reporting_month, category, member_name, order_date, volume_points, deleted_at)
VALUES ('2098-01-01', 'personal', 'Deleted monthly actuals probe', '2098-01-10', 999, now());

INSERT INTO public.uhp_vp_month_actuals (reporting_month, volume_points, source)
VALUES ('2098-02-01', 0, 'Local zero-total test');
INSERT INTO public.uhp_vp_entries (reporting_month, category, member_name, order_date, volume_points)
VALUES ('2098-02-01', 'personal', 'Monthly actuals local probe', '2098-02-10', 100);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.uhp_vp_monthly_actuals()
    WHERE reporting_month = '2026-01-01' AND volume_points = 1319.10 AND source = 'final'
  ) THEN RAISE EXCEPTION 'Final monthly total was double-counted with orders'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.uhp_vp_monthly_actuals()
    WHERE reporting_month = '2098-01-01' AND volume_points = 150.10 AND source = 'orders'
  ) THEN RAISE EXCEPTION 'Order aggregation truncated rows or included deleted entries'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.uhp_vp_monthly_actuals()
    WHERE reporting_month = '2098-02-01' AND volume_points = 0 AND source = 'final'
  ) THEN RAISE EXCEPTION 'Explicit final zero did not override orders'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.uhp_vp_monthly_actuals() WHERE reporting_month = '2098-03-01'
  ) THEN RAISE EXCEPTION 'An unreported month was fabricated'; END IF;
END$$;

SELECT
  (SELECT id FROM public.users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS admin_id,
  (SELECT id FROM public.users WHERE role = 'employee' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS other_id,
  (SELECT id FROM public.users WHERE role = 'associate' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS associate_id
\gset

UPDATE public.uhp_access_grants SET deleted_at = now()
WHERE user_id = :'other_id' AND module = 'volume_points' AND deleted_at IS NULL;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.uhp_vp_monthly_actuals()) THEN
    RAISE EXCEPTION 'Ungranted employee can read monthly actuals';
  END IF;
END$$;
RESET ROLE;

INSERT INTO public.uhp_access_grants (user_id, module)
VALUES (:'associate_id', 'volume_points')
ON CONFLICT (user_id, module) WHERE deleted_at IS NULL DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'associate_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.uhp_vp_monthly_actuals() WHERE reporting_month = '2026-01-01' AND volume_points = 1319.1) THEN
    RAISE EXCEPTION 'Granted associate cannot read final totals';
  END IF;
  UPDATE public.uhp_vp_month_actuals SET volume_points = 999 WHERE reporting_month = '2026-01-01';
  IF FOUND THEN RAISE EXCEPTION 'Authenticated users can overwrite imported final totals'; END IF;
END$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.uhp_vp_monthly_actuals() WHERE reporting_month = '2098-01-01' AND volume_points = 150.1) THEN
    RAISE EXCEPTION 'Admin cannot aggregate live orders';
  END IF;
END$$;
RESET ROLE;

ROLLBACK;
