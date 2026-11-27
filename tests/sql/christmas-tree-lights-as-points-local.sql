BEGIN;

DO $validation$
DECLARE
  christmas_event_id uuid;
BEGIN
  SELECT id INTO christmas_event_id
  FROM public.christmas_tree_events
  LIMIT 1;

  IF christmas_event_id IS NULL THEN
    RAISE EXCEPTION 'A local Christmas Tree event is required for this test';
  END IF;

  INSERT INTO public.christmas_tree_strands (event_id, kind, start_x, start_y, end_x, end_y)
  VALUES (christmas_event_id, 'lights', 75, 55, 75, 55);

  BEGIN
    INSERT INTO public.christmas_tree_strands (event_id, kind, start_x, start_y, end_x, end_y)
    VALUES (christmas_event_id, 'garland', 50, 55, 50, 55);
    RAISE EXCEPTION 'A zero-width Garland was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  RAISE NOTICE 'christmas_lights_as_points_local_ok';
END
$validation$;

ROLLBACK;
