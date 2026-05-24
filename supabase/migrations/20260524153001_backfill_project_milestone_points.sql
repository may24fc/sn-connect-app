-- Backfill points for milestones that were already marked approved before
-- the current completion flow and points trigger were in place.

WITH missing_events AS (
  SELECT
    milestones.id AS milestone_id,
    milestones.project_id,
    milestones.period_type,
    COALESCE(projects.lead_user_id, milestones.approved_by) AS user_id,
    COALESCE(milestones.approved_at, milestones.updated_at, now()) AS awarded_at
  FROM public.project_milestones AS milestones
  INNER JOIN public.projects AS projects
    ON projects.id = milestones.project_id
  LEFT JOIN public.points_events AS events
    ON events.source_milestone_id = milestones.id
    AND events.event_type IN ('milestone_approved', 'weekly_complete')
  WHERE milestones.deleted_at IS NULL
    AND milestones.status = 'approved'
    AND COALESCE(projects.lead_user_id, milestones.approved_by) IS NOT NULL
    AND events.id IS NULL
)
INSERT INTO public.points_events (
  user_id,
  event_type,
  points,
  source_milestone_id,
  source_project_id,
  created_at
)
SELECT
  missing.user_id,
  CASE
    WHEN missing.period_type = 'week' THEN 'weekly_complete'
    ELSE 'milestone_approved'
  END,
  CASE
    WHEN missing.period_type = 'week' THEN 5
    ELSE 10
  END,
  missing.milestone_id,
  missing.project_id,
  missing.awarded_at
FROM missing_events AS missing;

DO $$
DECLARE
  user_row RECORD;
BEGIN
  FOR user_row IN
    SELECT DISTINCT events.user_id
    FROM public.points_events AS events
    WHERE events.event_type IN ('milestone_approved', 'weekly_complete')
  LOOP
    PERFORM public.recompute_user_gamification(user_row.user_id);
  END LOOP;
END;
$$;