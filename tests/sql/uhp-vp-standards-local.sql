\set ON_ERROR_STOP on

BEGIN;

SELECT
  (SELECT id FROM public.users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS admin_id,
  (SELECT id FROM public.users WHERE role = 'employee' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS other_id,
  (SELECT id FROM public.users WHERE role = 'associate' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS associate_id
\gset

DELETE FROM public.uhp_vp_standard_targets WHERE category = 'personal';
INSERT INTO public.uhp_vp_month_targets (reporting_month, category, target_vp, forecast_vp)
VALUES ('2026-11-01', 'personal', 500, 400)
ON CONFLICT (reporting_month, category) DO UPDATE SET target_vp = 500, forecast_vp = 400;

INSERT INTO public.uhp_vp_standard_targets (category, target_vp, forecast_vp, updated_by)
SELECT category, target_vp, forecast_vp, updated_by
FROM public.uhp_vp_month_targets
WHERE reporting_month = '2026-11-01' AND category = 'personal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.uhp_vp_standard_targets
    WHERE category = 'personal' AND target_vp = 500
      AND forecast_vp = 400 AND effective_from = '2026-11-01'
  ) THEN
    RAISE EXCEPTION 'November seed did not preserve the saved values';
  END IF;
END$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
UPDATE public.uhp_vp_standard_targets SET target_vp = 600 WHERE category = 'personal';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.uhp_vp_standard_targets WHERE category = 'personal' AND target_vp = 600)
    OR NOT EXISTS (SELECT 1 FROM public.uhp_vp_month_targets WHERE reporting_month = '2026-11-01' AND category = 'personal' AND target_vp = 500)
  THEN
    RAISE EXCEPTION 'Admin edit failed or overwrote the saved November target';
  END IF;
END$$;
RESET ROLE;

UPDATE public.uhp_access_grants SET deleted_at = now()
WHERE user_id = :'other_id' AND module = 'volume_points' AND deleted_at IS NULL;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.uhp_vp_standard_targets) THEN
    RAISE EXCEPTION 'Ungranted employee can read standards';
  END IF;
  BEGIN
    INSERT INTO public.uhp_vp_standard_targets (category, target_vp) VALUES ('personal', 999)
    ON CONFLICT (category) DO UPDATE SET target_vp = 999;
    RAISE EXCEPTION 'Ungranted employee can write standards';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END$$;
RESET ROLE;

INSERT INTO public.uhp_access_grants (user_id, module)
VALUES (:'associate_id', 'volume_points')
ON CONFLICT (user_id, module) WHERE deleted_at IS NULL DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'associate_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  UPDATE public.uhp_vp_standard_targets SET target_vp = 650 WHERE category = 'personal';
  IF NOT FOUND THEN RAISE EXCEPTION 'Granted associate cannot edit standards'; END IF;
END$$;
RESET ROLE;

UPDATE public.users
SET role = 'workspace_user', account_kind = 'workspace', status = 'active',
    account_purpose = 'Local VP standards RLS probe', department_id = NULL, division_id = NULL
WHERE id = :'other_id';
INSERT INTO public.workspace_access_grants (user_id, workspace, access_level)
VALUES (:'other_id', 'uhp', 'read')
ON CONFLICT (user_id, workspace) WHERE deleted_at IS NULL DO UPDATE SET access_level = 'read';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.uhp_vp_standard_targets WHERE category = 'personal') THEN
    RAISE EXCEPTION 'Read-only UHP workspace user cannot read standards';
  END IF;
  UPDATE public.uhp_vp_standard_targets SET target_vp = 999 WHERE category = 'personal';
  IF FOUND THEN RAISE EXCEPTION 'Read-only workspace user can edit standards'; END IF;
END$$;
RESET ROLE;

UPDATE public.workspace_access_grants SET access_level = 'write'
WHERE user_id = :'other_id' AND workspace = 'uhp' AND deleted_at IS NULL;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  UPDATE public.uhp_vp_standard_targets SET target_vp = 700 WHERE category = 'personal';
  IF NOT FOUND THEN RAISE EXCEPTION 'Write-enabled workspace user cannot edit standards'; END IF;
END$$;
RESET ROLE;

ROLLBACK;
