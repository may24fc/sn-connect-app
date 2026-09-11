-- Migration: Create Virtual Christmas Wish Tree
-- Created: 2026-09-11
-- Description: Adds seasonal Christmas Tree data, access control, server-time wish gates, and team decoration state.

BEGIN;

CREATE TYPE public.christmas_ornament_asset AS ENUM (
  'red',
  'gold',
  'silver',
  'green',
  'blue',
  'pearl',
  'burgundy',
  'champagne'
);

CREATE TYPE public.christmas_wish_category AS ENUM (
  'personal',
  'for_others',
  'for_sn'
);

CREATE TABLE public.christmas_tree_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  title text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  october_opens_at timestamptz NOT NULL,
  october_closes_at timestamptz NOT NULL,
  november_opens_at timestamptz NOT NULL,
  november_closes_at timestamptz NOT NULL,
  december_opens_at timestamptz NOT NULL,
  december_closes_at timestamptz NOT NULL,
  visible_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT christmas_tree_events_key_unique UNIQUE (event_key),
  CONSTRAINT christmas_tree_events_timezone_check CHECK (timezone = 'Asia/Manila'),
  CONSTRAINT christmas_tree_events_window_check CHECK (
    october_opens_at < october_closes_at
    AND october_closes_at < november_opens_at
    AND november_opens_at < november_closes_at
    AND november_closes_at < december_opens_at
    AND december_opens_at < december_closes_at
    AND december_closes_at <= visible_until
  )
);

CREATE TABLE public.christmas_ornaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.christmas_tree_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  asset_type public.christmas_ornament_asset NOT NULL,
  position_x numeric(5,2) NOT NULL,
  position_y numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT christmas_ornaments_position_x_check CHECK (position_x BETWEEN 0 AND 100),
  CONSTRAINT christmas_ornaments_position_y_check CHECK (position_y BETWEEN 0 AND 100)
);

CREATE TABLE public.christmas_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ornament_id uuid NOT NULL REFERENCES public.christmas_ornaments(id) ON DELETE CASCADE,
  category public.christmas_wish_category NOT NULL,
  item_number smallint NOT NULL DEFAULT 1,
  content text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  CONSTRAINT christmas_wishes_content_check CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
  CONSTRAINT christmas_wishes_category_item_check CHECK (
    (category = 'personal' AND item_number BETWEEN 1 AND 3)
    OR (category IN ('for_others', 'for_sn') AND item_number = 1)
  )
);

CREATE UNIQUE INDEX idx_christmas_tree_events_single_active
  ON public.christmas_tree_events (is_active)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE UNIQUE INDEX idx_christmas_ornaments_event_user_unique
  ON public.christmas_ornaments (event_id, user_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_christmas_wishes_ornament_category_item_unique
  ON public.christmas_wishes (ornament_id, category, item_number)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_christmas_ornaments_event_position
  ON public.christmas_ornaments (event_id, position_y, position_x)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_christmas_wishes_ornament_category
  ON public.christmas_wishes (ornament_id, category, item_number)
  WHERE deleted_at IS NULL;

ALTER TABLE public.christmas_tree_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_tree_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_ornaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_ornaments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_wishes FORCE ROW LEVEL SECURITY;

CREATE POLICY christmas_tree_events_select_policy ON public.christmas_tree_events
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (is_active OR user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin'])));

CREATE POLICY christmas_tree_events_admin_write_policy ON public.christmas_tree_events
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']));

CREATE POLICY christmas_ornaments_select_policy ON public.christmas_ornaments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.christmas_tree_events event
      WHERE event.id = christmas_ornaments.event_id
      AND event.deleted_at IS NULL
      AND event.is_active = true
      AND now() <= event.visible_until
    )
  );

CREATE POLICY christmas_ornaments_insert_self_policy ON public.christmas_ornaments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY christmas_ornaments_update_self_policy ON public.christmas_ornaments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY christmas_ornaments_admin_delete_policy ON public.christmas_ornaments
  FOR DELETE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']));

CREATE POLICY christmas_wishes_select_policy ON public.christmas_wishes
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.christmas_ornaments ornament
      JOIN public.christmas_tree_events event ON event.id = ornament.event_id
      WHERE ornament.id = christmas_wishes.ornament_id
      AND ornament.deleted_at IS NULL
      AND event.deleted_at IS NULL
      AND event.is_active = true
      AND now() <= event.visible_until
      AND (
        (christmas_wishes.category = 'personal' AND now() >= event.october_opens_at)
        OR (christmas_wishes.category = 'for_others' AND now() >= event.november_opens_at)
        OR (christmas_wishes.category = 'for_sn' AND now() >= event.december_opens_at)
      )
    )
  );

CREATE POLICY christmas_wishes_insert_self_policy ON public.christmas_wishes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.christmas_ornaments ornament
      WHERE ornament.id = christmas_wishes.ornament_id
      AND ornament.user_id = auth.uid()
      AND ornament.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY christmas_wishes_update_self_policy ON public.christmas_wishes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.christmas_ornaments ornament
      WHERE ornament.id = christmas_wishes.ornament_id
      AND ornament.user_id = auth.uid()
      AND ornament.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.christmas_ornaments ornament
      WHERE ornament.id = christmas_wishes.ornament_id
      AND ornament.user_id = auth.uid()
      AND ornament.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY christmas_wishes_admin_delete_policy ON public.christmas_wishes
  FOR DELETE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']));

CREATE OR REPLACE FUNCTION public.enforce_christmas_wish_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_row public.christmas_tree_events;
  current_timestamp_utc timestamptz := clock_timestamp();
BEGIN
  SELECT event.* INTO event_row
  FROM public.christmas_ornaments ornament
  JOIN public.christmas_tree_events event ON event.id = ornament.event_id
  WHERE ornament.id = NEW.ornament_id
  AND ornament.deleted_at IS NULL
  AND event.deleted_at IS NULL;

  IF NOT FOUND OR NOT event_row.is_active THEN
    RAISE EXCEPTION 'Christmas Tree event is not active';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.ornament_id <> OLD.ornament_id
    OR NEW.category <> OLD.category
    OR NEW.item_number <> OLD.item_number
  ) THEN
    RAISE EXCEPTION 'Wish ownership and category cannot be changed';
  END IF;

  IF NEW.category = 'personal' THEN
    IF current_timestamp_utc < event_row.october_opens_at OR current_timestamp_utc > event_row.october_closes_at THEN
      RAISE EXCEPTION 'Personal wishes are unavailable outside the October submission window';
    END IF;
  ELSIF NEW.category = 'for_others' THEN
    IF current_timestamp_utc < event_row.november_opens_at OR current_timestamp_utc > event_row.november_closes_at THEN
      RAISE EXCEPTION 'Wishes for others are unavailable outside the November submission window';
    END IF;
  ELSIF NEW.category = 'for_sn' THEN
    IF current_timestamp_utc < event_row.december_opens_at OR current_timestamp_utc > event_row.december_closes_at THEN
      RAISE EXCEPTION 'Wishes for SN are unavailable outside the December submission window';
    END IF;
  END IF;

  NEW.content := trim(NEW.content);
  NEW.submitted_at := current_timestamp_utc;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_christmas_wishes_enforce_window
  BEFORE INSERT OR UPDATE ON public.christmas_wishes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_christmas_wish_window();

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
  WITH active_participants AS (
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
  )
  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE october_complete)::integer,
    count(*) FILTER (WHERE november_complete)::integer,
    count(*) FILTER (WHERE december_complete)::integer,
    count(*) > 0 AND bool_and(october_complete),
    count(*) > 0 AND bool_and(november_complete),
    count(*) > 0 AND bool_and(december_complete)
  FROM completion;
$$;

GRANT EXECUTE ON FUNCTION public.get_christmas_tree_decoration_state(uuid) TO authenticated;

CREATE TRIGGER trigger_christmas_tree_events_updated_at
  BEFORE UPDATE ON public.christmas_tree_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_christmas_ornaments_updated_at
  BEFORE UPDATE ON public.christmas_ornaments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_christmas_wishes_updated_at
  BEFORE UPDATE ON public.christmas_wishes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.christmas_tree_events (
  event_key,
  title,
  october_opens_at,
  october_closes_at,
  november_opens_at,
  november_closes_at,
  december_opens_at,
  december_closes_at,
  visible_until,
  is_active
) VALUES (
  'sn-christmas-wish-tree-2026',
  'SN Christmas Wish Tree 2026',
  '2026-10-01 00:00:00+08',
  '2026-10-20 23:59:59+08',
  '2026-11-01 00:00:00+08',
  '2026-11-20 23:59:59+08',
  '2026-12-01 00:00:00+08',
  '2026-12-20 23:59:59+08',
  '2026-12-31 23:59:59+08',
  true
)
ON CONFLICT (event_key) DO NOTHING;

COMMENT ON TABLE public.christmas_tree_events IS 'Time-configured Christmas Wish Tree event with server-enforced Manila submission windows.';
COMMENT ON TABLE public.christmas_ornaments IS 'One personalized Christmas ball per participant per event, positioned as responsive percentages.';
COMMENT ON TABLE public.christmas_wishes IS 'Time-gated wishes: three personal October entries, one November wish for others, and one December wish for SN.';

COMMIT;