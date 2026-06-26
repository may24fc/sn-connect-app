-- 2026-06-25: Scope weekly commitments by project so each user can lock
-- one commitment set per project per ISO week.

ALTER TABLE public.weekly_commitments
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Backfill project_id for existing rows from any linked commitment item.
UPDATE public.weekly_commitments AS wc
SET project_id = src.project_id
FROM (
  SELECT DISTINCT ON (items.commitment_id)
    items.commitment_id,
    milestones.project_id
  FROM public.weekly_commitment_items AS items
  INNER JOIN public.project_milestones AS milestones
    ON milestones.id = items.milestone_id
  WHERE milestones.project_id IS NOT NULL
  ORDER BY items.commitment_id, items.created_at ASC
) AS src
WHERE wc.id = src.commitment_id
  AND wc.project_id IS NULL;

ALTER TABLE public.weekly_commitments
  DROP CONSTRAINT IF EXISTS weekly_commitments_user_week_unique;

CREATE INDEX IF NOT EXISTS idx_weekly_commitments_project_id
  ON public.weekly_commitments(project_id);

-- Active commitment uniqueness: one row per user+week+project.
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_commitments_user_week_project_active
  ON public.weekly_commitments(user_id, iso_week, iso_year, project_id)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;
