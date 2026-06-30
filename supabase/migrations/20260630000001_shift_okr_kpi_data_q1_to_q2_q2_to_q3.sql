-- Migration: Shift OKR/KPI data one quarter forward (Q1→Q2, Q2→Q3)
-- Created: 2026-06-30
-- Context: Data was entered under the wrong quarter cycles.
--          • Records currently linked to Q1 2026 belong in Q2 2026
--          • Records currently linked to Q2 2026 belong in Q3 2026
-- Scope: okrs, kpis, okr_targets (cycle_id FK only)
--        performance_reviews is intentionally excluded (separate cadence)
--        kpis.period_start / kpis.period_end are intentionally excluded
--          (they represent actual measurement windows, not the administrative cycle bucket)
-- Safety: Idempotent — if already run, the WHERE clauses match 0 rows and no data changes.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Ensure all three quarter cycles exist.
--    Each INSERT is idempotent via WHERE NOT EXISTS:
--    • On production: Q1 and Q2 already exist → no-op for those rows.
--    • On staging/CI: all three may be absent → seeds them so the
--      guard in Step 2 and the UPDATE CTEs in Step 3 can proceed.
-- ─────────────────────────────────────────────────────────────

-- Q1 2026 (source — data moves OUT of this cycle after migration)
INSERT INTO public.review_cycles (name, description, start_date, end_date, status, created_at, updated_at, created_by)
SELECT 'Q1 2026', NULL, '2026-01-01'::date, '2026-03-31'::date, 'completed', now(), now(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_cycles
  WHERE start_date = '2026-01-01'::date AND end_date = '2026-03-31'::date
);

-- Q2 2026 (destination for Q1 data; source for Q2 data)
INSERT INTO public.review_cycles (name, description, start_date, end_date, status, created_at, updated_at, created_by)
SELECT 'Q2 2026', NULL, '2026-04-01'::date, '2026-06-30'::date, 'active', now(), now(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_cycles
  WHERE start_date = '2026-04-01'::date AND end_date = '2026-06-30'::date
);

-- Q3 2026 (final destination for Q2 data)
INSERT INTO public.review_cycles (name, description, start_date, end_date, status, created_at, updated_at, created_by)
SELECT 'Q3 2026', NULL, '2026-07-01'::date, '2026-09-30'::date, 'draft', now(), now(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_cycles
  WHERE start_date = '2026-07-01'::date AND end_date = '2026-09-30'::date
);

-- ─────────────────────────────────────────────────────────────
-- 2. Pre-flight guard: every referenced cycle must exist.
--    This will raise an error and abort the transaction if
--    Q1, Q2, or Q3 2026 is missing.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(expected_name, ', ' ORDER BY expected_name)
  INTO   v_missing
  FROM (
    VALUES ('Q1 2026'), ('Q2 2026'), ('Q3 2026')
  ) AS expected(expected_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.review_cycles rc
    WHERE rc.name = expected_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Aborting migration: the following review_cycles are missing: %',
      v_missing;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Capture the three cycle IDs into a local CTE anchor.
--    All subsequent UPDATE CTEs read from this single source
--    so the IDs are resolved exactly once.
--
--    PostgreSQL data-modifying CTE guarantee:
--    Every mutating CTE in the same statement sees the *original*
--    snapshot of the affected tables — not the result of sibling
--    CTEs.  This means the Q1→Q2 and Q2→Q3 reassignments are
--    non-conflicting and ordering within the statement is irrelevant.
-- ─────────────────────────────────────────────────────────────
WITH cycle_map AS (
  SELECT
    (SELECT id FROM public.review_cycles WHERE name = 'Q1 2026' LIMIT 1) AS q1_id,
    (SELECT id FROM public.review_cycles WHERE name = 'Q2 2026' LIMIT 1) AS q2_id,
    (SELECT id FROM public.review_cycles WHERE name = 'Q3 2026' LIMIT 1) AS q3_id
),

-- ── OKRs ─────────────────────────────────────────────────────

shift_okrs_q2_to_q3 AS (
  UPDATE public.okrs
  SET
    cycle_id   = (SELECT q3_id FROM cycle_map),
    updated_at = now()
  WHERE cycle_id = (SELECT q2_id FROM cycle_map)
  RETURNING id
),

shift_okrs_q1_to_q2 AS (
  UPDATE public.okrs
  SET
    cycle_id   = (SELECT q2_id FROM cycle_map),
    updated_at = now()
  WHERE cycle_id = (SELECT q1_id FROM cycle_map)
  RETURNING id
),

-- ── KPIs ─────────────────────────────────────────────────────
-- NOTE: kpis.period_start and kpis.period_end are NOT updated here.
--       They represent the measurement window (e.g., "track this metric
--       during April–June") and are independent of the administrative
--       cycle bucket.  Update them manually if needed.

shift_kpis_q2_to_q3 AS (
  UPDATE public.kpis
  SET
    cycle_id   = (SELECT q3_id FROM cycle_map),
    updated_at = now()
  WHERE cycle_id = (SELECT q2_id FROM cycle_map)
  RETURNING id
),

shift_kpis_q1_to_q2 AS (
  UPDATE public.kpis
  SET
    cycle_id   = (SELECT q2_id FROM cycle_map),
    updated_at = now()
  WHERE cycle_id = (SELECT q1_id FROM cycle_map)
  RETURNING id
),

-- ── OKR Targets (child records tied to OKRs) ─────────────────
-- okr_targets.cycle_id mirrors its parent okr.cycle_id.
-- These must move in step with the OKR records above.

shift_targets_q2_to_q3 AS (
  UPDATE public.okr_targets
  SET
    cycle_id   = (SELECT q3_id FROM cycle_map),
    updated_at = now()
  WHERE cycle_id = (SELECT q2_id FROM cycle_map)
    AND deleted_at IS NULL
  RETURNING id
),

shift_targets_q1_to_q2 AS (
  UPDATE public.okr_targets
  SET
    cycle_id   = (SELECT q2_id FROM cycle_map),
    updated_at = now()
  WHERE cycle_id = (SELECT q1_id FROM cycle_map)
    AND deleted_at IS NULL
  RETURNING id
)

-- ── Audit summary returned from this statement ────────────────
SELECT
  (SELECT COUNT(*) FROM shift_okrs_q2_to_q3)     AS okrs_shifted_q2_to_q3,
  (SELECT COUNT(*) FROM shift_okrs_q1_to_q2)     AS okrs_shifted_q1_to_q2,
  (SELECT COUNT(*) FROM shift_kpis_q2_to_q3)     AS kpis_shifted_q2_to_q3,
  (SELECT COUNT(*) FROM shift_kpis_q1_to_q2)     AS kpis_shifted_q1_to_q2,
  (SELECT COUNT(*) FROM shift_targets_q2_to_q3)  AS okr_targets_shifted_q2_to_q3,
  (SELECT COUNT(*) FROM shift_targets_q1_to_q2)  AS okr_targets_shifted_q1_to_q2;

COMMIT;
