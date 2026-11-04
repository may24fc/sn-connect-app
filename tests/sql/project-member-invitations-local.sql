\set ON_ERROR_STOP on

-- Local-only: replace the migration marker with both new migrations. Everything rolls back.
BEGIN;

INSERT INTO public.departments (id, name) VALUES
  ('bbbbbbbb-1111-4111-8111-000000000001', 'Invitation test department'),
  ('bbbbbbbb-1111-4111-8111-000000000002', 'Invitation outside department');
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-1111-4111-8111-000000000001', 'admin@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000002', 'managed@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000003', 'outside1@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000004', 'outside2@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000005', 'outside3@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000006', 'outside4@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000007', 'outside5@project-invite.test'),
  ('aaaaaaaa-1111-4111-8111-000000000008', 'outside6@project-invite.test');
UPDATE public.users
SET status = 'active',
    role = CASE WHEN id = 'aaaaaaaa-1111-4111-8111-000000000001'
      THEN 'admin'::public.user_role ELSE 'employee'::public.user_role END,
    department_id = CASE WHEN id IN (
      'aaaaaaaa-1111-4111-8111-000000000001',
      'aaaaaaaa-1111-4111-8111-000000000002'
    ) THEN 'bbbbbbbb-1111-4111-8111-000000000001'::uuid
      ELSE 'bbbbbbbb-1111-4111-8111-000000000002'::uuid END
WHERE id::text LIKE 'aaaaaaaa-1111-4111-8111-%';
INSERT INTO public.department_leads (department_id, user_id, appointed_by) VALUES (
  'bbbbbbbb-1111-4111-8111-000000000001',
  'aaaaaaaa-1111-4111-8111-000000000001',
  'aaaaaaaa-1111-4111-8111-000000000001'
);

-- APPLY_PROJECT_MEMBER_INVITATION_MIGRATIONS

SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
CREATE TEMP TABLE invite_test_state (project_id uuid NOT NULL);
GRANT SELECT ON invite_test_state TO authenticated;
DO $$
#variable_conflict use_variable
DECLARE
  result jsonb;
  project_id uuid;
  invitation_id uuid;
BEGIN
  result := public.create_project_with_leads(
    'aaaaaaaa-1111-4111-8111-000000000001',
    '{
      "name": "Invitation test project",
      "leadUserId": "aaaaaaaa-1111-4111-8111-000000000003",
      "coLeadUserIds": ["aaaaaaaa-1111-4111-8111-000000000002"],
      "startDate": "2026-11-01",
      "targetEndDate": "2026-12-01",
      "status": "active"
    }'::jsonb
  );
  project_id := (result -> 'data' ->> 'id')::uuid;
  INSERT INTO invite_test_state VALUES (project_id);
  IF result ->> 'pendingPrimary' <> 'true' OR result ->> 'pendingInvitationCount' <> '1' THEN
    RAISE EXCEPTION 'Creation did not report the pending primary invitation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND p.lead_user_id = 'aaaaaaaa-1111-4111-8111-000000000001'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000002' AND c.role = 'lead'
  ) OR EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000003'
  ) THEN RAISE EXCEPTION 'Project creation granted incorrect lead membership'; END IF;
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000003';
  IF invitation_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = 'aaaaaaaa-1111-4111-8111-000000000003'
      AND n.link = '/projects/invitations'
      AND n.metadata ->> 'invitationId' = invitation_id::text
  ) THEN RAISE EXCEPTION 'Invitation notification was not persisted'; END IF;
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000004', 'accept'
  );
  IF result ->> 'error' <> 'forbidden' THEN RAISE EXCEPTION 'Wrong recipient could respond'; END IF;
  IF public.user_can_access_project(project_id, 'aaaaaaaa-1111-4111-8111-000000000003') THEN
    RAISE EXCEPTION 'Pending invitation grants project access';
  END IF;
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000003', 'decline'
  );
  IF result ->> 'status' <> 'declined' OR EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000003'
  ) THEN RAISE EXCEPTION 'Declined invitation granted membership'; END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-1111-4111-8111-000000000001","role":"authenticated"}', true);
DO $$
#variable_conflict use_variable
DECLARE project_id uuid := (SELECT s.project_id FROM invite_test_state s);
BEGIN
  BEGIN
    INSERT INTO public.project_contributors (project_id, user_id, role)
    VALUES (project_id, 'aaaaaaaa-1111-4111-8111-000000000004', 'contributor');
    RAISE EXCEPTION 'Admin directly granted an out-of-scope membership';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.projects SET lead_user_id = 'aaaaaaaa-1111-4111-8111-000000000004'
    WHERE id = project_id;
    RAISE EXCEPTION 'Admin directly changed the primary lead';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege(
    'authenticated', 'public.respond_project_member_invitation(uuid,uuid,text)', 'EXECUTE'
  ) OR has_table_privilege('authenticated', 'public.project_member_invitations', 'INSERT')
  THEN RAISE EXCEPTION 'Authenticated users can directly modify invitation state'; END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

DO $$
#variable_conflict use_variable
DECLARE
  project_id uuid := (SELECT s.project_id FROM invite_test_state s);
  invitation_id uuid;
  result jsonb;
BEGIN
  result := public.assign_project_member(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    'aaaaaaaa-1111-4111-8111-000000000004', 'contributor'
  );
  IF result ->> 'error' <> 'invitation_required' THEN
    RAISE EXCEPTION 'Admin bypassed contributor invitation';
  END IF;
  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000003","role":"lead","makePrimary":true}]'
  );
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000003'
    AND i.status = 'pending';
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000003', 'accept'
  );
  IF result ->> 'primaryChanged' <> 'true' OR NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND p.lead_user_id = 'aaaaaaaa-1111-4111-8111-000000000003'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000003' AND c.role = 'lead'
  ) THEN RAISE EXCEPTION 'Accepting primary invitation did not transfer leadership'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_departments d WHERE d.project_id = project_id
      AND d.department_id = 'bbbbbbbb-1111-4111-8111-000000000002'
  ) THEN RAISE EXCEPTION 'Accepting activated the invitee department'; END IF;
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000003', 'accept'
  );
  IF result ->> 'error' <> 'not_pending' THEN RAISE EXCEPTION 'Repeated response succeeded'; END IF;

  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000004","role":"lead","makePrimary":true}]'
  );
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000004'
    AND i.status = 'pending';
  UPDATE public.projects SET lead_user_id = 'aaaaaaaa-1111-4111-8111-000000000002'
  WHERE id = project_id;
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000004', 'accept'
  );
  IF result ->> 'primaryChanged' <> 'false' OR NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id
      AND p.lead_user_id = 'aaaaaaaa-1111-4111-8111-000000000002'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000004' AND c.role = 'lead'
  ) THEN RAISE EXCEPTION 'Stale primary invitation overwrote a newer primary'; END IF;

  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000005","role":"contributor"}]'
  );
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000005'
    AND i.status = 'pending';
  BEGIN
    PERFORM public.create_project_member_invitations(
      project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
      '[{"userId":"aaaaaaaa-1111-4111-8111-000000000005","role":"contributor"}]'
    );
    RAISE EXCEPTION 'Duplicate pending invitation succeeded';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  result := public.cancel_project_member_invitation(
    project_id, invitation_id, 'aaaaaaaa-1111-4111-8111-000000000001'
  );
  IF result ->> 'ok' <> 'true' THEN RAISE EXCEPTION 'Manager could not cancel invitation'; END IF;
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000005', 'accept'
  );
  IF result ->> 'error' <> 'not_pending' THEN RAISE EXCEPTION 'Cancelled invitation was accepted'; END IF;

  INSERT INTO public.project_contributors (project_id, user_id, role)
  VALUES (project_id, 'aaaaaaaa-1111-4111-8111-000000000006', 'contributor');
  result := public.assign_project_member(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    'aaaaaaaa-1111-4111-8111-000000000006', 'lead'
  );
  IF result ->> 'error' <> 'invitation_required' THEN
    RAISE EXCEPTION 'Existing outside contributor was promoted without consent';
  END IF;
  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000006","role":"lead"}]'
  );
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000006'
    AND i.status = 'pending';
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000006', 'decline'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000006' AND c.role = 'contributor'
  ) THEN RAISE EXCEPTION 'Declining promotion changed existing membership'; END IF;
  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000006","role":"lead"}]'
  );
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000006'
    AND i.status = 'pending';
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000006', 'accept'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000006' AND c.role = 'lead'
  ) THEN RAISE EXCEPTION 'Accepted promotion did not grant lead access'; END IF;

  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000008","role":"contributor"}]'
  );
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000008'
    AND i.status = 'pending';
  UPDATE public.users SET status = 'terminated'
  WHERE id = 'aaaaaaaa-1111-4111-8111-000000000008';
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000008', 'accept'
  );
  IF result ->> 'error' <> 'inactive' OR EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000008'
  ) THEN RAISE EXCEPTION 'Inactive invitee accepted membership'; END IF;

  BEGIN
    INSERT INTO public.tasks (title, assigned_to, assigned_by, project_id)
    VALUES (
      'Outside project task', 'aaaaaaaa-1111-4111-8111-000000000007',
      'aaaaaaaa-1111-4111-8111-000000000001', project_id
    );
    RAISE EXCEPTION 'Project task bypassed invitation';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;

DO $$
#variable_conflict use_variable
DECLARE
  project_id uuid := (SELECT s.project_id FROM invite_test_state s);
  result jsonb;
BEGIN
  INSERT INTO public.project_contributors (project_id, user_id, role)
  VALUES (project_id, 'aaaaaaaa-1111-4111-8111-000000000005', 'contributor');
  PERFORM public.create_project_member_invitations(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    '[{"userId":"aaaaaaaa-1111-4111-8111-000000000005","role":"lead"},
      {"userId":"aaaaaaaa-1111-4111-8111-000000000007","role":"contributor"}]'
  );
  BEGIN
    INSERT INTO public.tasks (title, assigned_to, assigned_by, project_id)
    VALUES (
      'Pending project task', 'aaaaaaaa-1111-4111-8111-000000000007',
      'aaaaaaaa-1111-4111-8111-000000000001', project_id
    );
    RAISE EXCEPTION 'Pending invitee received a project task before acceptance';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  result := public.set_project_supervisor(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    'aaaaaaaa-1111-4111-8111-000000000007'
  );
  IF result ->> 'error' <> 'invite_lead_first' THEN
    RAISE EXCEPTION 'Out-of-scope pending invitee became supervisor';
  END IF;
  result := public.set_project_supervisor(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    'aaaaaaaa-1111-4111-8111-000000000006'
  );
  IF result ->> 'ok' <> 'true' THEN
    RAISE EXCEPTION 'Accepted project lead could not become supervisor';
  END IF;

  UPDATE public.users SET status = 'terminated'
  WHERE id IN (
    'aaaaaaaa-1111-4111-8111-000000000002',
    'aaaaaaaa-1111-4111-8111-000000000006'
  );
  IF public.user_leads_project(project_id, 'aaaaaaaa-1111-4111-8111-000000000002')
    OR public.user_leads_project(project_id, 'aaaaaaaa-1111-4111-8111-000000000006')
  THEN RAISE EXCEPTION 'Inactive primary lead or supervisor retained lead access'; END IF;
  UPDATE public.users SET status = 'active'
  WHERE id IN (
    'aaaaaaaa-1111-4111-8111-000000000002',
    'aaaaaaaa-1111-4111-8111-000000000006'
  );
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-1111-4111-8111-000000000001","role":"authenticated"}', true);
DO $$
#variable_conflict use_variable
DECLARE project_id uuid := (SELECT s.project_id FROM invite_test_state s);
BEGIN
  BEGIN
    UPDATE public.project_contributors c SET role = 'lead'
    WHERE c.project_id = project_id AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000005';
    RAISE EXCEPTION 'Pending promotion bypassed consent through direct update';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.project_contributors c
    WHERE c.project_id = project_id AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000005';
    RAISE EXCEPTION 'Pending invitation survived a direct membership removal';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

DO $$
#variable_conflict use_variable
DECLARE
  project_id uuid := (SELECT s.project_id FROM invite_test_state s);
  invitation_id uuid;
  result jsonb;
BEGIN
  SELECT i.id INTO invitation_id FROM public.project_member_invitations i
  WHERE i.project_id = project_id AND i.invitee_id = 'aaaaaaaa-1111-4111-8111-000000000005'
    AND i.status = 'pending';
  result := public.remove_project_member(
    project_id, 'aaaaaaaa-1111-4111-8111-000000000001',
    'aaaaaaaa-1111-4111-8111-000000000005'
  );
  IF result ->> 'cancelledInvitation' <> 'true' OR EXISTS (
    SELECT 1 FROM public.project_contributors c WHERE c.project_id = project_id
      AND c.user_id = 'aaaaaaaa-1111-4111-8111-000000000005'
  ) THEN RAISE EXCEPTION 'Member removal did not cancel its pending promotion'; END IF;
  result := public.respond_project_member_invitation(
    invitation_id, 'aaaaaaaa-1111-4111-8111-000000000005', 'accept'
  );
  IF result ->> 'error' <> 'not_pending' THEN
    RAISE EXCEPTION 'Removed member accepted a cancelled promotion';
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.reject_test_invitation_notification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id = 'aaaaaaaa-1111-4111-8111-000000000007' THEN
    RAISE EXCEPTION 'Simulated notification failure';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reject_test_invitation_notification
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_invitation_notification();
DO $$
BEGIN
  BEGIN
    PERFORM public.create_project_with_leads(
      'aaaaaaaa-1111-4111-8111-000000000001',
      '{
        "name":"Notification failure project",
        "leadUserId":"aaaaaaaa-1111-4111-8111-000000000007",
        "coLeadUserIds":[],
        "startDate":"2026-11-01",
        "targetEndDate":"2026-12-01",
        "status":"active"
      }'::jsonb
    );
    RAISE EXCEPTION 'Project creation succeeded despite notification failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Simulated notification failure' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.projects WHERE name = 'Notification failure project') THEN
    RAISE EXCEPTION 'Notification failure left a partial project';
  END IF;
END;
$$;

ROLLBACK;
