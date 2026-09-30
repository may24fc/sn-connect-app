-- Unified Projects + Tasks tracker (phase 1).
-- Additive schema only: the legacy project checklist remains available during rollout.

ALTER TYPE public.project_health ADD VALUE IF NOT EXISTS 'blocked';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_checklist_item_id uuid
    REFERENCES public.project_checklist_items(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_legacy_checklist_item_id
  ON public.tasks(legacy_checklist_item_id)
  WHERE legacy_checklist_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_rollup
  ON public.tasks(project_id, status)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;

COMMENT ON COLUMN public.tasks.blocked_reason IS
  'Short, supervisor-visible explanation required when a task is blocked.';
COMMENT ON COLUMN public.tasks.legacy_checklist_item_id IS
  'Temporary idempotent bridge from the former project checklist execution model.';
