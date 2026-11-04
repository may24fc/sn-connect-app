\set ON_ERROR_STOP on

-- Local-only. Replace the migration marker below with the co-lead migration
-- before running this file; all fixture and policy changes are rolled back.
BEGIN;

INSERT INTO public.departments (id, name) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Co-lead test department'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Co-lead outside department');

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'primary@co-lead.test'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'colead@co-lead.test'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'member@co-lead.test'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'outside@co-lead.test');

UPDATE public.users
SET department_id = 'bbbbbbbb-0000-4000-8000-000000000001'
WHERE id IN (
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000002',
  'aaaaaaaa-0000-4000-8000-000000000003'
);
UPDATE public.users
SET department_id = 'bbbbbbbb-0000-4000-8000-000000000002'
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000004';

INSERT INTO public.department_leads (department_id, user_id, appointed_by) VALUES
  (
    'bbbbbbbb-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000002',
    'aaaaaaaa-0000-4000-8000-000000000001'
  );

INSERT INTO public.projects (id, name, lead_user_id, created_by, start_date, target_end_date)
VALUES (
  'cccccccc-0000-4000-8000-000000000001',
  'Project co-lead RLS test',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  '2026-11-01',
  '2026-12-01'
);
INSERT INTO public.project_contributors (project_id, user_id, role) VALUES
  (
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000002',
    'lead'
  ),
  (
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000003',
    'contributor'
  );

-- APPLY_PROJECT_CO_LEADS_MIGRATION

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_contributors
    WHERE project_id = 'cccccccc-0000-4000-8000-000000000001'
      AND user_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      AND role = 'lead'
  ) THEN RAISE EXCEPTION 'Existing primary lead was not backfilled'; END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

DO $$
DECLARE affected integer;
BEGIN
  IF NOT public.user_leads_project(
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000002'
  ) THEN
    RAISE EXCEPTION 'Existing lead-role contributor did not receive co-lead access';
  END IF;
  IF public.user_leads_project(
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000003'
  ) THEN
    RAISE EXCEPTION 'Ordinary contributor received lead access';
  END IF;

  UPDATE public.projects SET name = 'Updated by co-lead'
  WHERE id = 'cccccccc-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Co-lead could not update the project'; END IF;

  UPDATE public.project_contributors SET role = 'lead'
  WHERE project_id = 'cccccccc-0000-4000-8000-000000000001'
    AND user_id = 'aaaaaaaa-0000-4000-8000-000000000003';
  IF NOT public.user_leads_project(
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000003'
  ) THEN RAISE EXCEPTION 'Eligible promotion did not grant lead access'; END IF;

  UPDATE public.project_contributors SET role = 'contributor'
  WHERE project_id = 'cccccccc-0000-4000-8000-000000000001'
    AND user_id = 'aaaaaaaa-0000-4000-8000-000000000003';
  IF public.user_leads_project(
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000003'
  ) THEN RAISE EXCEPTION 'Demoted contributor retained lead access'; END IF;

  BEGIN
    INSERT INTO public.project_contributors (project_id, user_id, role)
    VALUES (
      'cccccccc-0000-4000-8000-000000000001',
      'aaaaaaaa-0000-4000-8000-000000000004',
      'lead'
    );
    RAISE EXCEPTION 'Outside-department lead grant unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.projects
    SET lead_user_id = 'aaaaaaaa-0000-4000-8000-000000000004'
    WHERE id = 'cccccccc-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Direct primary lead change unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.project_contributors
    WHERE project_id = 'cccccccc-0000-4000-8000-000000000001'
      AND user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Primary lead was removed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;
UPDATE public.users SET status = 'terminated'
WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';
SET LOCAL ROLE authenticated;
DO $$
DECLARE affected integer;
BEGIN
  IF public.user_leads_project(
    'cccccccc-0000-4000-8000-000000000001',
    'aaaaaaaa-0000-4000-8000-000000000002'
  ) THEN RAISE EXCEPTION 'Terminated co-lead retained management access'; END IF;
  UPDATE public.projects SET name = 'Forbidden update'
  WHERE id = 'cccccccc-0000-4000-8000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Terminated co-lead updated the project'; END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
UPDATE public.projects
SET lead_user_id = 'aaaaaaaa-0000-4000-8000-000000000003'
WHERE id = 'cccccccc-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_contributors
    WHERE project_id = 'cccccccc-0000-4000-8000-000000000001'
      AND user_id = 'aaaaaaaa-0000-4000-8000-000000000003'
      AND role = 'lead'
  ) THEN RAISE EXCEPTION 'New primary lead was not promoted'; END IF;
END;
$$;

DELETE FROM public.projects WHERE id = 'cccccccc-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.project_contributors
    WHERE project_id = 'cccccccc-0000-4000-8000-000000000001'
  ) THEN RAISE EXCEPTION 'Project deletion did not cascade to contributors'; END IF;
END;
$$;

SELECT 'Project co-lead RLS checks passed' AS result;
ROLLBACK;
