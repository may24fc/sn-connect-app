-- Unified Projects + Tasks tracker (phase 2).
-- Tasks are the execution source of truth. Milestones remain optional task groupings.

CREATE OR REPLACE FUNCTION public.calculate_milestone_progress(p_milestone_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE status <> 'cancelled') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE status = 'completed')::numeric
      / COUNT(*) FILTER (WHERE status <> 'cancelled')::numeric * 100,
      2
    )
  END
  FROM public.tasks
  WHERE milestone_id = p_milestone_id
    AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.calculate_project_progress(p_project_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE status <> 'cancelled') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE status = 'completed')::numeric
      / COUNT(*) FILTER (WHERE status <> 'cancelled')::numeric * 100,
      2
    )
  END
  FROM public.tasks
  WHERE project_id = p_project_id
    AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.calculate_project_health(p_project_id uuid)
RETURNS public.project_health
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND status = 'blocked'
  ) THEN
    RETURN 'blocked'::public.project_health;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND status NOT IN ('completed', 'cancelled')
      AND due_date < CURRENT_DATE
  ) THEN
    RETURN 'overdue'::public.project_health;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND status NOT IN ('completed', 'cancelled')
      AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 2
  ) THEN
    RETURN 'at_risk'::public.project_health;
  END IF;

  RETURN 'on_track'::public.project_health;
END;
$$;

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
          WHEN status IN ('submitted', 'approved') THEN status
          WHEN public.calculate_milestone_progress(p_milestone_id) = 0
            THEN 'not_started'::public.milestone_status
          ELSE 'in_progress'::public.milestone_status
        END
    WHERE id = p_milestone_id;

    SELECT parent_milestone_id INTO v_parent_id
    FROM public.project_milestones
    WHERE id = p_milestone_id;

    IF v_parent_id IS NOT NULL THEN
      UPDATE public.project_milestones parent
      SET progress_pct = COALESCE((
            SELECT ROUND(AVG(child.progress_pct), 2)
            FROM public.project_milestones child
            WHERE child.parent_milestone_id = v_parent_id
              AND child.deleted_at IS NULL
          ), 0),
          status = CASE
            WHEN parent.status IN ('submitted', 'approved') THEN parent.status
            WHEN EXISTS (
              SELECT 1 FROM public.project_milestones child
              WHERE child.parent_milestone_id = v_parent_id
                AND child.deleted_at IS NULL
                AND child.progress_pct > 0
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

CREATE OR REPLACE FUNCTION public.trigger_refresh_task_work_rollups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_task_work_rollups(OLD.project_id, OLD.milestone_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_task_work_rollups(NEW.project_id, NEW.milestone_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_tasks_refresh_work_rollups ON public.tasks;
CREATE TRIGGER trigger_tasks_refresh_work_rollups
  AFTER INSERT OR DELETE OR UPDATE OF status, due_date, project_id, milestone_id, deleted_at
  ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_task_work_rollups();

-- Idempotently promote existing checklist items into real tasks.
INSERT INTO public.tasks (
  title,
  description,
  assigned_to,
  assigned_by,
  created_by,
  priority,
  status,
  category,
  project_id,
  milestone_id,
  position,
  legacy_checklist_item_id,
  completed_at,
  created_at,
  updated_at
)
SELECT
  item.title,
  item.description,
  project.lead_user_id,
  COALESCE(project.created_by, project.supervisor_id, project.lead_user_id),
  COALESCE(project.created_by, project.supervisor_id, project.lead_user_id),
  'medium'::public.task_priority,
  CASE WHEN item.status = 'done'
    THEN 'completed'::public.task_status
    ELSE 'pending'::public.task_status
  END,
  'other',
  milestone.project_id,
  item.milestone_id,
  item.position,
  item.id,
  item.completed_at,
  item.created_at,
  item.updated_at
FROM public.project_checklist_items item
JOIN public.project_milestones milestone ON milestone.id = item.milestone_id
JOIN public.projects project ON project.id = milestone.project_id
WHERE item.id IS NOT NULL
ON CONFLICT (legacy_checklist_item_id) WHERE legacy_checklist_item_id IS NOT NULL DO NOTHING;

-- Keep the legacy project-detail checklist usable during the transition. All new UI should write
-- tasks directly; these triggers only mirror older clients until checklist removal is safe.
CREATE OR REPLACE FUNCTION public.sync_project_checklist_item_to_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_project_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.tasks
    SET deleted_at = now()
    WHERE legacy_checklist_item_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT milestone.project_id INTO v_project_id
  FROM public.project_milestones milestone
  WHERE milestone.id = NEW.milestone_id;

  SELECT * INTO v_project FROM public.projects WHERE id = v_project_id;

  INSERT INTO public.tasks (
    title, description, assigned_to, assigned_by, created_by, priority, status,
    category, project_id, milestone_id, position, legacy_checklist_item_id,
    completed_at, created_at, updated_at
  ) VALUES (
    NEW.title,
    NEW.description,
    v_project.lead_user_id,
    COALESCE(v_project.created_by, v_project.supervisor_id, v_project.lead_user_id),
    COALESCE(v_project.created_by, v_project.supervisor_id, v_project.lead_user_id),
    'medium',
    CASE WHEN NEW.status = 'done'
      THEN 'completed'::public.task_status
      ELSE 'pending'::public.task_status
    END,
    'other',
    v_project_id,
    NEW.milestone_id,
    NEW.position,
    NEW.id,
    NEW.completed_at,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (legacy_checklist_item_id) WHERE legacy_checklist_item_id IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    project_id = EXCLUDED.project_id,
    milestone_id = EXCLUDED.milestone_id,
    position = EXCLUDED.position,
    completed_at = EXCLUDED.completed_at,
    deleted_at = NULL,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_project_checklist_to_task ON public.project_checklist_items;
CREATE TRIGGER trigger_sync_project_checklist_to_task
  AFTER INSERT OR UPDATE OR DELETE ON public.project_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_project_checklist_item_to_task();

-- Recompute every active project once after the backfill.
UPDATE public.projects project
SET progress_pct = public.calculate_project_progress(project.id),
    health = public.calculate_project_health(project.id)
WHERE project.deleted_at IS NULL;

COMMENT ON FUNCTION public.calculate_project_progress(uuid) IS
  'Completed non-cancelled tasks divided by all non-cancelled child tasks.';
COMMENT ON FUNCTION public.calculate_project_health(uuid) IS
  'Derived task health with precedence blocked, overdue, at risk, on track.';
