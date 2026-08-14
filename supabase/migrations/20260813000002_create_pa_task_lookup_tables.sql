-- Migration: Create pa_task lookup tables (statuses, priorities, categories)
-- Created: 2026-08-13
-- Description: User-manageable lookup lists for the PA/EA Task Tracker module.
--   Unlike the existing task_status/task_priority Postgres enums on public.tasks,
--   these are plain tables so PA/EA managers can add/rename/reorder values
--   without an engineer shipping a migration each time.
-- Dependencies: public.pa_task_access_grants (user_has_pa_task_access, user_can_manage_pa_task_lookups)

BEGIN;

-- ============================================
-- Statuses
-- ============================================
CREATE TABLE public.pa_task_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT 'zinc',
  is_default boolean NOT NULL DEFAULT false,
  is_terminal boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_pa_task_statuses_label_active
  ON public.pa_task_statuses (lower(label))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pa_task_statuses_sort_order
  ON public.pa_task_statuses (sort_order)
  WHERE deleted_at IS NULL;

-- ============================================
-- Priorities
-- ============================================
CREATE TABLE public.pa_task_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT 'zinc',
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_pa_task_priorities_label_active
  ON public.pa_task_priorities (lower(label))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pa_task_priorities_sort_order
  ON public.pa_task_priorities (sort_order)
  WHERE deleted_at IS NULL;

-- ============================================
-- Categories
-- ============================================
CREATE TABLE public.pa_task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT 'zinc',
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_pa_task_categories_label_active
  ON public.pa_task_categories (lower(label))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pa_task_categories_sort_order
  ON public.pa_task_categories (sort_order)
  WHERE deleted_at IS NULL;

-- ============================================
-- updated_at triggers (reuses public.handle_updated_at from 20260123000007)
-- ============================================
CREATE TRIGGER trigger_pa_task_statuses_updated_at
  BEFORE UPDATE ON public.pa_task_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_pa_task_priorities_updated_at
  BEFORE UPDATE ON public.pa_task_priorities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_pa_task_categories_updated_at
  BEFORE UPDATE ON public.pa_task_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.pa_task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_statuses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_priorities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_categories FORCE ROW LEVEL SECURITY;

-- SELECT: any grantee (contributor or manager) + admin/super_admin can read all three lists
CREATE POLICY pa_task_statuses_select_policy ON public.pa_task_statuses
  FOR SELECT
  USING (deleted_at IS NULL AND public.user_has_pa_task_access(auth.uid()));

CREATE POLICY pa_task_priorities_select_policy ON public.pa_task_priorities
  FOR SELECT
  USING (deleted_at IS NULL AND public.user_has_pa_task_access(auth.uid()));

CREATE POLICY pa_task_categories_select_policy ON public.pa_task_categories
  FOR SELECT
  USING (deleted_at IS NULL AND public.user_has_pa_task_access(auth.uid()));

-- INSERT/UPDATE/DELETE: manager-tier grantees + admin/super_admin only
CREATE POLICY pa_task_statuses_insert_policy ON public.pa_task_statuses
  FOR INSERT
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));
CREATE POLICY pa_task_statuses_update_policy ON public.pa_task_statuses
  FOR UPDATE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()))
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));
CREATE POLICY pa_task_statuses_delete_policy ON public.pa_task_statuses
  FOR DELETE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()));

CREATE POLICY pa_task_priorities_insert_policy ON public.pa_task_priorities
  FOR INSERT
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));
CREATE POLICY pa_task_priorities_update_policy ON public.pa_task_priorities
  FOR UPDATE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()))
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));
CREATE POLICY pa_task_priorities_delete_policy ON public.pa_task_priorities
  FOR DELETE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()));

CREATE POLICY pa_task_categories_insert_policy ON public.pa_task_categories
  FOR INSERT
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));
CREATE POLICY pa_task_categories_update_policy ON public.pa_task_categories
  FOR UPDATE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()))
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));
CREATE POLICY pa_task_categories_delete_policy ON public.pa_task_categories
  FOR DELETE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()));

-- ============================================
-- Seed defaults so the lists aren't empty on day one
-- ============================================
INSERT INTO public.pa_task_statuses (label, color, is_default, is_terminal, sort_order) VALUES
  ('Not Started', 'zinc', true, false, 10),
  ('In Progress', 'sky', false, false, 20),
  ('Waiting for Response', 'amber', false, false, 30),
  ('Scheduled', 'violet', false, false, 40),
  ('Completed', 'emerald', false, true, 50),
  ('Cancelled', 'zinc', false, true, 60),
  ('Recurring', 'orange', false, false, 70);

INSERT INTO public.pa_task_priorities (label, color, is_default, sort_order) VALUES
  ('Critical', 'rose', false, 10),
  ('High', 'orange', false, 20),
  ('Medium', 'amber', true, 30),
  ('Low', 'emerald', false, 40);

INSERT INTO public.pa_task_categories (label, color, is_default, sort_order) VALUES
  ('Property', 'sky', false, 10),
  ('Business', 'violet', false, 20),
  ('Personal', 'emerald', false, 30),
  ('Errands', 'amber', false, 40),
  ('Admin', 'zinc', true, 50);

COMMENT ON TABLE public.pa_task_statuses IS 'User-manageable status list for the PA/EA Task Tracker (replaces a hardcoded enum so PAs can add/rename statuses).';
COMMENT ON TABLE public.pa_task_priorities IS 'User-manageable priority list for the PA/EA Task Tracker.';
COMMENT ON TABLE public.pa_task_categories IS 'User-manageable category list for the PA/EA Task Tracker.';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.pa_task_categories CASCADE;
DROP TABLE IF EXISTS public.pa_task_priorities CASCADE;
DROP TABLE IF EXISTS public.pa_task_statuses CASCADE;

COMMIT;
*/
