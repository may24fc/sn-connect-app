-- Existing Replied checkboxes predate replied_at, so period-aware metrics omit
-- those checked rows. Use the row's last known update as the best available
-- event time; all new toggles already write the exact timestamp in the API.

BEGIN;

UPDATE public.uhp_clients
SET replied_at = COALESCE(updated_at, created_at)
WHERE replied = true
  AND replied_at IS NULL;

COMMIT;
