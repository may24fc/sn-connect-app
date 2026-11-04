CREATE TABLE public.project_member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.users(id),
  invited_by uuid NOT NULL REFERENCES public.users(id),
  role public.project_contributor_role NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  make_primary boolean NOT NULL DEFAULT false,
  expected_primary_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (NOT make_primary OR role = 'lead')
);

CREATE UNIQUE INDEX project_member_invitations_pending_unique
  ON public.project_member_invitations (project_id, invitee_id)
  WHERE status = 'pending';
CREATE INDEX project_member_invitations_invitee_pending
  ON public.project_member_invitations (invitee_id, created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.project_member_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_member_invitations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_member_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_member_invitations TO authenticated;
GRANT ALL ON public.project_member_invitations TO service_role;
CREATE POLICY project_member_invitations_read
  ON public.project_member_invitations FOR SELECT TO authenticated
  USING (
    invitee_id = auth.uid()
    OR invited_by = auth.uid()
    OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

CREATE FUNCTION public.user_can_directly_assign_project_member(p_actor uuid, p_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users actor
    JOIN public.users target ON target.id = p_target
    WHERE actor.id = p_actor
      AND actor.deleted_at IS NULL
      AND actor.status::text <> 'terminated'
      AND target.deleted_at IS NULL
      AND target.status::text <> 'terminated'
      AND (
        target.id = actor.id
        OR EXISTS (
          SELECT 1 FROM public.department_leads dl
          WHERE dl.user_id = actor.id
            AND dl.department_id = target.department_id
            AND dl.revoked_at IS NULL
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.user_can_directly_assign_project_member(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_directly_assign_project_member(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_can_assign_project_lead(p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.user_can_directly_assign_project_member(auth.uid(), p_target_user_id);
$$;

CREATE FUNCTION public.protect_project_contributor_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  granting_access boolean := false;
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'DELETE' THEN
      IF EXISTS (
        SELECT 1 FROM public.projects WHERE id = OLD.project_id AND deleted_at IS NULL
      ) AND EXISTS (
        SELECT 1 FROM public.project_member_invitations
        WHERE project_id = OLD.project_id AND invitee_id = OLD.user_id AND status = 'pending'
      ) THEN
        RAISE EXCEPTION 'Cancel the pending project invitation before removing this member'
          USING ERRCODE = '42501';
      END IF;
      RETURN OLD;
    END IF;
    IF TG_OP = 'INSERT' THEN
      granting_access := true;
    ELSIF TG_OP = 'UPDATE' THEN
      granting_access := NEW.role = 'lead' AND OLD.role <> 'lead';
    END IF;
    IF granting_access AND EXISTS (
      SELECT 1 FROM public.project_member_invitations
      WHERE project_id = NEW.project_id AND invitee_id = NEW.user_id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'This person has a pending project invitation' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT'
       AND NOT public.user_can_directly_assign_project_member(auth.uid(), NEW.user_id) THEN
      RAISE EXCEPTION 'This person must accept a project invitation first' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Project membership identity cannot be changed' USING ERRCODE = '42501';
      END IF;
      IF NEW.role = 'lead' AND OLD.role <> 'lead'
         AND NOT public.user_can_directly_assign_project_member(auth.uid(), NEW.user_id) THEN
        RAISE EXCEPTION 'This person must accept a project lead invitation first' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_contributors_protect_assignment
  BEFORE INSERT OR UPDATE OR DELETE ON public.project_contributors
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_contributor_assignment();
REVOKE ALL ON FUNCTION public.protect_project_contributor_assignment()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_project_management_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' AND (
      NEW.lead_user_id IS DISTINCT FROM auth.uid()
      OR (NEW.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM auth.uid())
      OR NEW.supervisor_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Project leadership changes must be made through the project API'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (
      NEW.lead_user_id IS DISTINCT FROM OLD.lead_user_id
      OR NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
    ) THEN
      RAISE EXCEPTION 'Project leadership changes must be made through the project API'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_protect_management_fields ON public.projects;
CREATE TRIGGER projects_protect_management_fields
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_management_fields();

CREATE OR REPLACE FUNCTION public.ensure_project_assignee_is_contributor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
BEGIN
  IF NEW.project_id IS NOT NULL AND NEW.assigned_to IS NOT NULL THEN
    actor_id := CASE WHEN auth.role() = 'authenticated' THEN auth.uid() ELSE NEW.assigned_by END;
    IF NOT EXISTS (
      SELECT 1 FROM public.project_contributors
      WHERE project_id = NEW.project_id AND user_id = NEW.assigned_to
    ) THEN
      IF EXISTS (
        SELECT 1 FROM public.project_member_invitations
        WHERE project_id = NEW.project_id AND invitee_id = NEW.assigned_to AND status = 'pending'
      ) THEN
        RAISE EXCEPTION 'This person must accept their pending project invitation before receiving a project task'
          USING ERRCODE = '42501';
      END IF;
      IF NOT public.user_can_directly_assign_project_member(actor_id, NEW.assigned_to) THEN
        RAISE EXCEPTION 'Invite this person to the project before assigning a project task'
          USING ERRCODE = '42501';
      END IF;
      INSERT INTO public.project_contributors(project_id, user_id, role)
      VALUES (NEW.project_id, NEW.assigned_to, 'contributor')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.user_can_manage_project_invites(p_project_id uuid, p_actor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.users actor ON actor.id = p_actor
    WHERE p.id = p_project_id
      AND p.deleted_at IS NULL
      AND actor.deleted_at IS NULL
      AND actor.status::text <> 'terminated'
      AND (
        actor.role::text IN ('admin', 'super_admin')
        OR p.created_by = p_actor
        OR public.user_leads_project(p.id, p_actor)
        OR EXISTS (
          SELECT 1
          FROM public.project_departments pd
          JOIN public.department_leads dl ON dl.department_id = pd.department_id
          WHERE pd.project_id = p.id
            AND pd.status = 'active'
            AND dl.user_id = p_actor
            AND dl.revoked_at IS NULL
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.user_can_manage_project_invites(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_project_invites(uuid, uuid) TO service_role;

CREATE FUNCTION public.create_project_member_invitations(
  p_project_id uuid,
  p_invited_by uuid,
  p_invitations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
  entry jsonb;
  invitation_id uuid;
  invitee uuid;
  invitation_role public.project_contributor_role;
  primary_requested boolean;
  primary_count integer := 0;
  result jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO project_row FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.user_can_manage_project_invites(p_project_id, p_invited_by) THEN
    RAISE EXCEPTION 'Project invitation access denied' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_invitations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid project invitations' USING ERRCODE = '22023';
  END IF;

  FOR entry IN SELECT value FROM jsonb_array_elements(p_invitations)
  LOOP
    invitee := (entry ->> 'userId')::uuid;
    invitation_role := (entry ->> 'role')::public.project_contributor_role;
    primary_requested := COALESCE((entry ->> 'makePrimary')::boolean, false);
    IF invitee IS NULL OR invitation_role IS NULL OR invitee = p_invited_by
       OR NOT EXISTS (
         SELECT 1 FROM public.users
         WHERE id = invitee AND deleted_at IS NULL AND status::text <> 'terminated'
       ) THEN
      RAISE EXCEPTION 'Project invitee must be an active account' USING ERRCODE = '23514';
    END IF;
    IF primary_requested THEN
      primary_count := primary_count + 1;
      IF primary_count > 1 OR invitation_role <> 'lead' THEN
        RAISE EXCEPTION 'Invalid primary lead invitation' USING ERRCODE = '22023';
      END IF;
      IF entry ->> 'expectedPrimaryId' IS NOT NULL
         AND (entry ->> 'expectedPrimaryId')::uuid IS DISTINCT FROM project_row.lead_user_id THEN
        RAISE EXCEPTION 'Primary project lead changed' USING ERRCODE = '40001';
      END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.project_contributors
      WHERE project_id = p_project_id AND user_id = invitee
        AND (invitation_role = 'contributor' OR (role = 'lead' AND NOT primary_requested))
    ) THEN
      RAISE EXCEPTION 'This person already has the requested project role' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.project_member_invitations (
      project_id, invitee_id, invited_by, role, make_primary, expected_primary_id
    ) VALUES (
      p_project_id, invitee, p_invited_by, invitation_role, primary_requested,
      CASE WHEN primary_requested THEN project_row.lead_user_id ELSE NULL END
    ) RETURNING id INTO invitation_id;

    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      invitee, 'project_assigned', 'Project invitation',
      format('You have been invited to join "%s" as a project %s. Accept or decline the invitation.',
        project_row.name, CASE WHEN invitation_role = 'lead' THEN 'lead' ELSE 'contributor' END),
      '/projects/invitations',
      jsonb_build_object('projectId', p_project_id, 'invitationId', invitation_id)
    );
    result := result || jsonb_build_array(jsonb_build_object('id', invitation_id, 'userId', invitee));
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_project_member_invitations(uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_member_invitations(uuid, uuid, jsonb)
  TO service_role;

CREATE FUNCTION public.create_project_with_leads(p_actor uuid, p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
  actor_row public.users%ROWTYPE;
  requested_primary uuid := (p_input ->> 'leadUserId')::uuid;
  actual_primary uuid;
  supervisor uuid := NULLIF(p_input ->> 'supervisorId', '')::uuid;
  target uuid;
  target_ids uuid[];
  pending jsonb := '[]'::jsonb;
  primary_department uuid;
  progress integer := COALESCE(
    (p_input ->> 'progressPct')::integer,
    CASE WHEN COALESCE((p_input ->> 'isCompletedAlready')::boolean, false) THEN 100 ELSE 0 END
  );
BEGIN
  SELECT * INTO actor_row FROM public.users
  WHERE id = p_actor AND deleted_at IS NULL AND status::text <> 'terminated';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active project creator required' USING ERRCODE = '42501'; END IF;
  SELECT array_agg(DISTINCT member_id) INTO target_ids
  FROM (
    SELECT requested_primary AS member_id
    UNION ALL
    SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(p_input -> 'coLeadUserIds', '[]'::jsonb))
  ) selected;
  IF requested_primary IS NULL OR EXISTS (
    SELECT 1 FROM unnest(target_ids) AS selected(member_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = selected.member_id AND u.deleted_at IS NULL AND u.status::text <> 'terminated'
    )
  ) THEN
    RAISE EXCEPTION 'Project leads must be active accounts' USING ERRCODE = '23514';
  END IF;
  IF supervisor IS NOT NULL AND (
    actor_row.role::text NOT IN ('admin', 'super_admin')
    OR NOT public.user_can_directly_assign_project_member(p_actor, supervisor)
  ) THEN
    RAISE EXCEPTION 'Invite an out-of-scope supervisor as a project lead first'
      USING ERRCODE = '42501';
  END IF;

  actual_primary := CASE
    WHEN public.user_can_directly_assign_project_member(p_actor, requested_primary)
      THEN requested_primary
    ELSE p_actor
  END;
  INSERT INTO public.projects (
    name, description, lead_user_id, supervisor_id, start_date, target_end_date,
    status, progress_pct, created_by
  ) VALUES (
    p_input ->> 'name', p_input ->> 'description', actual_primary, supervisor,
    (p_input ->> 'startDate')::date, (p_input ->> 'targetEndDate')::date,
    CASE WHEN progress >= 100 THEN 'completed'::public.project_status
      ELSE (p_input ->> 'status')::public.project_status END,
    progress, p_actor
  ) RETURNING * INTO project_row;

  FOREACH target IN ARRAY target_ids LOOP
    IF public.user_can_directly_assign_project_member(p_actor, target) THEN
      INSERT INTO public.project_contributors (project_id, user_id, role)
      VALUES (project_row.id, target, 'lead')
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'lead'
        WHERE public.project_contributors.role <> 'lead';
    ELSE
      pending := pending || jsonb_build_array(jsonb_build_object(
        'userId', target, 'role', 'lead', 'makePrimary', target = requested_primary
      ));
    END IF;
  END LOOP;

  SELECT department_id INTO primary_department FROM public.users WHERE id = actual_primary;
  IF primary_department IS NOT NULL THEN
    INSERT INTO public.project_departments (
      project_id, department_id, status, invited_by, responded_by, responded_at
    ) VALUES (project_row.id, primary_department, 'active', p_actor, p_actor, now());
  END IF;
  IF jsonb_array_length(pending) > 0 THEN
    PERFORM public.create_project_member_invitations(project_row.id, p_actor, pending);
  END IF;
  RETURN jsonb_build_object(
    'data', to_jsonb(project_row),
    'pendingInvitationCount', jsonb_array_length(pending),
    'pendingPrimary', actual_primary <> requested_primary
  );
END;
$$;
REVOKE ALL ON FUNCTION public.create_project_with_leads(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_with_leads(uuid, jsonb) TO service_role;

CREATE FUNCTION public.assign_project_member(
  p_project_id uuid,
  p_actor uuid,
  p_target uuid,
  p_role public.project_contributor_role
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
  existing_role public.project_contributor_role;
BEGIN
  SELECT * INTO project_row FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public.user_can_manage_project_invites(p_project_id, p_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_target AND deleted_at IS NULL AND status::text <> 'terminated'
  ) THEN RETURN jsonb_build_object('error', 'inactive'); END IF;
  SELECT role INTO existing_role FROM public.project_contributors
  WHERE project_id = p_project_id AND user_id = p_target;
  IF project_row.lead_user_id = p_target AND p_role <> 'lead' THEN
    RETURN jsonb_build_object('error', 'primary_lead');
  END IF;
  IF existing_role = p_role THEN RETURN jsonb_build_object('ok', true, 'unchanged', true); END IF;
  IF (existing_role IS NULL OR (existing_role = 'contributor' AND p_role = 'lead'))
     AND EXISTS (
       SELECT 1 FROM public.project_member_invitations
       WHERE project_id = p_project_id AND invitee_id = p_target AND status = 'pending'
     ) THEN
    RETURN jsonb_build_object('error', 'pending_invitation');
  END IF;
  IF (existing_role IS NULL OR (existing_role = 'contributor' AND p_role = 'lead'))
     AND NOT public.user_can_directly_assign_project_member(p_actor, p_target) THEN
    RETURN jsonb_build_object('error', 'invitation_required');
  END IF;
  INSERT INTO public.project_contributors (project_id, user_id, role)
  VALUES (p_project_id, p_target, p_role)
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN jsonb_build_object('ok', true, 'unchanged', false);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_project_member(uuid, uuid, uuid, public.project_contributor_role)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_project_member(uuid, uuid, uuid, public.project_contributor_role)
  TO service_role;

CREATE FUNCTION public.remove_project_member(p_project_id uuid, p_actor uuid, p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
  cancelled_id uuid;
BEGIN
  SELECT * INTO project_row FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public.user_can_manage_project_invites(p_project_id, p_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  IF project_row.lead_user_id = p_target THEN
    RETURN jsonb_build_object('error', 'primary_lead');
  END IF;
  UPDATE public.project_member_invitations SET status = 'cancelled', responded_at = now()
  WHERE project_id = p_project_id AND invitee_id = p_target AND status = 'pending'
  RETURNING id INTO cancelled_id;
  IF cancelled_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      p_target, 'project_assigned', 'Project invitation cancelled',
      format('The invitation to join "%s" was cancelled.', project_row.name),
      '/projects/invitations',
      jsonb_build_object('projectId', p_project_id, 'invitationId', cancelled_id)
    );
  END IF;
  DELETE FROM public.project_contributors
  WHERE project_id = p_project_id AND user_id = p_target;
  RETURN jsonb_build_object('ok', true, 'cancelledInvitation', cancelled_id IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.remove_project_member(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_project_member(uuid, uuid, uuid) TO service_role;

CREATE FUNCTION public.set_project_primary_lead(p_project_id uuid, p_actor uuid, p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
BEGIN
  SELECT * INTO project_row FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public.user_can_manage_project_invites(p_project_id, p_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_target AND deleted_at IS NULL AND status::text <> 'terminated'
  ) THEN RETURN jsonb_build_object('error', 'inactive'); END IF;
  IF project_row.lead_user_id = p_target THEN
    RETURN jsonb_build_object('ok', true, 'data', to_jsonb(project_row));
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_member_invitations
    WHERE project_id = p_project_id AND invitee_id = p_target AND status = 'pending'
  ) THEN RETURN jsonb_build_object('error', 'pending_invitation'); END IF;
  IF NOT public.user_can_directly_assign_project_member(p_actor, p_target) THEN
    RETURN jsonb_build_object(
      'error', 'invitation_required', 'data', to_jsonb(project_row)
    );
  END IF;
  UPDATE public.projects SET lead_user_id = p_target
  WHERE id = p_project_id RETURNING * INTO project_row;
  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(project_row));
END;
$$;
REVOKE ALL ON FUNCTION public.set_project_primary_lead(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_primary_lead(uuid, uuid, uuid) TO service_role;

CREATE FUNCTION public.set_project_supervisor(p_project_id uuid, p_actor uuid, p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
BEGIN
  SELECT * INTO project_row FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_actor AND deleted_at IS NULL AND status::text <> 'terminated'
      AND role::text IN ('admin', 'super_admin')
  ) THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF project_row.supervisor_id IS NOT DISTINCT FROM p_target THEN
    RETURN jsonb_build_object('ok', true, 'data', to_jsonb(project_row));
  END IF;
  IF p_target IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = p_target AND deleted_at IS NULL AND status::text <> 'terminated'
    ) THEN RETURN jsonb_build_object('error', 'inactive'); END IF;
    IF NOT public.user_can_directly_assign_project_member(p_actor, p_target)
       AND NOT EXISTS (
         SELECT 1 FROM public.project_contributors
         WHERE project_id = p_project_id AND user_id = p_target AND role = 'lead'
       ) THEN RETURN jsonb_build_object('error', 'invite_lead_first'); END IF;
  END IF;
  UPDATE public.projects SET supervisor_id = p_target
  WHERE id = p_project_id RETURNING * INTO project_row;
  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(project_row));
END;
$$;
REVOKE ALL ON FUNCTION public.set_project_supervisor(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_supervisor(uuid, uuid, uuid) TO service_role;

CREATE FUNCTION public.respond_project_member_invitation(
  p_invitation_id uuid,
  p_invitee_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  invitation public.project_member_invitations%ROWTYPE;
  project_row public.projects%ROWTYPE;
  primary_changed boolean := false;
  next_status text;
BEGIN
  SELECT * INTO invitation FROM public.project_member_invitations
  WHERE id = p_invitation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF invitation.invitee_id <> p_invitee_id THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF p_action NOT IN ('accept', 'decline') THEN RETURN jsonb_build_object('error', 'invalid_action'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_invitee_id AND deleted_at IS NULL AND status::text <> 'terminated'
  ) THEN RETURN jsonb_build_object('error', 'inactive'); END IF;
  SELECT * INTO project_row FROM public.projects
  WHERE id = invitation.project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'project_unavailable'); END IF;
  SELECT * INTO invitation FROM public.project_member_invitations
  WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF invitation.status <> 'pending' THEN RETURN jsonb_build_object('error', 'not_pending'); END IF;

  next_status := CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END;
  IF p_action = 'accept' THEN
    INSERT INTO public.project_contributors (project_id, user_id, role)
    VALUES (invitation.project_id, p_invitee_id, invitation.role)
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'lead'
      WHERE public.project_contributors.role <> 'lead' AND EXCLUDED.role = 'lead';

    IF invitation.make_primary AND project_row.lead_user_id = invitation.expected_primary_id THEN
      UPDATE public.projects SET lead_user_id = p_invitee_id WHERE id = invitation.project_id;
      primary_changed := true;
    END IF;
  END IF;
  UPDATE public.project_member_invitations
  SET status = next_status, responded_at = now()
  WHERE id = invitation.id;

  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    invitation.invited_by, 'project_assigned',
    CASE WHEN p_action = 'accept' THEN 'Project invitation accepted' ELSE 'Project invitation declined' END,
    format('An invitation to join "%s" was %s.', project_row.name, next_status),
    '/projects/' || invitation.project_id::text,
    jsonb_build_object('projectId', invitation.project_id, 'invitationId', invitation.id)
  );
  RETURN jsonb_build_object(
    'ok', true, 'status', next_status, 'projectId', invitation.project_id,
    'primaryChanged', primary_changed, 'makePrimary', invitation.make_primary
  );
END;
$$;
REVOKE ALL ON FUNCTION public.respond_project_member_invitation(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_project_member_invitation(uuid, uuid, text)
  TO service_role;

CREATE FUNCTION public.cancel_project_member_invitation(
  p_project_id uuid,
  p_invitation_id uuid,
  p_actor uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
  invitation public.project_member_invitations%ROWTYPE;
BEGIN
  SELECT * INTO project_row FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF NOT public.user_can_manage_project_invites(p_project_id, p_actor) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  SELECT * INTO invitation FROM public.project_member_invitations
  WHERE id = p_invitation_id AND project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF invitation.status <> 'pending' THEN RETURN jsonb_build_object('error', 'not_pending'); END IF;
  UPDATE public.project_member_invitations
  SET status = 'cancelled', responded_at = now()
  WHERE id = invitation.id;
  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    invitation.invitee_id, 'project_assigned', 'Project invitation cancelled',
    format('The invitation to join "%s" was cancelled.', project_row.name),
    '/projects/invitations',
    jsonb_build_object('projectId', p_project_id, 'invitationId', invitation.id)
  );
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_project_member_invitation(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_project_member_invitation(uuid, uuid, uuid)
  TO service_role;

COMMENT ON TABLE public.project_member_invitations IS
  'Pending and resolved consent to join a project; pending invitations grant no project access.';
