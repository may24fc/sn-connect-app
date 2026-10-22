BEGIN;

ALTER TABLE public.christmas_tree_events
  ADD COLUMN garland_manually_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN lights_manually_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN star_manually_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_christmas_tree_decoration_state(p_event_id uuid)
RETURNS TABLE (
  active_participant_count integer,
  october_complete_count integer,
  november_complete_count integer,
  december_complete_count integer,
  garland_unlocked boolean,
  lights_unlocked boolean,
  star_unlocked boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH event_state AS (
    SELECT
      garland_manually_enabled,
      lights_manually_enabled,
      star_manually_enabled
    FROM public.christmas_tree_events
    WHERE id = p_event_id
      AND deleted_at IS NULL
  ), active_participants AS (
    SELECT id
    FROM public.users
    WHERE status = 'active'
      AND deleted_at IS NULL
  ), participant_wishes AS (
    SELECT
      ornament.user_id,
      count(*) FILTER (WHERE wish.category = 'personal') = 3 AS october_complete,
      bool_or(wish.category = 'for_others') AS november_complete,
      bool_or(wish.category = 'for_sn') AS december_complete
    FROM public.christmas_ornaments ornament
    LEFT JOIN public.christmas_wishes wish
      ON wish.ornament_id = ornament.id
      AND wish.deleted_at IS NULL
    WHERE ornament.event_id = p_event_id
      AND ornament.deleted_at IS NULL
    GROUP BY ornament.user_id
  ), completion AS (
    SELECT
      participant.id,
      COALESCE(wishes.october_complete, false) AS october_complete,
      COALESCE(wishes.november_complete, false) AS november_complete,
      COALESCE(wishes.december_complete, false) AS december_complete
    FROM active_participants participant
    LEFT JOIN participant_wishes wishes ON wishes.user_id = participant.id
  ), totals AS (
    SELECT
      count(*)::integer AS active_participant_count,
      count(*) FILTER (WHERE october_complete)::integer AS october_complete_count,
      count(*) FILTER (WHERE november_complete)::integer AS november_complete_count,
      count(*) FILTER (WHERE december_complete)::integer AS december_complete_count,
      count(*) > 0 AND bool_and(october_complete) AS garland_milestone_unlocked,
      count(*) > 0 AND bool_and(november_complete) AS lights_milestone_unlocked,
      count(*) > 0 AND bool_and(december_complete) AS star_milestone_unlocked
    FROM completion
  )
  SELECT
    totals.active_participant_count,
    totals.october_complete_count,
    totals.november_complete_count,
    totals.december_complete_count,
    totals.garland_milestone_unlocked OR event_state.garland_manually_enabled,
    totals.lights_milestone_unlocked OR event_state.lights_manually_enabled,
    totals.star_milestone_unlocked OR event_state.star_manually_enabled
  FROM totals
  CROSS JOIN event_state;
$$;

COMMENT ON COLUMN public.christmas_tree_events.garland_manually_enabled IS
  'Allows an admin or super-admin to display the garland before its team milestone is complete.';
COMMENT ON COLUMN public.christmas_tree_events.lights_manually_enabled IS
  'Allows an admin or super-admin to display the lights before their team milestone is complete.';
COMMENT ON COLUMN public.christmas_tree_events.star_manually_enabled IS
  'Allows an admin or super-admin to display the tree star before its team milestone is complete.';

COMMIT;
