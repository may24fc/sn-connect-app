BEGIN;

CREATE TABLE public.uhp_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('client_tracker', 'portal_reminders', 'volume_points')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_uhp_access_grants_user_module_active
  ON public.uhp_access_grants (user_id, module)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.user_has_uhp_module_access(target_user_id uuid, target_module text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = target_user_id
      AND u.deleted_at IS NULL
      AND u.role IN ('admin', 'super_admin')
  ) OR EXISTS (
    SELECT 1
    FROM public.uhp_access_grants grant_row
    INNER JOIN public.users u ON u.id = grant_row.user_id
    WHERE grant_row.user_id = target_user_id
      AND grant_row.module = target_module
      AND grant_row.deleted_at IS NULL
      AND u.deleted_at IS NULL
      AND u.status NOT IN ('terminated', 'inactive')
      AND u.role IN ('employee', 'associate')
  );
$$;

CREATE TABLE public.uhp_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'Prospect',
  client_type text,
  interest_state text NOT NULL DEFAULT 'unknown'
    CHECK (interest_state IN ('unknown', 'interested', 'declined')),
  lead_owner text,
  source_name text,
  email text,
  phone text,
  alternate_phone text,
  instagram_url text,
  website text,
  job_title text,
  office_address text,
  chatgpt_url text,
  due_date date,
  source_created_date date,
  attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  migration_review_required boolean NOT NULL DEFAULT false,
  notion_page_id text UNIQUE,
  notion_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_uhp_clients_status ON public.uhp_clients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_clients_type ON public.uhp_clients(client_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_clients_owner ON public.uhp_clients(lead_owner) WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_clients_due_date ON public.uhp_clients(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_clients_migration_review
  ON public.uhp_clients(migration_review_required)
  WHERE deleted_at IS NULL AND migration_review_required = true;

CREATE TABLE public.uhp_client_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.uhp_clients(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'Interaction',
  direction text CHECK (direction IN ('inbound', 'outbound')),
  channel text,
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Complete' CHECK (status IN ('To Do', 'Complete')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  follow_up_at timestamptz,
  reply_received boolean NOT NULL DEFAULT false,
  prospect_outcome text CHECK (prospect_outcome IN ('interested', 'declined')),
  appointment_type text CHECK (appointment_type IN ('wellness_evaluation', 'call')),
  appointment_at timestamptz,
  migration_review_required boolean NOT NULL DEFAULT false,
  legacy_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  notion_page_id text UNIQUE,
  notion_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_uhp_client_activities_client_date
  ON public.uhp_client_activities(client_id, occurred_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_client_activities_metrics
  ON public.uhp_client_activities(occurred_at, direction, reply_received)
  WHERE deleted_at IS NULL;

CREATE TABLE public.uhp_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.uhp_clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  notion_page_id text UNIQUE,
  notion_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_uhp_client_notes_client_date
  ON public.uhp_client_notes(client_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE public.uhp_reminder_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL CHECK (
    reminder_type IN ('ten_customer_form', 'checks_deposits', 'ro_group_report')
  ),
  deadline_date date,
  scheduled_for timestamptz NOT NULL,
  destination_key text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  n8n_execution_id text,
  telegram_message_id text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_uhp_reminder_runs_schedule
  ON public.uhp_reminder_runs(scheduled_for DESC, reminder_type);

CREATE TABLE public.uhp_vp_month_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporting_month date NOT NULL,
  category text NOT NULL CHECK (
    category IN ('personal', 'repeat_customer', 'new_client', 'old_client', 'distributor')
  ),
  target_vp numeric(12,2) NOT NULL DEFAULT 0 CHECK (target_vp >= 0),
  forecast_vp numeric(12,2) NOT NULL DEFAULT 0 CHECK (forecast_vp >= 0),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporting_month, category),
  CHECK (date_trunc('month', reporting_month)::date = reporting_month)
);

CREATE TABLE public.uhp_vp_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporting_month date NOT NULL,
  category text NOT NULL CHECK (
    category IN ('personal', 'repeat_customer', 'new_client', 'old_client', 'distributor')
  ),
  order_id text,
  member_id text,
  member_name text NOT NULL,
  member_level text,
  discount_percent numeric(5,2),
  order_date date NOT NULL,
  payment_status text,
  handler_name text,
  volume_points numeric(12,2) NOT NULL CHECK (volume_points >= 0),
  amount numeric(14,2),
  currency text,
  original_amount_text text,
  source_sheet text,
  source_row integer,
  legacy_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (source_sheet, source_row),
  CHECK (date_trunc('month', reporting_month)::date = reporting_month)
);

CREATE INDEX idx_uhp_vp_entries_month_category
  ON public.uhp_vp_entries(reporting_month, category)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_uhp_vp_entries_updated
  ON public.uhp_vp_entries(updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE public.uhp_vp_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_started_at timestamptz NOT NULL,
  interval_ended_at timestamptz NOT NULL,
  reporting_month date NOT NULL,
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
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_uhp_vp_digest_runs_interval
  ON public.uhp_vp_digest_runs(interval_ended_at DESC);

ALTER TABLE public.uhp_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_access_grants FORCE ROW LEVEL SECURITY;

CREATE POLICY uhp_access_grants_select_policy ON public.uhp_access_grants
  FOR SELECT TO authenticated
  USING (
    (auth.uid() = user_id AND deleted_at IS NULL)
    OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin'])
  );
CREATE POLICY uhp_access_grants_admin_insert_policy ON public.uhp_access_grants
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));
CREATE POLICY uhp_access_grants_admin_update_policy ON public.uhp_access_grants
  FOR UPDATE TO authenticated
  USING (public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']))
  WITH CHECK (public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));
CREATE POLICY uhp_access_grants_admin_delete_policy ON public.uhp_access_grants
  FOR DELETE TO authenticated
  USING (public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

ALTER TABLE public.uhp_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_clients FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_clients_access_policy ON public.uhp_clients
  FOR ALL TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'))
  WITH CHECK (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'));

ALTER TABLE public.uhp_client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_client_activities FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_client_activities_access_policy ON public.uhp_client_activities
  FOR ALL TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'))
  WITH CHECK (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'));

ALTER TABLE public.uhp_client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_client_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_client_notes_access_policy ON public.uhp_client_notes
  FOR ALL TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'))
  WITH CHECK (public.user_has_uhp_module_access(auth.uid(), 'client_tracker'));

ALTER TABLE public.uhp_reminder_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_reminder_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_reminder_runs_select_policy ON public.uhp_reminder_runs
  FOR SELECT TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'portal_reminders'));

ALTER TABLE public.uhp_vp_month_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_vp_month_targets FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_vp_month_targets_access_policy ON public.uhp_vp_month_targets
  FOR ALL TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'volume_points'))
  WITH CHECK (public.user_has_uhp_module_access(auth.uid(), 'volume_points'));

ALTER TABLE public.uhp_vp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_vp_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_vp_entries_access_policy ON public.uhp_vp_entries
  FOR ALL TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'volume_points'))
  WITH CHECK (public.user_has_uhp_module_access(auth.uid(), 'volume_points'));

ALTER TABLE public.uhp_vp_digest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_vp_digest_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY uhp_vp_digest_runs_select_policy ON public.uhp_vp_digest_runs
  FOR SELECT TO authenticated
  USING (public.user_has_uhp_module_access(auth.uid(), 'volume_points'));

DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_access_grants;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_clients;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_client_activities;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_client_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_client_notes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_client_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_reminder_runs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_reminder_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_vp_month_targets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_vp_month_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_vp_entries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_vp_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON public.uhp_vp_digest_runs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_vp_digest_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.uhp_clients IS 'Ultimate Health Project client and prospect source of truth.';
COMMENT ON TABLE public.uhp_client_activities IS 'Structured UHP outreach, reply, follow-up, and appointment activity.';
COMMENT ON TABLE public.uhp_vp_entries IS 'Normalized Herbalife volume-point transactions migrated from the UHP workbook.';
COMMENT ON FUNCTION public.user_has_uhp_module_access(uuid, text) IS 'Checks admin access or an active module-specific UHP grant.';

COMMIT;
