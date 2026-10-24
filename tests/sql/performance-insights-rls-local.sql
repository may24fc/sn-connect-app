\set ON_ERROR_STOP on

-- Local-only RLS validation for performance insight conversations.
-- Run: psql "postgresql://postgres:postgres@127.0.0.1:55322/postgres" -f tests/sql/performance-insights-rls-local.sql
-- Everything runs in one transaction and is rolled back, including role changes.

BEGIN;

SELECT
  (SELECT id FROM public.users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS admin_id,
  (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS super_id,
  (SELECT id FROM public.users WHERE role = 'employee' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS other_id,
  (SELECT id FROM public.users WHERE role = 'associate' AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS associate_id
\gset

SELECT set_config('test.admin_id', :'admin_id', true);
SELECT set_config('test.super_id', :'super_id', true);
SELECT set_config('test.conversation_id', 'aaaaaaaa-0000-4000-8000-000000000001', true);

-- 0. Reflections RLS (20261025000002): admins read other users' rows; employees do not.
INSERT INTO public.five_percent_reflections (
  id, user_id, month_key, full_name, department_role,
  work_feelings, work_headline, work_significance, work_rank, work_action,
  family_feelings, family_headline, family_significance, family_rank, family_action,
  personal_feelings, personal_headline, personal_significance, personal_rank, personal_action,
  deep_dive_parking_lot, exploration_topics
) VALUES (
  'bbbbbbbb-0000-4000-8000-000000000001', :'associate_id', '2026-10', 'RLS Probe', 'Ops',
  'f', 'h', 's', 5, 'a', 'f', 'h', 's', 5, 'a', 'f', 'h', 's', 5, 'a', 'p', 'e'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.five_percent_reflections WHERE id = 'bbbbbbbb-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Admin cannot read another user''s reflection through RLS';
  END IF;
END$$;

SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.five_percent_reflections WHERE id = 'bbbbbbbb-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Employee can read another user''s reflection';
  END IF;
END$$;
RESET ROLE;

-- 1. An admin can create and read their own conversation and messages.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);

INSERT INTO public.performance_insight_conversations (id, user_id, evaluation_kind, period_key)
VALUES (current_setting('test.conversation_id')::uuid, auth.uid(), 'five_percent', '2026-10');
INSERT INTO public.performance_insight_messages (conversation_id, user_id, role, content)
VALUES (current_setting('test.conversation_id')::uuid, auth.uid(), 'user', 'Who is pending?');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.performance_insight_messages) <> 1 THEN
    RAISE EXCEPTION 'Owner cannot read their own insight message';
  END IF;
END$$;

-- 2. Messages are append-only: deletes and updates match no rows.
DO $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.performance_insight_messages;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'Insight messages were deletable';
  END IF;
  UPDATE public.performance_insight_messages SET content = 'edited';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'Insight messages were editable';
  END IF;
END$$;

-- 3. Another performance admin (super_admin) cannot read, spoof, or append to it.
SELECT set_config('request.jwt.claims', json_build_object('sub', :'super_id', 'role', 'authenticated')::text, true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.performance_insight_conversations)
     OR EXISTS (SELECT 1 FROM public.performance_insight_messages) THEN
    RAISE EXCEPTION 'Another admin can read insight conversations they do not own';
  END IF;

  BEGIN
    INSERT INTO public.performance_insight_messages (conversation_id, user_id, role, content)
    VALUES (current_setting('test.conversation_id')::uuid, auth.uid(), 'user', 'Injected');
    RAISE EXCEPTION 'Message insert into another admin''s conversation succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.performance_insight_conversations (user_id, evaluation_kind, period_key)
    VALUES (current_setting('test.admin_id')::uuid, 'five_percent', '2026-10');
    RAISE EXCEPTION 'Conversation insert for another user succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END$$;

-- 3b. The super_admin can own their own conversation and sees only that one.
INSERT INTO public.performance_insight_conversations (user_id, evaluation_kind, period_key, months_back)
VALUES (auth.uid(), 'five_percent', '2026-09', 0);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.performance_insight_conversations) <> 1
     OR EXISTS (
       SELECT 1 FROM public.performance_insight_conversations
       WHERE id = current_setting('test.conversation_id')::uuid
     ) THEN
    RAISE EXCEPTION 'Super admin should see exactly their own conversation';
  END IF;
END$$;

-- 4. Roles outside admin/super_admin cannot create conversations (employee, then associate).
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.performance_insight_conversations (user_id, evaluation_kind, period_key)
    VALUES (auth.uid(), 'five_percent', '2026-10');
    RAISE EXCEPTION 'Employee account created an insight conversation';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END$$;

SELECT set_config('request.jwt.claims', json_build_object('sub', :'associate_id', 'role', 'authenticated')::text, true);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.performance_insight_conversations (user_id, evaluation_kind, period_key)
    VALUES (auth.uid(), 'five_percent', '2026-10');
    RAISE EXCEPTION 'Associate account created an insight conversation';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END$$;

-- 5. Demoting the owner removes access immediately.
RESET ROLE;
UPDATE public.users SET role = 'employee' WHERE id = :'admin_id';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.performance_insight_conversations)
     OR EXISTS (SELECT 1 FROM public.performance_insight_messages) THEN
    RAISE EXCEPTION 'Demoted owner can still read insight conversations';
  END IF;
END$$;

-- 6. Restored owner can soft-delete through RLS; messages then disappear.
RESET ROLE;
UPDATE public.users SET role = 'admin' WHERE id = :'admin_id';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.performance_insight_conversations
  SET deleted_at = now()
  WHERE id = current_setting('test.conversation_id')::uuid AND deleted_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Owner could not soft-delete their conversation (rows: %)', affected;
  END IF;

  IF EXISTS (SELECT 1 FROM public.performance_insight_messages) THEN
    RAISE EXCEPTION 'Messages remain visible after their conversation was deleted';
  END IF;

  UPDATE public.performance_insight_conversations SET title = 'Revived'
  WHERE id = current_setting('test.conversation_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'A deleted conversation was still editable';
  END IF;
END$$;

RESET ROLE;

SELECT 'performance insights RLS checks passed' AS result;

ROLLBACK;
