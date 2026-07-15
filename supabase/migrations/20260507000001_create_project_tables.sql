-- Migration: Create Project Tracker Tables (Phase 1 of Associate Project + Gamified Leaderboard)
-- Created: 2026-05-07
-- Description: Project shells, contributors, milestones (month/week hierarchy), and checklist items.
--              Mirrors RLS patterns from internships and onboarding tables.

BEGIN;

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_health') THEN
    CREATE TYPE project_health AS ENUM ('on_track', 'at_risk', 'overdue');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_period_type') THEN
    CREATE TYPE milestone_period_type AS ENUM ('month', 'week');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_status') THEN
    CREATE TYPE milestone_status AS ENUM ('not_started', 'in_progress', 'submitted', 'approved', 'overdue');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_item_status') THEN
    CREATE TYPE checklist_item_status AS ENUM ('todo', 'done');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_contributor_role') THEN
    CREATE TYPE project_contributor_role AS ENUM ('lead', 'contributor');
  END IF;
END $$;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  lead_user_id uuid NOT NULL REFERENCES public.users(id),
  supervisor_id uuid REFERENCES public.users(id),
  start_date date NOT NULL,
  target_end_date date NOT NULL,
  status project_status NOT NULL DEFAULT 'planning',
  health project_health NOT NULL DEFAULT 'on_track',
  progress_pct numeric(5,2) NOT NULL DEFAULT 0,
  points_total integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT projects_dates_valid CHECK (target_end_date >= start_date),
  CONSTRAINT projects_progress_valid CHECK (progress_pct >= 0 AND progress_pct <= 100)
);

CREATE INDEX IF NOT EXISTS idx_projects_lead_user_id ON public.projects(lead_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_supervisor_id ON public.projects(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_health ON public.projects(health);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON public.projects(start_date, target_end_date);

CREATE TABLE IF NOT EXISTS public.project_contributors (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  role project_contributor_role NOT NULL DEFAULT 'contributor',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_contributors_user_id ON public.project_contributors(user_id);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_milestone_id uuid REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  period_type milestone_period_type NOT NULL,
  title text NOT NULL,
  description text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  status milestone_status NOT NULL DEFAULT 'not_started',
  progress_pct numeric(5,2) NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.users(id),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT milestone_period_valid CHECK (period_end >= period_start),
  CONSTRAINT milestone_progress_valid CHECK (progress_pct >= 0 AND progress_pct <= 100),
  CONSTRAINT milestone_week_has_parent CHECK (
    (period_type = 'month' AND parent_milestone_id IS NULL)
    OR (period_type = 'week' AND parent_milestone_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_parent ON public.project_milestones(parent_milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_due_date ON public.project_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON public.project_milestones(status);

CREATE TABLE IF NOT EXISTS public.project_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status checklist_item_status NOT NULL DEFAULT 'todo',
  position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_checklist_items_milestone ON public.project_checklist_items(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_checklist_items_status ON public.project_checklist_items(status);

-- ============================================
-- TIMESTAMP + AUDIT TRIGGERS
-- ============================================

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_project_checklist_items_updated_at
  BEFORE UPDATE ON public.project_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_project_milestones_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_project_contributors_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_contributors
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.projects IS 'Project shells owned by an associate lead, with optional contributors and supervisor.';
COMMENT ON TABLE public.project_contributors IS 'Multi-owner join: one lead + many contributors per project.';
COMMENT ON TABLE public.project_milestones IS 'Two-tier hierarchy: monthly milestones (parent NULL) and weekly sub-milestones (parent set). Progress auto-calculated from checklist items.';
COMMENT ON TABLE public.project_checklist_items IS 'Granular tasks within a milestone; flipping to done auto-recalculates milestone and project progress.';

COMMIT;
