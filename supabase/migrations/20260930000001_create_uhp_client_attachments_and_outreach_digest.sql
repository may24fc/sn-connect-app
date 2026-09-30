-- UHP Outreach Tracker: conversation screenshots and the weekly Telegram summary run log.
--
-- Screenshots live in a private bucket with no storage.objects policies: the API
-- (service role, after a client_tracker access check) is the only way in, and
-- reads go through short-lived signed URLs.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uhp-client-attachments',
  'uhp-client-attachments',
  false,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

CREATE TABLE public.uhp_client_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.uhp_clients(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.uhp_client_activities(id) ON DELETE SET NULL,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_uhp_client_attachments_client
  ON public.uhp_client_attachments(client_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_client_attachments_activity
  ON public.uhp_client_attachments(activity_id)
  WHERE deleted_at IS NULL AND activity_id IS NOT NULL;

ALTER TABLE public.uhp_client_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_client_attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_client_attachments_access_policy ON public.uhp_client_attachments
  FOR ALL TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'))
  WITH CHECK (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'));

CREATE TABLE public.uhp_outreach_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_started_at timestamptz NOT NULL,
  interval_ended_at timestamptz NOT NULL,
  destination_key text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  n8n_execution_id text,
  telegram_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (interval_ended_at > interval_started_at)
);

CREATE INDEX idx_uhp_outreach_digest_runs_interval
  ON public.uhp_outreach_digest_runs(interval_ended_at DESC);

ALTER TABLE public.uhp_outreach_digest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_outreach_digest_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_outreach_digest_runs_select_policy ON public.uhp_outreach_digest_runs
  FOR SELECT TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'));

DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_client_attachments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_client_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_outreach_digest_runs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_outreach_digest_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.uhp_client_attachments IS 'Conversation screenshots attached to UHP clients or activities (private bucket uhp-client-attachments).';
COMMENT ON TABLE public.uhp_outreach_digest_runs IS 'Idempotent log of the weekly UHP outreach Telegram summary sent by n8n.';

COMMIT;
