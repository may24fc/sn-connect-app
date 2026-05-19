-- Migration: Create project_backlog table (Telegram-to-SN-Connect intake pipeline)
-- Created: 2026-05-19
-- Description:
--   Claimable intake table populated by the Telegram CEO intake pipeline (or the
--   internal /api/projects/intake endpoint). Interns view "claimable" rows in the
--   Project Pool and can accept them; accepting a row also spawns a row in the
--   formal `projects` table and links it via `project_id`.

BEGIN;

CREATE TABLE IF NOT EXISTS public.project_backlog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  problem_statement text NOT NULL,
  objective text NOT NULL,
  technical_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_departments jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority varchar(16) NOT NULL DEFAULT 'Medium',
  status varchar(16) NOT NULL DEFAULT 'claimable',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  source_chat_id text,
  source_message_id text,
  raw_transcript text,
  extraction_model text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_backlog_status_check CHECK (status IN ('claimable', 'accepted', 'archived')),
  CONSTRAINT project_backlog_priority_check CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  CONSTRAINT project_backlog_technical_scope_is_array CHECK (jsonb_typeof(technical_scope) = 'array'),
  CONSTRAINT project_backlog_target_departments_is_array CHECK (jsonb_typeof(target_departments) = 'array'),
  CONSTRAINT project_backlog_accepted_requires_claimer CHECK (
    status <> 'accepted' OR claimed_by IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_project_backlog_status ON public.project_backlog(status);
CREATE INDEX IF NOT EXISTS idx_project_backlog_claimed_by ON public.project_backlog(claimed_by);
CREATE INDEX IF NOT EXISTS idx_project_backlog_created_at ON public.project_backlog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_backlog_project_id ON public.project_backlog(project_id);

CREATE TRIGGER set_project_backlog_updated_at
  BEFORE UPDATE ON public.project_backlog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_project_backlog_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_backlog
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.project_backlog IS 'Claimable project intake captured from Telegram CEO messages or internal intake API. Accepting a row links to a spawned projects row via project_id.';
COMMENT ON COLUMN public.project_backlog.technical_scope IS 'JSON array of strings (tags/tech stack).';
COMMENT ON COLUMN public.project_backlog.target_departments IS 'JSON array of strings (intended departments).';
COMMENT ON COLUMN public.project_backlog.raw_transcript IS 'Original CEO message text or transcribed voice content.';
COMMENT ON COLUMN public.project_backlog.extraction_model IS 'Name of the LLM that produced the structured payload (e.g. gpt-4o-mini).';

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.project_backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_backlog FORCE ROW LEVEL SECURITY;

-- Anyone authenticated can read claimable rows (the public pool).
CREATE POLICY project_backlog_select_claimable_policy ON public.project_backlog
  FOR SELECT TO authenticated
  USING (status = 'claimable');

-- The claimer can always read their own claimed rows.
CREATE POLICY project_backlog_select_owner_policy ON public.project_backlog
  FOR SELECT TO authenticated
  USING (claimed_by = auth.uid());

-- Admins / super_admins can read & manage everything.
CREATE POLICY project_backlog_admin_all_policy ON public.project_backlog
  FOR ALL TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

-- NOTE: INSERTs and UPDATEs from the application happen via the service-role
-- admin client (Inngest jobs, intake webhook, claim endpoint), which bypasses RLS.
-- The claim endpoint enforces "status='claimable'" at the SQL level to avoid
-- race conditions when two interns click Accept simultaneously.

COMMIT;
