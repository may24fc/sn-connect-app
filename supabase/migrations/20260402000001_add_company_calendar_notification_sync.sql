-- ============================================================
-- company_calendar notification sync state
-- ============================================================

CREATE TABLE public.company_calendar_event_sync (
  google_event_id text PRIMARY KEY,
  summary text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false NOT NULL,
  location text,
  html_link text,
  source_created_at timestamptz,
  first_seen_at timestamptz DEFAULT now() NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  notification_sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_company_calendar_event_sync_start_time
  ON public.company_calendar_event_sync (start_time);

CREATE INDEX idx_company_calendar_event_sync_last_seen_at
  ON public.company_calendar_event_sync (last_seen_at);

CREATE TRIGGER set_company_calendar_event_sync_updated_at
  BEFORE UPDATE ON public.company_calendar_event_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.company_calendar_event_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_calendar_event_sync FORCE ROW LEVEL SECURITY;

CREATE TABLE public.company_calendar_sync_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  initialized_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER set_company_calendar_sync_state_updated_at
  BEFORE UPDATE ON public.company_calendar_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.company_calendar_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_calendar_sync_state FORCE ROW LEVEL SECURITY;