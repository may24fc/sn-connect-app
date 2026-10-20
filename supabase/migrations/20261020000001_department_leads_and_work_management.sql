-- Department-scoped work management and contributor-weighted milestone rewards.
-- Production deployment is intentionally separate; validate this migration locally first.

CREATE TABLE IF NOT EXISTS public.department_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appointed_by uuid NOT NULL REFERENCES public.users(id),
  appointed_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid REFERENCES public.users(id),
  revoked_at timestamptz,
  CONSTRAINT department_leads_revocation_valid CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS department_leads_active_unique
  ON public.department_leads(department_id, user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS department_leads_user_active_idx
  ON public.department_leads(user_id, department_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'removed')),
  invited_by uuid NOT NULL REFERENCES public.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_by uuid REFERENCES public.users(id),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, department_id)
);

CREATE INDEX IF NOT EXISTS project_departments_project_status_idx
  ON public.project_departments(project_id, status);
CREATE INDEX IF NOT EXISTS project_departments_department_status_idx
  ON public.project_departments(department_id, status);

-- Preserve existing project ownership by deriving the first department from the lead,
-- then the creator when the lead has no canonical department.
INSERT INTO public.project_departments (
  project_id, department_id, status, invited_by, responded_by, responded_at
)
SELECT
  p.id,
  COALESCE(lead_user.department_id, creator.department_id),
  'active',
  COALESCE(p.created_by, p.lead_user_id),
  COALESCE(p.created_by, p.lead_user_id),
  p.created_at
FROM public.projects p
LEFT JOIN public.users lead_user ON lead_user.id = p.lead_user_id
LEFT JOIN public.users creator ON creator.id = p.created_by
WHERE p.deleted_at IS NULL
  AND COALESCE(lead_user.department_id, creator.department_id) IS NOT NULL
ON CONFLICT (project_id, department_id) DO NOTHING;

-- Backfill the legacy single head only when it is still an eligible member of that department.
INSERT INTO public.department_leads (department_id, user_id, appointed_by, appointed_at)
SELECT d.id, d.head_id, d.head_id, COALESCE(d.updated_at, d.created_at, now())
FROM public.departments d
JOIN public.users u ON u.id = d.head_id
WHERE d.deleted_at IS NULL
  AND d.head_id IS NOT NULL
  AND u.deleted_at IS NULL
  AND u.status <> 'terminated'
  AND u.role IN ('employee', 'associate')
  AND u.department_id = d.id
ON CONFLICT DO NOTHING;

ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES public.users(id);

CREATE TABLE IF NOT EXISTS public.milestone_reward_runs (
  milestone_id uuid PRIMARY KEY REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_points integer NOT NULL CHECK (total_points >= 0),
  eligible_task_count integer NOT NULL CHECK (eligible_task_count >= 0),
  triggered_by uuid REFERENCES public.users(id),
  completed_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS public.points_events_milestone_approved_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS points_events_milestone_user_completion_uniq
  ON public.points_events(source_milestone_id, user_id, event_type)
  WHERE source_milestone_id IS NOT NULL
    AND event_type IN ('milestone_approved', 'weekly_complete');

CREATE OR REPLACE FUNCTION public.handle_milestone_approval_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead uuid;
  v_points integer;
  v_event_type text;
  v_total_tasks integer;
  v_remaining integer;
  v_inserted integer;
  v_row record;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT lead_user_id INTO v_lead FROM public.projects WHERE id = NEW.project_id;
    IF v_lead IS NULL THEN RETURN NEW; END IF;

    IF NEW.period_type = 'week' THEN
      v_event_type := 'weekly_complete';
      v_points := CASE COALESCE(NEW.complexity_tier::text, 'standard')
        WHEN 'routine' THEN 50
        WHEN 'complex' THEN 300
        WHEN 'epic' THEN 600
        ELSE 150
      END;
    ELSE
      v_event_type := 'milestone_approved';
      v_points := 100;
    END IF;

    SELECT COUNT(*)::integer
    INTO v_total_tasks
    FROM public.tasks t
    LEFT JOIN public.project_milestones task_milestone ON task_milestone.id = t.milestone_id
    WHERE t.deleted_at IS NULL
      AND t.status = 'completed'
      AND t.assigned_to IS NOT NULL
      AND t.project_id = NEW.project_id
      AND (
        t.milestone_id = NEW.id
        OR (NEW.period_type = 'month' AND task_milestone.parent_milestone_id = NEW.id)
      );

    INSERT INTO public.milestone_reward_runs (
      milestone_id, project_id, total_points, eligible_task_count, triggered_by, completed_at
    ) VALUES (
      NEW.id, NEW.project_id, v_points, v_total_tasks, NEW.completed_by, COALESCE(NEW.completed_at, now())
    ) ON CONFLICT (milestone_id) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- A previous transaction already distributed this milestone.
    IF v_inserted = 0 THEN RETURN NEW; END IF;

    IF v_total_tasks = 0 THEN
      INSERT INTO public.points_events (
        user_id, event_type, points, source_milestone_id, source_project_id,
        milestone_department, metadata
      ) VALUES (
        v_lead, v_event_type, v_points, NEW.id, NEW.project_id,
        NEW.department,
        jsonb_build_object('taskCount', 0, 'totalTaskCount', 0, 'fallback', 'project_lead')
      );
      PERFORM public.recompute_user_gamification(v_lead);
      RETURN NEW;
    END IF;

    v_remaining := v_points;
    FOR v_row IN
      WITH task_counts AS (
        SELECT t.assigned_to AS user_id, COUNT(*)::integer AS task_count
        FROM public.tasks t
        LEFT JOIN public.project_milestones task_milestone ON task_milestone.id = t.milestone_id
        WHERE t.deleted_at IS NULL
          AND t.status = 'completed'
          AND t.assigned_to IS NOT NULL
          AND t.project_id = NEW.project_id
          AND (
            t.milestone_id = NEW.id
            OR (NEW.period_type = 'month' AND task_milestone.parent_milestone_id = NEW.id)
          )
        GROUP BY t.assigned_to
      ), apportioned AS (
        SELECT
          user_id,
          task_count,
          FLOOR((v_points::numeric * task_count) / v_total_tasks)::integer AS base_points,
          ((v_points::numeric * task_count) / v_total_tasks)
            - FLOOR((v_points::numeric * task_count) / v_total_tasks) AS remainder
        FROM task_counts
      ), ranked AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY remainder DESC, user_id ASC) AS remainder_rank,
          v_points - SUM(base_points) OVER () AS extras
        FROM apportioned
      )
      SELECT user_id, task_count,
        base_points + CASE WHEN remainder_rank <= extras THEN 1 ELSE 0 END AS awarded_points
      FROM ranked
      ORDER BY user_id
    LOOP
      INSERT INTO public.points_events (
        user_id, event_type, points, source_milestone_id, source_project_id,
        milestone_department, metadata
      ) VALUES (
        v_row.user_id, v_event_type, v_row.awarded_points, NEW.id, NEW.project_id,
        NEW.department,
        jsonb_build_object(
          'taskCount', v_row.task_count,
          'totalTaskCount', v_total_tasks,
          'allocation', 'largest_remainder'
        )
      );
      v_remaining := v_remaining - v_row.awarded_points;
      PERFORM public.recompute_user_gamification(v_row.user_id);
    END LOOP;

    IF v_remaining <> 0 THEN
      RAISE EXCEPTION 'Milestone reward allocation did not balance: % points remain', v_remaining;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_assignee_is_contributor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.project_contributors(project_id, user_id, role)
    VALUES (NEW.project_id, NEW.assigned_to, 'contributor')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_ensure_project_contributor_trg ON public.tasks;
CREATE TRIGGER tasks_ensure_project_contributor_trg
AFTER INSERT OR UPDATE OF project_id, assigned_to ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.ensure_project_assignee_is_contributor();

INSERT INTO public.project_contributors(project_id, user_id, role)
SELECT DISTINCT project_id, assigned_to, 'contributor'::public.project_contributor_role
FROM public.tasks
WHERE deleted_at IS NULL AND project_id IS NOT NULL AND assigned_to IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

ALTER TABLE public.department_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.project_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_departments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_reward_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_reward_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY department_leads_authenticated_read ON public.department_leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY department_leads_super_admin_write ON public.department_leads
  FOR ALL TO authenticated
  USING (public.user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[]))
  WITH CHECK (public.user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[]));

CREATE POLICY project_departments_authenticated_read ON public.project_departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY project_departments_admin_write ON public.project_departments
  FOR ALL TO authenticated
  USING (public.user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::public.user_role[]))
  WITH CHECK (public.user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::public.user_role[]));

CREATE POLICY milestone_reward_runs_authenticated_read ON public.milestone_reward_runs
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.department_leads IS 'Active and historical co-lead appointments. Active authority requires revoked_at IS NULL and current department membership.';
COMMENT ON TABLE public.project_departments IS 'Department ownership invitations; only active rows grant department-lead work-management authority.';
COMMENT ON TABLE public.milestone_reward_runs IS 'Exactly-once completion reward header used to prevent duplicate XP distribution.';

-- Task rollups must never reopen a milestone after its explicit completion.
CREATE OR REPLACE FUNCTION public.refresh_task_work_rollups(
  p_project_id uuid,
  p_milestone_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  IF p_milestone_id IS NOT NULL THEN
    UPDATE public.project_milestones
    SET progress_pct = public.calculate_milestone_progress(p_milestone_id),
        status = CASE
          WHEN status IN ('submitted', 'approved', 'completed') THEN status
          WHEN public.calculate_milestone_progress(p_milestone_id) = 0 THEN 'not_started'::public.milestone_status
          ELSE 'in_progress'::public.milestone_status
        END
    WHERE id = p_milestone_id;

    SELECT parent_milestone_id INTO v_parent_id
    FROM public.project_milestones WHERE id = p_milestone_id;

    IF v_parent_id IS NOT NULL THEN
      UPDATE public.project_milestones parent
      SET progress_pct = COALESCE((
            SELECT ROUND(AVG(child.progress_pct), 2)
            FROM public.project_milestones child
            WHERE child.parent_milestone_id = v_parent_id AND child.deleted_at IS NULL
          ), 0),
          status = CASE
            WHEN parent.status IN ('submitted', 'approved', 'completed') THEN parent.status
            WHEN EXISTS (
              SELECT 1 FROM public.project_milestones child
              WHERE child.parent_milestone_id = v_parent_id
                AND child.deleted_at IS NULL AND child.progress_pct > 0
            ) THEN 'in_progress'::public.milestone_status
            ELSE 'not_started'::public.milestone_status
          END
      WHERE parent.id = v_parent_id;
    END IF;
  END IF;

  IF p_project_id IS NOT NULL THEN
    UPDATE public.projects
    SET progress_pct = public.calculate_project_progress(p_project_id),
        health = public.calculate_project_health(p_project_id)
    WHERE id = p_project_id;
  END IF;
END;
$$;
