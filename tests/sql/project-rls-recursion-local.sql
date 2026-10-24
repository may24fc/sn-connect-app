\set ON_ERROR_STOP on

-- Local-only validation for 20261025000003_break_project_policy_recursion.sql.
-- Run: psql "postgresql://postgres:postgres@127.0.0.1:55322/postgres" -f tests/sql/project-rls-recursion-local.sql
-- Everything runs in one transaction and is rolled back.

BEGIN;

SELECT
  (SELECT id FROM public.users WHERE role = 'employee' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS lead_id,
  (SELECT id FROM public.users WHERE role = 'associate' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS member_id,
  (SELECT id FROM public.users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS admin_id
\gset

INSERT INTO public.projects (id, name, lead_user_id, start_date, target_end_date, created_by)
VALUES ('dddddddd-0000-4000-8000-000000000001', 'RLS recursion probe', :'lead_id', '2026-10-01', '2026-12-31', :'lead_id');

SET LOCAL ROLE authenticated;

-- 1. The lead reads the project and related tables without recursion and can add a contributor.
SELECT set_config('request.jwt.claims', json_build_object('sub', :'lead_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = 'dddddddd-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Lead cannot read their project';
  END IF;
  PERFORM count(*) FROM public.project_contributors;
  PERFORM count(*) FROM public.project_documentations;
END$$;
SELECT set_config('test.member_id', :'member_id', true);
INSERT INTO public.project_contributors (project_id, user_id)
VALUES ('dddddddd-0000-4000-8000-000000000001', current_setting('test.member_id')::uuid);

-- 2. The contributor sees the project but cannot add contributors.
SELECT set_config('request.jwt.claims', json_build_object('sub', :'member_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = 'dddddddd-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Contributor cannot read the project';
  END IF;

  BEGIN
    INSERT INTO public.project_contributors (project_id, user_id)
    VALUES ('dddddddd-0000-4000-8000-000000000001', auth.uid());
    RAISE EXCEPTION 'Non-lead contributor added a contributor';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN unique_violation THEN RAISE EXCEPTION 'Non-lead insert reached the table (unique violation)';
  END;
END$$;

-- 3. A user with no relationship to the project sees nothing.
RESET ROLE;
DELETE FROM public.project_contributors WHERE project_id = 'dddddddd-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = 'dddddddd-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Removed contributor can still read the project';
  END IF;
END$$;

-- 4. Admins still see every project.
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = 'dddddddd-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Admin cannot read the project';
  END IF;
END$$;

-- 5. anon cannot call the helpers.
RESET ROLE;
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.user_is_project_contributor(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.user_leads_project(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute the project membership helpers';
  END IF;
END$$;

SELECT 'project RLS recursion checks passed' AS result;

ROLLBACK;
