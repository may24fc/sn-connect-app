BEGIN;

CREATE TABLE public.christmas_exchange_gift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.christmas_tree_events(id) ON DELETE CASCADE,
  giver_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT christmas_exchange_gift_no_self_match CHECK (giver_user_id <> recipient_user_id),
  CONSTRAINT christmas_exchange_gift_giver_unique UNIQUE (event_id, giver_user_id),
  CONSTRAINT christmas_exchange_gift_recipient_unique UNIQUE (event_id, recipient_user_id)
);

CREATE INDEX christmas_exchange_gift_assignments_event_idx
  ON public.christmas_exchange_gift_assignments(event_id);

ALTER TABLE public.christmas_exchange_gift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_exchange_gift_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY christmas_exchange_gift_assignments_select_own
  ON public.christmas_exchange_gift_assignments
  FOR SELECT
  TO authenticated
  USING (
    giver_user_id = auth.uid()
    OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );

DROP TRIGGER IF EXISTS trigger_christmas_exchange_gift_assignments_updated_at
  ON public.christmas_exchange_gift_assignments;
CREATE TRIGGER trigger_christmas_exchange_gift_assignments_updated_at
  BEFORE UPDATE ON public.christmas_exchange_gift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.draw_christmas_exchange_gift_partner(
  p_event_id uuid,
  p_giver_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  participant_ids uuid[];
  participant_count integer;
  recipient_shift integer;
  participant_index integer;
BEGIN
  -- Serialize initialization so simultaneous first clicks cannot build competing draws.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('christmas-exchange-gift:' || p_event_id::text, 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.christmas_tree_events event
    WHERE event.id = p_event_id
      AND event.is_active = true
      AND event.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'No active Christmas Tree event is configured';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.christmas_exchange_gift_assignments assignment
    WHERE assignment.event_id = p_event_id
      AND assignment.giver_user_id = p_giver_user_id
  ) THEN
    UPDATE public.christmas_exchange_gift_assignments
    SET revealed_at = COALESCE(revealed_at, now())
    WHERE event_id = p_event_id
      AND giver_user_id = p_giver_user_id;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.christmas_exchange_gift_assignments assignment
    WHERE assignment.event_id = p_event_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'The exchange gift draw is already set and you were not in its participant list';
  END IF;

  SELECT array_agg(candidate.user_id ORDER BY candidate.random_order)
  INTO participant_ids
  FROM (
    SELECT ornament.user_id, gen_random_uuid() AS random_order
    FROM public.christmas_ornaments ornament
    JOIN public.users member ON member.id = ornament.user_id
    WHERE ornament.event_id = p_event_id
      AND ornament.deleted_at IS NULL
      AND member.deleted_at IS NULL
      AND member.status <> 'terminated'
  ) candidate;

  participant_count := COALESCE(array_length(participant_ids, 1), 0);

  IF NOT (p_giver_user_id = ANY(COALESCE(participant_ids, ARRAY[]::uuid[]))) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Place a Christmas ball before drawing an exchange gift partner';
  END IF;

  IF participant_count < 2 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'At least two Christmas Tree participants are needed for the exchange gift draw';
  END IF;

  -- A non-zero rotation of one shuffled roster is a derangement: every giver
  -- gets one unique recipient, every recipient is selected once, and nobody
  -- can receive themselves.
  recipient_shift := 1 + floor(random() * (participant_count - 1))::integer;

  FOR participant_index IN 1..participant_count LOOP
    INSERT INTO public.christmas_exchange_gift_assignments (
      event_id,
      giver_user_id,
      recipient_user_id
    ) VALUES (
      p_event_id,
      participant_ids[participant_index],
      participant_ids[1 + ((participant_index - 1 + recipient_shift) % participant_count)]
    );
  END LOOP;

  UPDATE public.christmas_exchange_gift_assignments
  SET revealed_at = now()
  WHERE event_id = p_event_id
    AND giver_user_id = p_giver_user_id;
END;
$$;

REVOKE ALL ON TABLE public.christmas_exchange_gift_assignments FROM PUBLIC;
GRANT SELECT ON TABLE public.christmas_exchange_gift_assignments TO authenticated;
GRANT ALL ON TABLE public.christmas_exchange_gift_assignments TO service_role;

REVOKE ALL ON FUNCTION public.draw_christmas_exchange_gift_partner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.draw_christmas_exchange_gift_partner(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.draw_christmas_exchange_gift_partner(uuid, uuid) TO service_role;

COMMENT ON TABLE public.christmas_exchange_gift_assignments IS
  'Per-event Secret Santa-style assignments generated atomically from active Christmas ball owners.';
COMMENT ON FUNCTION public.draw_christmas_exchange_gift_partner(uuid, uuid) IS
  'Atomically initializes a randomized no-self, no-duplicate exchange-gift draw and reveals the caller assignment.';

COMMIT;
