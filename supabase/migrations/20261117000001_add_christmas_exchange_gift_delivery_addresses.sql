BEGIN;

CREATE TABLE public.christmas_exchange_gift_delivery_addresses (
  event_id uuid NOT NULL REFERENCES public.christmas_tree_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT christmas_exchange_gift_delivery_address_length
    CHECK (char_length(btrim(delivery_address)) BETWEEN 5 AND 500)
);

ALTER TABLE public.christmas_exchange_gift_delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_exchange_gift_delivery_addresses FORCE ROW LEVEL SECURITY;

CREATE POLICY christmas_exchange_gift_delivery_addresses_own
  ON public.christmas_exchange_gift_delivery_addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY christmas_exchange_gift_delivery_addresses_revealed_recipient
  ON public.christmas_exchange_gift_delivery_addresses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.christmas_exchange_gift_assignments assignment
      WHERE assignment.event_id = christmas_exchange_gift_delivery_addresses.event_id
        AND assignment.recipient_user_id = christmas_exchange_gift_delivery_addresses.user_id
        AND assignment.giver_user_id = auth.uid()
        AND assignment.revealed_at IS NOT NULL
    )
  );

CREATE TRIGGER trigger_christmas_exchange_gift_delivery_addresses_updated_at
  BEFORE UPDATE ON public.christmas_exchange_gift_delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

REVOKE ALL ON TABLE public.christmas_exchange_gift_delivery_addresses FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.christmas_exchange_gift_delivery_addresses
  TO authenticated;
GRANT ALL ON TABLE public.christmas_exchange_gift_delivery_addresses TO service_role;

COMMENT ON TABLE public.christmas_exchange_gift_delivery_addresses IS
  'Private per-event delivery addresses. Snapshots expose the full value only to its owner and their revealed exchange-gift giver.';

COMMIT;
