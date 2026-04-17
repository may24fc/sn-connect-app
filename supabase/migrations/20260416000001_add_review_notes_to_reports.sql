BEGIN;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS review_notes text;

DROP VIEW IF EXISTS public.root_reports;

CREATE VIEW public.root_reports AS
SELECT
  r.*,
  (
    SELECT COUNT(*)::integer
    FROM public.reports children
    WHERE children.parent_report_id = r.id
      AND children.deleted_at IS NULL
  ) AS child_count
FROM public.reports r
WHERE r.parent_report_id IS NULL
  AND r.deleted_at IS NULL;

COMMENT ON VIEW public.root_reports IS 'View showing only top-level reports with their child counts';

COMMIT;