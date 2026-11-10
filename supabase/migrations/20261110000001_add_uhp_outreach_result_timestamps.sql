ALTER TABLE public.uhp_clients
  ADD COLUMN IF NOT EXISTS interest_state_at timestamptz,
  ADD COLUMN IF NOT EXISTS we_form_at timestamptz;

UPDATE public.uhp_clients
SET interest_state_at = COALESCE(updated_at, created_at)
WHERE interest_state <> 'unknown'
  AND interest_state_at IS NULL;

UPDATE public.uhp_clients
SET we_form_at = COALESCE(updated_at, created_at)
WHERE we_form = true
  AND we_form_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_uhp_clients_interest_state_at
  ON public.uhp_clients(interest_state_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_uhp_clients_we_form_at
  ON public.uhp_clients(we_form_at)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.uhp_clients.interest_state_at IS
  'When the current interested or declined state was recorded; null for unknown.';

COMMENT ON COLUMN public.uhp_clients.we_form_at IS
  'When the current WE Form completion flag was enabled; null while incomplete.';
