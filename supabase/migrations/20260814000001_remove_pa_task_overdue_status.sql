-- Migration: Remove the legacy Overdue status from PA/EA task lookup values.
-- Why: overdue is derived from due date + current date and should not be a workflow status.

BEGIN;

DELETE FROM public.pa_task_statuses
WHERE lower(label) = 'overdue'
  AND deleted_at IS NULL;

COMMIT;

-- Optional manual rollback if you need to reintroduce it intentionally:
-- INSERT INTO public.pa_task_statuses (label, color, is_default, is_terminal, sort_order)
-- VALUES ('Overdue', 'rose', false, true, 60);
