ALTER TABLE public.uhp_clients
  ADD COLUMN IF NOT EXISTS we_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS we_call boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.uhp_clients.we_form IS
  'Whether the client has completed the Wellness Evaluation form.';

COMMENT ON COLUMN public.uhp_clients.we_call IS
  'Whether a Wellness Evaluation call has been completed with the client.';
