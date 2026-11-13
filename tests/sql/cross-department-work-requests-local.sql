\set ON_ERROR_STOP on

-- Local-only transaction test. Requires 20261113000001 and always rolls back.
BEGIN;

INSERT INTO public.departments (id, name) VALUES
  ('bbbbbbbb-1313-4313-8313-000000000001', 'Request source test'),
  ('bbbbbbbb-1313-4313-8313-000000000002', 'Request target test');
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-1313-4313-8313-000000000001', 'requester@department-request.test'),
  ('aaaaaaaa-1313-4313-8313-000000000002', 'lead@department-request.test'),
  ('aaaaaaaa-1313-4313-8313-000000000003', 'member@department-request.test');
UPDATE public.users
SET status = 'active', role = 'employee', department_id = CASE
  WHEN id = 'aaaaaaaa-1313-4313-8313-000000000001'
    THEN 'bbbbbbbb-1313-4313-8313-000000000001'::uuid
  ELSE 'bbbbbbbb-1313-4313-8313-000000000002'::uuid
END
WHERE id::text LIKE 'aaaaaaaa-1313-4313-8313-%';
INSERT INTO public.department_leads (department_id, user_id, appointed_by) VALUES (
  'bbbbbbbb-1313-4313-8313-000000000002',
  'aaaaaaaa-1313-4313-8313-000000000002',
  'aaaaaaaa-1313-4313-8313-000000000002'
);

DO $$
#variable_conflict use_variable
DECLARE
  result jsonb;
  request_id uuid;
  task_id uuid;
BEGIN
  result := public.create_cross_department_work_request(
    'aaaaaaaa-1313-4313-8313-000000000001',
    '{"targetDepartmentId":"bbbbbbbb-1313-4313-8313-000000000002","title":"Validate account access","priority":"high","dueDate":"2026-11-30"}'::jsonb
  );
  request_id := (result -> 'data' ->> 'id')::uuid;
  IF request_id IS NULL OR EXISTS (
    SELECT 1 FROM public.tasks WHERE title = 'Validate account access'
  ) THEN RAISE EXCEPTION 'Pending request created execution work'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = 'aaaaaaaa-1313-4313-8313-000000000002'
      AND metadata ->> 'workRequestId' = request_id::text
  ) THEN RAISE EXCEPTION 'Target lead was not notified'; END IF;

  result := public.respond_cross_department_work_request(
    request_id, 'aaaaaaaa-1313-4313-8313-000000000001', 'approve',
    'aaaaaaaa-1313-4313-8313-000000000003', NULL
  );
  IF result ->> 'error' <> 'self_review' THEN
    RAISE EXCEPTION 'Requester approved their own request';
  END IF;

  result := public.respond_cross_department_work_request(
    request_id, 'aaaaaaaa-1313-4313-8313-000000000002', 'approve',
    'aaaaaaaa-1313-4313-8313-000000000003', 'Capacity confirmed'
  );
  task_id := (result -> 'data' ->> 'created_task_id')::uuid;
  IF task_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = task_id
      AND assigned_to = 'aaaaaaaa-1313-4313-8313-000000000003'
      AND assigned_by = 'aaaaaaaa-1313-4313-8313-000000000002'
      AND created_by = 'aaaaaaaa-1313-4313-8313-000000000001'
      AND status = 'pending'
  ) THEN RAISE EXCEPTION 'Approval did not create the expected task'; END IF;

  result := public.respond_cross_department_work_request(
    request_id, 'aaaaaaaa-1313-4313-8313-000000000002', 'approve',
    'aaaaaaaa-1313-4313-8313-000000000003', NULL
  );
  IF result ->> 'error' <> 'not_pending' THEN
    RAISE EXCEPTION 'Repeated approval was not rejected';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF has_function_privilege(
    'authenticated', 'public.respond_cross_department_work_request(uuid,uuid,text,uuid,text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Authenticated users can call the approval function directly';
  END IF;
END;
$$;
RESET ROLE;

DO $$
#variable_conflict use_variable
DECLARE
  result jsonb;
  project_id uuid;
BEGIN
  result := public.create_project_with_leads(
    'aaaaaaaa-1313-4313-8313-000000000001',
    '{
      "name":"Contributor role test",
      "leadUserId":"aaaaaaaa-1313-4313-8313-000000000001",
      "coLeadUserIds":[],
      "contributorUserIds":["aaaaaaaa-1313-4313-8313-000000000003"],
      "startDate":"2026-11-13",
      "targetEndDate":"2026-12-13",
      "status":"active"
    }'::jsonb
  );
  project_id := (result -> 'data' ->> 'id')::uuid;
  IF result ->> 'pendingInvitationCount' <> '1' OR NOT EXISTS (
    SELECT 1 FROM public.project_member_invitations invitation
    WHERE invitation.project_id = project_id
      AND invitation.invitee_id = 'aaaaaaaa-1313-4313-8313-000000000003'
      AND invitation.role = 'contributor'
      AND invitation.status = 'pending'
  ) THEN RAISE EXCEPTION 'Project contributor was promoted or not invited correctly'; END IF;
END;
$$;

ROLLBACK;
