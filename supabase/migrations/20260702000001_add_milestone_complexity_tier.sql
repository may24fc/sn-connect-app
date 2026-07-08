-- Leaderboards v2 Phase 1: Complexity Tiers
-- Adds complexity_tier to project_milestones, rescales XP amounts,
-- and updates the tier thresholds to match the new XP economy.

-- 1. Complexity tier enum
CREATE TYPE public.milestone_complexity_tier AS ENUM (
  'routine',   -- 50 XP  (quick, low-impact)
  'standard',  -- 150 XP (core operational deliverables)
  'complex',   -- 300 XP (cross-functional / technical)
  'epic'       -- 600 XP (architectural / high-impact)
);

-- 2. New columns on project_milestones
--    complexity_tier: only set on period_type = 'week'
--    department:      enables per-milestone mastery routing (Phase 2)
ALTER TABLE public.project_milestones
  ADD COLUMN IF NOT EXISTS complexity_tier public.milestone_complexity_tier,
  ADD COLUMN IF NOT EXISTS department text;

-- 3. New column on points_events for domain mastery tracking
ALTER TABLE public.points_events
  ADD COLUMN IF NOT EXISTS milestone_department text;

-- 4. Backfill complexity_tier = 'standard' for all existing weekly milestones
UPDATE public.project_milestones
SET complexity_tier = 'standard'
WHERE period_type = 'week'
  AND complexity_tier IS NULL;

-- 5. Backfill points_events to match the new XP economy
--    weekly_complete (was 5) → 150  (standard tier)
--    milestone_approved (was 10) → 100  (chapter complete)
UPDATE public.points_events
SET points = 150
WHERE event_type = 'weekly_complete';

UPDATE public.points_events
SET points = 100
WHERE event_type = 'milestone_approved';

-- 6. Rescale compute_tier() thresholds
--    Old: bronze 0–49 / silver 50–149 / gold 150–399 / PR 400+
--    New: bronze 0–499 / silver 500–1499 / gold 1500–3999 / PR 4000+
CREATE OR REPLACE FUNCTION public.compute_tier(p_points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 4000 THEN 'production_ready'
    WHEN p_points >= 1500 THEN 'gold'
    WHEN p_points >= 500  THEN 'silver'
    ELSE 'bronze'
  END;
$$;

-- 7. Update handle_milestone_approval_points to:
--    (a) derive XP from complexity_tier instead of fixed values
--    (b) populate milestone_department on the inserted points_event
CREATE OR REPLACE FUNCTION public.handle_milestone_approval_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead uuid;
  v_points integer;
  v_event_type text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT lead_user_id INTO v_lead FROM public.projects WHERE id = NEW.project_id;
    IF v_lead IS NULL THEN RETURN NEW; END IF;

    IF NEW.period_type = 'week' THEN
      v_event_type := 'weekly_complete';
      v_points := CASE COALESCE(NEW.complexity_tier::text, 'standard')
        WHEN 'routine' THEN 50
        WHEN 'complex' THEN 300
        WHEN 'epic'    THEN 600
        ELSE 150  -- standard (default)
      END;
    ELSE
      -- Monthly milestone: flat "chapter complete" bonus
      v_points := 100;
      v_event_type := 'milestone_approved';
    END IF;

    INSERT INTO public.points_events (
      user_id, event_type, points,
      source_milestone_id, source_project_id,
      milestone_department
    )
    VALUES (
      v_lead, v_event_type, v_points,
      NEW.id, NEW.project_id,
      NEW.department
    )
    ON CONFLICT DO NOTHING;

    PERFORM public.recompute_user_gamification(v_lead);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists; just replace the function (no need to recreate trigger)

-- 8. Recompute all existing user_gamification rows from the updated ledger
DO $$
DECLARE
  v_uid uuid;
BEGIN
  FOR v_uid IN SELECT DISTINCT user_id FROM public.user_gamification LOOP
    PERFORM public.recompute_user_gamification(v_uid);
  END LOOP;
END;
$$;

-- 9. Index for department-based mastery queries (Phase 2)
CREATE INDEX IF NOT EXISTS points_events_milestone_dept_idx
  ON public.points_events(user_id, milestone_department)
  WHERE milestone_department IS NOT NULL;
