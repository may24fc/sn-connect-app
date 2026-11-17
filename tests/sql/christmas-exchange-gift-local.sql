\set ON_ERROR_STOP on

-- Local-only rollback test for the atomic Christmas exchange-gift draw.
BEGIN;

UPDATE public.christmas_tree_events
SET is_active = false
WHERE is_active = true AND deleted_at IS NULL;

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-1611-4161-8161-000000000001', 'giver1@christmas-draw.test'),
  ('aaaaaaaa-1611-4161-8161-000000000002', 'giver2@christmas-draw.test'),
  ('aaaaaaaa-1611-4161-8161-000000000003', 'giver3@christmas-draw.test'),
  ('aaaaaaaa-1611-4161-8161-000000000004', 'late@christmas-draw.test');

UPDATE public.users
SET status = 'active', role = 'employee'::public.user_role
WHERE id::text LIKE 'aaaaaaaa-1611-4161-8161-%';

INSERT INTO public.christmas_tree_events (
  id,
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
  'eeeeeeee-1611-4161-8161-000000000001',
  'exchange-gift-local-test',
  'Exchange Gift Local Test',
  '2026-10-01 00:00:00+08',
  '2026-10-31 23:59:59+08',
  '2026-11-01 00:00:00+08',
  '2026-11-30 23:59:59+08',
  '2026-12-01 00:00:00+08',
  '2026-12-31 23:59:59+08',
  '2027-01-15 23:59:59+08',
  true
);

INSERT INTO public.christmas_ornaments (
  event_id,
  user_id,
  asset_type,
  position_x,
  position_y
) VALUES
  ('eeeeeeee-1611-4161-8161-000000000001', 'aaaaaaaa-1611-4161-8161-000000000001', 'red', 40, 50),
  ('eeeeeeee-1611-4161-8161-000000000001', 'aaaaaaaa-1611-4161-8161-000000000002', 'gold', 50, 50),
  ('eeeeeeee-1611-4161-8161-000000000001', 'aaaaaaaa-1611-4161-8161-000000000003', 'green', 60, 50);

SELECT public.draw_christmas_exchange_gift_partner(
  'eeeeeeee-1611-4161-8161-000000000001',
  'aaaaaaaa-1611-4161-8161-000000000001'
);

DO $$
DECLARE
  original_recipient uuid;
BEGIN
  IF (SELECT count(*) FROM public.christmas_exchange_gift_assignments
      WHERE event_id = 'eeeeeeee-1611-4161-8161-000000000001') <> 3 THEN
    RAISE EXCEPTION 'Expected one assignment for every participant';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.christmas_exchange_gift_assignments
    WHERE event_id = 'eeeeeeee-1611-4161-8161-000000000001'
      AND giver_user_id = recipient_user_id
  ) THEN
    RAISE EXCEPTION 'A participant drew themselves';
  END IF;

  IF (SELECT count(DISTINCT recipient_user_id)
      FROM public.christmas_exchange_gift_assignments
      WHERE event_id = 'eeeeeeee-1611-4161-8161-000000000001') <> 3 THEN
    RAISE EXCEPTION 'A recipient was assigned more than once';
  END IF;

  IF (SELECT count(*) FROM public.christmas_exchange_gift_assignments
      WHERE event_id = 'eeeeeeee-1611-4161-8161-000000000001'
        AND revealed_at IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'Only the first caller should be revealed';
  END IF;

  SELECT recipient_user_id INTO original_recipient
  FROM public.christmas_exchange_gift_assignments
  WHERE event_id = 'eeeeeeee-1611-4161-8161-000000000001'
    AND giver_user_id = 'aaaaaaaa-1611-4161-8161-000000000001';

  PERFORM public.draw_christmas_exchange_gift_partner(
    'eeeeeeee-1611-4161-8161-000000000001',
    'aaaaaaaa-1611-4161-8161-000000000001'
  );

  IF (SELECT recipient_user_id FROM public.christmas_exchange_gift_assignments
      WHERE event_id = 'eeeeeeee-1611-4161-8161-000000000001'
        AND giver_user_id = 'aaaaaaaa-1611-4161-8161-000000000001') <> original_recipient THEN
    RAISE EXCEPTION 'Repeated reveal changed the assignment';
  END IF;
END;
$$;

SELECT public.draw_christmas_exchange_gift_partner(
  'eeeeeeee-1611-4161-8161-000000000001',
  'aaaaaaaa-1611-4161-8161-000000000002'
);

INSERT INTO public.christmas_ornaments (
  event_id,
  user_id,
  asset_type,
  position_x,
  position_y
) VALUES (
  'eeeeeeee-1611-4161-8161-000000000001',
  'aaaaaaaa-1611-4161-8161-000000000004',
  'blue',
  50,
  65
);

DO $$
BEGIN
  BEGIN
    PERFORM public.draw_christmas_exchange_gift_partner(
      'eeeeeeee-1611-4161-8161-000000000001',
      'aaaaaaaa-1611-4161-8161-000000000004'
    );
    RAISE EXCEPTION 'Late participant unexpectedly joined a finalized draw';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM NOT LIKE 'The exchange gift draw is already set%' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;
