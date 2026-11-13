-- Cross-department staffing requests keep proposed work out of execution boards
-- until an active lead of the requested department commits capacity.

CREATE TABLE public.cross_department_work_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users(id),
  source_department_id uuid REFERENCES public.departments(id),
  target_department_id uuid NOT NULL REFERENCES public.departments(id),
  project_id uuid REFERENCES public.projects(id),
  milestone_id uuid REFERENCES public.project_milestones(id),
  suggested_assignee_id uuid REFERENCES public.users(id),
  assigned_to uuid REFERENCES public.users(id),
  reviewed_by uuid REFERENCES public.users(id),
  created_task_id uuid REFERENCES public.tasks(id),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 5000),
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'changes_requested', 'approved', 'rejected', 'cancelled')),
  decision_note text CHECK (decision_note IS NULL OR char_length(decision_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT cross_department_request_distinct_departments
    CHECK (source_department_id IS NULL OR source_department_id <> target_department_id),
  CONSTRAINT cross_department_request_milestone_project
    CHECK (milestone_id IS NULL OR project_id IS NOT NULL),
  CONSTRAINT cross_department_request_approved_task
    CHECK (status <> 'approved' OR (assigned_to IS NOT NULL AND created_task_id IS NOT NULL))
);

CREATE INDEX cross_department_work_requests_requester_idx
  ON public.cross_department_work_requests(requester_id, created_at DESC);
CREATE INDEX cross_department_work_requests_review_idx
  ON public.cross_department_work_requests(target_department_id, status, created_at DESC);
CREATE INDEX cross_department_work_requests_project_idx
  ON public.cross_department_work_requests(project_id)
  WHERE project_id IS NOT NULL;

ALTER TABLE public.cross_department_work_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY cross_department_work_requests_select_policy
  ON public.cross_department_work_requests
  FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.department_leads dl
      JOIN public.users reviewer ON reviewer.id = dl.user_id
      WHERE dl.user_id = auth.uid()
        AND dl.department_id = target_department_id
        AND dl.revoked_at IS NULL
        AND reviewer.deleted_at IS NULL
        AND reviewer.status::text <> 'terminated'
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.cross_department_work_requests
  FROM authenticated, anon;
GRANT SELECT ON public.cross_department_work_requests TO authenticated;
GRANT ALL ON public.cross_department_work_requests TO service_role;

CREATE FUNCTION public.create_cross_department_work_request(p_actor uuid, p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_row public.users%ROWTYPE;
  request_row public.cross_department_work_requests%ROWTYPE;
  target_department uuid := NULLIF(p_input ->> 'targetDepartmentId', '')::uuid;
  project_target uuid := NULLIF(p_input ->> 'projectId', '')::uuid;
  milestone_target uuid := NULLIF(p_input ->> 'milestoneId', '')::uuid;
  suggested_target uuid := NULLIF(p_input ->> 'suggestedAssigneeId', '')::uuid;
  reviewer_id uuid;
BEGIN
  SELECT * INTO actor_row
  FROM public.users
  WHERE id = p_actor AND deleted_at IS NULL AND status::text <> 'terminated';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'inactive');
  END IF;
  IF target_department IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.departments WHERE id = target_department AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_department');
  END IF;
  IF actor_row.department_id IS NOT NULL AND actor_row.department_id = target_department THEN
    RETURN jsonb_build_object('error', 'same_department');
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.department_leads dl
    JOIN public.users lead_user ON lead_user.id = dl.user_id
    WHERE dl.department_id = target_department
      AND dl.revoked_at IS NULL
      AND lead_user.deleted_at IS NULL
      AND lead_user.status::text <> 'terminated'
      AND dl.user_id <> p_actor
  ) THEN
    RETURN jsonb_build_object('error', 'no_approver');
  END IF;

  IF project_target IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_target
      AND p.deleted_at IS NULL
      AND (
        public.user_has_any_role(p_actor, ARRAY['admin', 'super_admin']::public.user_role[])
        OR p.created_by = p_actor
        OR p.lead_user_id = p_actor
        OR p.supervisor_id = p_actor
        OR public.user_is_project_contributor(project_target, p_actor)
      )
  ) THEN
    RETURN jsonb_build_object('error', 'project_forbidden');
  END IF;
  IF milestone_target IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.project_milestones
    WHERE id = milestone_target AND project_id = project_target AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_milestone');
  END IF;
  IF suggested_target IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = suggested_target
      AND department_id = target_department
      AND deleted_at IS NULL
      AND status::text <> 'terminated'
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_suggestion');
  END IF;

  INSERT INTO public.cross_department_work_requests (
    requester_id, source_department_id, target_department_id, project_id, milestone_id,
    suggested_assignee_id, title, description, priority, due_date
  ) VALUES (
    p_actor, actor_row.department_id, target_department, project_target, milestone_target,
    suggested_target, btrim(p_input ->> 'title'), NULLIF(btrim(p_input ->> 'description'), ''),
    COALESCE(NULLIF(p_input ->> 'priority', '')::public.task_priority, 'medium'),
    NULLIF(p_input ->> 'dueDate', '')::timestamptz
  ) RETURNING * INTO request_row;

  FOR reviewer_id IN
    SELECT DISTINCT dl.user_id
    FROM public.department_leads dl
    JOIN public.users lead_user ON lead_user.id = dl.user_id
    WHERE dl.department_id = target_department
      AND dl.revoked_at IS NULL
      AND lead_user.deleted_at IS NULL
      AND lead_user.status::text <> 'terminated'
      AND dl.user_id <> p_actor
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      reviewer_id, 'system', 'Department help requested',
      format('A cross-department request needs your review: "%s".', request_row.title),
      '/work-tracker?view=requests&requestScope=review',
      jsonb_build_object('workRequestId', request_row.id, 'targetDepartmentId', target_department)
    );
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(request_row));
END;
$$;

CREATE FUNCTION public.respond_cross_department_work_request(
  p_request_id uuid,
  p_actor uuid,
  p_action text,
  p_assignee uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request_row public.cross_department_work_requests%ROWTYPE;
  actor_row public.users%ROWTYPE;
  created_task public.tasks%ROWTYPE;
  can_review boolean := false;
BEGIN
  SELECT * INTO request_row
  FROM public.cross_department_work_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF request_row.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'not_pending');
  END IF;
  SELECT * INTO actor_row
  FROM public.users
  WHERE id = p_actor AND deleted_at IS NULL AND status::text <> 'terminated';
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'inactive'); END IF;
  IF request_row.requester_id = p_actor THEN
    RETURN jsonb_build_object('error', 'self_review');
  END IF;
  can_review := actor_row.role::text IN ('admin', 'super_admin') OR EXISTS (
    SELECT 1 FROM public.department_leads
    WHERE user_id = p_actor
      AND department_id = request_row.target_department_id
      AND revoked_at IS NULL
  );
  IF NOT can_review THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF p_action NOT IN ('approve', 'request_changes', 'reject') THEN
    RETURN jsonb_build_object('error', 'invalid_action');
  END IF;
  IF p_action IN ('request_changes', 'reject') AND NULLIF(btrim(p_note), '') IS NULL THEN
    RETURN jsonb_build_object('error', 'note_required');
  END IF;

  IF p_action = 'approve' THEN
    IF p_assignee IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = p_assignee
        AND department_id = request_row.target_department_id
        AND role::text IN ('employee', 'associate')
        AND deleted_at IS NULL
        AND status::text <> 'terminated'
    ) THEN
      RETURN jsonb_build_object('error', 'invalid_assignee');
    END IF;

    IF request_row.project_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = request_row.project_id AND deleted_at IS NULL
      ) THEN
        RETURN jsonb_build_object('error', 'project_unavailable');
      END IF;
      INSERT INTO public.project_departments (
        project_id, department_id, status, invited_by, invited_at,
        responded_by, responded_at
      ) VALUES (
        request_row.project_id, request_row.target_department_id, 'active',
        request_row.requester_id, request_row.created_at, p_actor, now()
      )
      ON CONFLICT (project_id, department_id) DO UPDATE SET
        status = 'active', responded_by = p_actor, responded_at = now();

      INSERT INTO public.project_contributors (project_id, user_id, role)
      VALUES (request_row.project_id, p_assignee, 'contributor')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;

    INSERT INTO public.tasks (
      title, description, assigned_to, assigned_by, priority, status, due_date,
      project_id, milestone_id, created_by
    ) VALUES (
      request_row.title, request_row.description, p_assignee, p_actor,
      request_row.priority, 'pending', request_row.due_date,
      request_row.project_id, request_row.milestone_id, request_row.requester_id
    ) RETURNING * INTO created_task;

    UPDATE public.cross_department_work_requests SET
      status = 'approved', assigned_to = p_assignee, reviewed_by = p_actor,
      created_task_id = created_task.id, decision_note = NULLIF(btrim(p_note), ''),
      decided_at = now(), updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO request_row;

    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      request_row.requester_id, 'system', 'Department request approved',
      format('Your request "%s" was approved and assigned.', request_row.title),
      '/tasks/' || created_task.id::text,
      jsonb_build_object('workRequestId', request_row.id, 'taskId', created_task.id)
    );
    IF p_assignee <> request_row.requester_id THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
      VALUES (
        p_assignee, 'task_assigned', 'Cross-department task assigned',
        format('Your department lead assigned you: "%s".', request_row.title),
        '/tasks/' || created_task.id::text,
        jsonb_build_object('workRequestId', request_row.id, 'taskId', created_task.id)
      );
    END IF;
  ELSE
    UPDATE public.cross_department_work_requests SET
      status = CASE WHEN p_action = 'request_changes' THEN 'changes_requested' ELSE 'rejected' END,
      reviewed_by = p_actor, decision_note = btrim(p_note), decided_at = now(), updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO request_row;

    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    VALUES (
      request_row.requester_id, 'system',
      CASE WHEN p_action = 'request_changes' THEN 'Changes requested' ELSE 'Department request declined' END,
      format('A department lead responded to "%s".', request_row.title),
      '/work-tracker?view=requests&requestScope=mine',
      jsonb_build_object('workRequestId', request_row.id)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(request_row));
END;
$$;

CREATE FUNCTION public.revise_cross_department_work_request(
  p_request_id uuid,
  p_actor uuid,
  p_action text,
  p_input jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request_row public.cross_department_work_requests%ROWTYPE;
  reviewer_id uuid;
BEGIN
  SELECT * INTO request_row
  FROM public.cross_department_work_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF request_row.requester_id <> p_actor THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF p_action = 'cancel' THEN
    IF request_row.status NOT IN ('pending', 'changes_requested') THEN
      RETURN jsonb_build_object('error', 'not_editable');
    END IF;
    UPDATE public.cross_department_work_requests SET
      status = 'cancelled', updated_at = now(), decided_at = now()
    WHERE id = p_request_id RETURNING * INTO request_row;
  ELSIF p_action = 'resubmit' THEN
    IF request_row.status <> 'changes_requested' THEN
      RETURN jsonb_build_object('error', 'not_editable');
    END IF;
    UPDATE public.cross_department_work_requests SET
      title = btrim(COALESCE(NULLIF(p_input ->> 'title', ''), title)),
      description = CASE WHEN p_input ? 'description'
        THEN NULLIF(btrim(p_input ->> 'description'), '') ELSE description END,
      priority = COALESCE(NULLIF(p_input ->> 'priority', '')::public.task_priority, priority),
      due_date = CASE WHEN p_input ? 'dueDate'
        THEN NULLIF(p_input ->> 'dueDate', '')::timestamptz ELSE due_date END,
      status = 'pending', decision_note = NULL, reviewed_by = NULL, decided_at = NULL,
      updated_at = now()
    WHERE id = p_request_id RETURNING * INTO request_row;

    FOR reviewer_id IN
      SELECT DISTINCT dl.user_id
      FROM public.department_leads dl
      JOIN public.users lead_user ON lead_user.id = dl.user_id
      WHERE dl.department_id = request_row.target_department_id
        AND dl.revoked_at IS NULL
        AND lead_user.deleted_at IS NULL
        AND lead_user.status::text <> 'terminated'
        AND dl.user_id <> p_actor
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
      VALUES (
        reviewer_id, 'system', 'Department request resubmitted',
        format('A revised request needs your review: "%s".', request_row.title),
        '/work-tracker?view=requests&requestScope=review',
        jsonb_build_object('workRequestId', request_row.id)
      );
    END LOOP;
  ELSE
    RETURN jsonb_build_object('error', 'invalid_action');
  END IF;
  RETURN jsonb_build_object('ok', true, 'data', to_jsonb(request_row));
END;
$$;

REVOKE ALL ON FUNCTION public.create_cross_department_work_request(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_cross_department_work_request(uuid, uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revise_cross_department_work_request(uuid, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_cross_department_work_request(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_cross_department_work_request(uuid, uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revise_cross_department_work_request(uuid, uuid, text, jsonb) TO service_role;

COMMENT ON TABLE public.cross_department_work_requests IS
  'Auditable requests for a target department lead to commit capacity and create an assigned task.';

-- Project creation now accepts ordinary contributors separately from project leads.
-- Direct/invited membership rules remain the same; only the requested role differs.
CREATE OR REPLACE FUNCTION public.create_project_with_leads(p_actor uuid, p_input jsonb)
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
  lead_ids uuid[];
  contributor_ids uuid[];
  all_ids uuid[];
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

  SELECT array_agg(DISTINCT member_id) INTO lead_ids
  FROM (
    SELECT requested_primary AS member_id
    UNION ALL
    SELECT value::uuid
    FROM jsonb_array_elements_text(COALESCE(p_input -> 'coLeadUserIds', '[]'::jsonb))
  ) selected;
  SELECT COALESCE(array_agg(DISTINCT value::uuid), ARRAY[]::uuid[]) INTO contributor_ids
  FROM jsonb_array_elements_text(COALESCE(p_input -> 'contributorUserIds', '[]'::jsonb));
  all_ids := lead_ids || contributor_ids;

  IF requested_primary IS NULL OR EXISTS (
    SELECT 1 FROM unnest(all_ids) AS selected(member_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = selected.member_id AND u.deleted_at IS NULL AND u.status::text <> 'terminated'
    )
  ) THEN
    RAISE EXCEPTION 'Project members must be active accounts' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(contributor_ids) contributor(member_id)
    WHERE contributor.member_id = ANY(lead_ids)
  ) THEN
    RAISE EXCEPTION 'Project leads and contributors must be distinct' USING ERRCODE = '23514';
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

  FOREACH target IN ARRAY lead_ids LOOP
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

  FOREACH target IN ARRAY contributor_ids LOOP
    IF public.user_can_directly_assign_project_member(p_actor, target) THEN
      INSERT INTO public.project_contributors (project_id, user_id, role)
      VALUES (project_row.id, target, 'contributor')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    ELSE
      pending := pending || jsonb_build_array(jsonb_build_object(
        'userId', target, 'role', 'contributor', 'makePrimary', false
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
