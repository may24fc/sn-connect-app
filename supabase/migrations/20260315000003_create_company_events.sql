-- ============================================================
-- company_events – centralized company calendar events
-- ============================================================

-- Category enum
CREATE TYPE public.event_category AS ENUM (
  'holiday',
  'meeting',
  'deadline',
  'company',
  'team',
  'training'
);

-- Main table
CREATE TABLE public.company_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) >= 1),
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false NOT NULL,
  location text,
  category public.event_category NOT NULL DEFAULT 'company',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  CONSTRAINT company_events_end_after_start CHECK (end_time >= start_time)
);

-- Indexes
CREATE INDEX idx_company_events_start_time ON public.company_events (start_time);
CREATE INDEX idx_company_events_end_time ON public.company_events (end_time);
CREATE INDEX idx_company_events_category ON public.company_events (category);
CREATE INDEX idx_company_events_deleted_at ON public.company_events (deleted_at);
CREATE INDEX idx_company_events_created_by ON public.company_events (created_by);

-- Auto-update updated_at
CREATE TRIGGER set_company_events_updated_at
  BEFORE UPDATE ON public.company_events
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_events FORCE ROW LEVEL SECURITY;

-- Everyone can read non-deleted events
CREATE POLICY company_events_select_all_policy
  ON public.company_events FOR SELECT
  USING (deleted_at IS NULL);

-- Only admins can insert
CREATE POLICY company_events_insert_admin_policy
  ON public.company_events FOR INSERT
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin', 'hr', 'cos', 'ceo']::user_role[])
  );

-- Only admins can update
CREATE POLICY company_events_update_admin_policy
  ON public.company_events FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin', 'hr', 'cos', 'ceo']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin', 'hr', 'cos', 'ceo']::user_role[])
  );

-- Only admins can delete (soft-delete)
CREATE POLICY company_events_delete_admin_policy
  ON public.company_events FOR DELETE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin', 'hr', 'cos', 'ceo']::user_role[])
  );
