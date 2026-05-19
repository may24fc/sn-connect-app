-- Migration: Fix milestone status propagation
-- Created: 2026-05-19
-- Description: When a checklist item is toggled, the trigger only updated
--              progress_pct on the parent (month) milestone but not its status.
--              This fix makes the trigger also update the parent's status to
--              'in_progress' when progress > 0, mirroring the leaf-level logic.

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_recalc_milestone_from_checklist()
RETURNS TRIGGER AS $$
DECLARE
  v_milestone_id uuid;
  v_project_id   uuid;
  v_parent_id    uuid;
  v_pct          numeric;
  v_parent_pct   numeric;
BEGIN
  v_milestone_id := COALESCE(NEW.milestone_id, OLD.milestone_id);

  IF v_milestone_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalculate and update the direct (week) milestone
  v_pct := public.calculate_milestone_progress(v_milestone_id);

  UPDATE public.project_milestones
  SET progress_pct = v_pct,
      status = CASE
        WHEN status IN ('submitted', 'approved') THEN status
        WHEN v_pct = 0                           THEN 'not_started'::milestone_status
        WHEN v_pct >= 100                        THEN status  -- hold until submitted
        ELSE                                          'in_progress'::milestone_status
      END
  WHERE id = v_milestone_id
  RETURNING project_id, parent_milestone_id INTO v_project_id, v_parent_id;

  -- Propagate to parent (month) milestone: update BOTH progress_pct AND status
  IF v_parent_id IS NOT NULL THEN
    v_parent_pct := public.calculate_milestone_progress(v_parent_id);

    UPDATE public.project_milestones
    SET progress_pct = v_parent_pct,
        status = CASE
          WHEN status IN ('submitted', 'approved') THEN status
          WHEN v_parent_pct = 0                   THEN 'not_started'::milestone_status
          WHEN v_parent_pct >= 100                THEN status  -- hold until submitted
          ELSE                                         'in_progress'::milestone_status
        END
    WHERE id = v_parent_id;
  END IF;

  -- Update project-level progress and health
  IF v_project_id IS NOT NULL THEN
    UPDATE public.projects
    SET progress_pct = public.calculate_project_progress(v_project_id),
        health       = public.calculate_project_health(v_project_id)
    WHERE id = v_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.trigger_recalc_milestone_from_checklist() IS
  'Recalculates progress and status for the affected milestone, its parent (month) milestone, and the project whenever a checklist item is inserted, updated, or deleted.';

COMMIT;
