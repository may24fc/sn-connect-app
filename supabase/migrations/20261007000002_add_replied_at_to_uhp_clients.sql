-- Timestamp manual reply toggles so period-filtered metrics count the reply in the
-- period when it was recorded, rather than treating the boolean as an all-time event.

BEGIN;

ALTER TABLE public.uhp_clients
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_uhp_clients_replied_at
  ON public.uhp_clients(replied_at)
  WHERE replied = true AND deleted_at IS NULL;

COMMENT ON COLUMN public.uhp_clients.replied_at IS
  'When the manual Replied checkbox was most recently turned on; used by period-filtered outreach metrics.';

COMMIT;
