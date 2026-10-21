BEGIN;

DROP POLICY IF EXISTS christmas_wishes_select_policy ON public.christmas_wishes;
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
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_christmas_wish_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_timestamp_utc timestamptz := clock_timestamp();
BEGIN
  PERFORM 1
  FROM public.christmas_ornaments ornament
  JOIN public.christmas_tree_events event ON event.id = ornament.event_id
  WHERE ornament.id = NEW.ornament_id
  AND ornament.deleted_at IS NULL
  AND event.deleted_at IS NULL
  AND event.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Christmas Tree event is not active';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.ornament_id <> OLD.ornament_id
    OR NEW.category <> OLD.category
    OR NEW.item_number <> OLD.item_number
  ) THEN
    RAISE EXCEPTION 'Wish ownership and category cannot be changed';
  END IF;

  NEW.content := trim(NEW.content);
  NEW.submitted_at := current_timestamp_utc;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_christmas_wish_window() IS
  'Validates writes against the active Christmas Tree event; legacy function name retained after monthly wish windows were removed.';

COMMIT;
