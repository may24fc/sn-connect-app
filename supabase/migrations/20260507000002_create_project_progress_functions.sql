-- Migration: Project Progress + Health Functions
-- Created: 2026-05-07
-- Description: Auto-calculates milestone progress from checklist items, propagates to project,
--              and derives health (on_track | at_risk | overdue) based on overdue/upcoming due dates.
--              Mirrors the calculate_okr_progress() trigger pattern.

BEGIN;

-- ============================================
-- MILESTONE PROGRESS (from checklist items)
-- ============================================
-- Monthly milestones: average of weekly children's progress (if any), else from own checklist items.
-- Weekly milestones: % of checklist items with status='done'.

CREATE OR REPLACE FUNCTION public.calculate_milestone_progress(p_milestone_id uuid)
RETURNS numeric AS $$
DECLARE
  v_period_type milestone_period_type;
  v_total integer := 0;
  v_done integer := 0;
  v_avg numeric := 0;
  v_child_count integer := 0;
BEGIN
  SELECT period_type INTO v_period_type
  FROM public.project_milestones
  WHERE id = p_milestone_id AND deleted_at IS NULL;

  IF v_period_type IS NULL THEN
    RETURN 0;
  END IF;

  IF v_period_type = 'month' THEN
    SELECT COUNT(*), COALESCE(AVG(progress_pct), 0)
      INTO v_child_count, v_avg
    FROM public.project_milestones
    WHERE parent_milestone_id = p_milestone_id
      AND deleted_at IS NULL;

    IF v_child_count > 0 THEN
      RETURN ROUND(v_avg, 2);
    END IF;
  END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'done'), COUNT(*)
    INTO v_done, v_total
  FROM public.project_checklist_items
  WHERE milestone_id = p_milestone_id;

  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((v_done::numeric / v_total::numeric) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROJECT PROGRESS (avg of monthly milestones)
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_project_progress(p_project_id uuid)
RETURNS numeric AS $$
DECLARE
  v_avg numeric := 0;
  v_count integer := 0;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(progress_pct), 0)
    INTO v_count, v_avg
  FROM public.project_milestones
  WHERE project_id = p_project_id
    AND period_type = 'month'
    AND deleted_at IS NULL;

  IF v_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(v_avg, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROJECT HEALTH (red/yellow/green)
-- ============================================
-- overdue:  any milestone past due_date and not approved
-- at_risk:  any milestone due within 48h and not approved
-- on_track: otherwise

CREATE OR REPLACE FUNCTION public.calculate_project_health(p_project_id uuid)
RETURNS project_health AS $$
DECLARE
  v_overdue integer := 0;
  v_at_risk integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_overdue
  FROM public.project_milestones
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND status <> 'approved'
    AND due_date < CURRENT_DATE;

  IF v_overdue > 0 THEN
    RETURN 'overdue'::project_health;
  END IF;

  SELECT COUNT(*) INTO v_at_risk
  FROM public.project_milestones
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND status <> 'approved'
    AND due_date <= CURRENT_DATE + INTERVAL '2 days'
    AND due_date >= CURRENT_DATE;

  IF v_at_risk > 0 THEN
    RETURN 'at_risk'::project_health;
  END IF;

  RETURN 'on_track'::project_health;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS: cascade checklist -> milestone -> project
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_recalc_milestone_from_checklist()
RETURNS TRIGGER AS $$
DECLARE
  v_milestone_id uuid;
  v_project_id uuid;
  v_parent_id uuid;
  v_pct numeric;
BEGIN
  v_milestone_id := COALESCE(NEW.milestone_id, OLD.milestone_id);

  IF v_milestone_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_pct := public.calculate_milestone_progress(v_milestone_id);

  UPDATE public.project_milestones
  SET progress_pct = v_pct,
      status = CASE
        WHEN status IN ('submitted', 'approved') THEN status
        WHEN v_pct = 0 THEN 'not_started'::milestone_status
        WHEN v_pct >= 100 THEN status -- hold at in_progress until submitted
        ELSE 'in_progress'::milestone_status
      END
  WHERE id = v_milestone_id
  RETURNING project_id, parent_milestone_id INTO v_project_id, v_parent_id;

  -- propagate to parent (week -> month) and project
  IF v_parent_id IS NOT NULL THEN
    UPDATE public.project_milestones
    SET progress_pct = public.calculate_milestone_progress(v_parent_id)
    WHERE id = v_parent_id;
  END IF;

  IF v_project_id IS NOT NULL THEN
    UPDATE public.projects
    SET progress_pct = public.calculate_project_progress(v_project_id),
        health = public.calculate_project_health(v_project_id)
    WHERE id = v_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_checklist_recalc ON public.project_checklist_items;
CREATE TRIGGER trg_checklist_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.project_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_milestone_from_checklist();

-- When milestone status changes (e.g., approved), refresh project progress + health.
CREATE OR REPLACE FUNCTION public.trigger_recalc_project_from_milestone()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.due_date IS DISTINCT FROM OLD.due_date OR
     NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    UPDATE public.projects
    SET progress_pct = public.calculate_project_progress(COALESCE(NEW.project_id, OLD.project_id)),
        health = public.calculate_project_health(COALESCE(NEW.project_id, OLD.project_id))
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_milestone_recalc_project ON public.project_milestones;
CREATE TRIGGER trg_milestone_recalc_project
  AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_project_from_milestone();

COMMENT ON FUNCTION public.calculate_milestone_progress(uuid) IS 'Returns % progress for a milestone (avg of weekly children for monthly, else % of done checklist items).';
COMMENT ON FUNCTION public.calculate_project_progress(uuid) IS 'Returns % progress across a project (avg of monthly milestones).';
COMMENT ON FUNCTION public.calculate_project_health(uuid) IS 'Returns derived health: overdue if any unapproved milestone past due, at_risk if any due within 48h, else on_track.';

COMMIT;
