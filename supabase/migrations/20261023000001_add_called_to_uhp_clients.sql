ALTER TABLE public.uhp_clients
  ADD COLUMN IF NOT EXISTS called boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS called_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_uhp_clients_called_at
  ON public.uhp_clients (called_at)
  WHERE called = true AND deleted_at IS NULL;

COMMENT ON COLUMN public.uhp_clients.called IS
  'Whether a call with this client has been recorded from the Outreach Tracker.';

COMMENT ON COLUMN public.uhp_clients.called_at IS
  'When the Outreach Tracker Call flag was most recently enabled; used for period metrics and digests.';
