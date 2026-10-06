-- UHP Outreach Tracker: manual "Replied" flag on each client row.
--
-- Independent of uhp_client_activities.reply_received, which feeds the Replies metric.

BEGIN;

ALTER TABLE public.uhp_clients
  ADD COLUMN IF NOT EXISTS replied boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.uhp_clients.replied IS
  'Manually toggled in the Outreach Tracker table: has the prospect replied to outreach.';

COMMIT;
