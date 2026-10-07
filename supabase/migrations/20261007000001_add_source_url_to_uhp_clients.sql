-- UHP Outreach Tracker: link to where a lead was found.
--
-- Pairs with the existing uhp_clients.source_name ("Source"), which the tracker now edits
-- through a dropdown of default and previously used sources.

BEGIN;

ALTER TABLE public.uhp_clients
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.uhp_clients
  DROP CONSTRAINT IF EXISTS uhp_clients_source_url_http;

-- Only web links: the value is rendered as a clickable link in the tracker.
ALTER TABLE public.uhp_clients
  ADD CONSTRAINT uhp_clients_source_url_http
  CHECK (source_url IS NULL OR (source_url ~* '^https?://' AND char_length(source_url) <= 2048));

COMMENT ON COLUMN public.uhp_clients.source_name IS
  'Where the lead or its details came from (e.g. Instagram, Referral). Free text chosen from a dropdown.';
COMMENT ON COLUMN public.uhp_clients.source_url IS
  'Link to where the lead was found. http(s) only.';

COMMIT;
