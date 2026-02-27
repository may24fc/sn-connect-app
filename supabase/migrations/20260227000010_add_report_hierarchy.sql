-- Migration: 20260227000010_add_report_hierarchy.sql
-- Description: Adds hierarchical grouping support to reports (V2-6.1)
-- Source: Google Ads Specialist feedback — "Hierarchical grouping (Account > Campaign) for reports."
-- Dependencies: 20260210000002_create_reports_tables.sql

BEGIN;

-- ============================================
-- 1. Add hierarchy columns to reports table
-- ============================================
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS parent_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_group text,
  ADD COLUMN IF NOT EXISTS hierarchy_path text[] DEFAULT '{}';

COMMENT ON COLUMN public.reports.parent_report_id IS 'Self-referencing FK for hierarchical report grouping (e.g., Account > Campaign > Ad Set)';
COMMENT ON COLUMN public.reports.report_group IS 'Group level identifier: account, campaign, ad_set, ad_group, etc.';
COMMENT ON COLUMN public.reports.hierarchy_path IS 'Breadcrumb array for display: e.g., ARRAY[''Account A'', ''Campaign B'']';

-- ============================================
-- 2. Create indexes for hierarchy queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reports_parent_report_id
  ON public.reports(parent_report_id)
  WHERE parent_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_report_group
  ON public.reports(report_group)
  WHERE report_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_hierarchy_path
  ON public.reports USING GIN(hierarchy_path)
  WHERE hierarchy_path IS NOT NULL AND array_length(hierarchy_path, 1) > 0;

-- ============================================
-- 3. Create helper function to get report children
-- ============================================
CREATE OR REPLACE FUNCTION get_report_children(parent_id uuid)
RETURNS SETOF public.reports AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.reports
  WHERE parent_report_id = parent_id
    AND deleted_at IS NULL
  ORDER BY report_group, created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_report_children(uuid) IS 'Returns all direct child reports of the given parent report';

-- ============================================
-- 4. Create recursive function to get full report tree
-- ============================================
CREATE OR REPLACE FUNCTION get_report_tree(root_id uuid)
RETURNS TABLE (
  id uuid,
  parent_report_id uuid,
  report_type text,
  report_group text,
  hierarchy_path text[],
  status text,
  period_start date,
  period_end date,
  notes text,
  depth integer
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE report_tree AS (
    -- Base case: the root report
    SELECT
      r.id,
      r.parent_report_id,
      r.report_type,
      r.report_group,
      r.hierarchy_path,
      r.status,
      r.period_start,
      r.period_end,
      r.notes,
      0 AS depth
    FROM public.reports r
    WHERE r.id = root_id
      AND r.deleted_at IS NULL

    UNION ALL

    -- Recursive case: child reports
    SELECT
      child.id,
      child.parent_report_id,
      child.report_type,
      child.report_group,
      child.hierarchy_path,
      child.status,
      child.period_start,
      child.period_end,
      child.notes,
      rt.depth + 1
    FROM public.reports child
    INNER JOIN report_tree rt ON child.parent_report_id = rt.id
    WHERE child.deleted_at IS NULL
  )
  SELECT * FROM report_tree
  ORDER BY depth, report_group, period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_report_tree(uuid) IS 'Returns the full hierarchical tree starting from a given root report';

-- ============================================
-- 5. Create view for top-level (root) reports
-- ============================================
CREATE OR REPLACE VIEW public.root_reports AS
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
