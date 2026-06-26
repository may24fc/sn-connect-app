BEGIN;

-- Normalize any quarter-labeled cycles to canonical calendar quarter boundaries.
WITH quarter_named_cycles AS (
  SELECT
    id,
    substring(name FROM '^Q([1-4])')::integer AS quarter_number,
    substring(name FROM '([0-9]{4})$')::integer AS cycle_year
  FROM public.review_cycles
  WHERE name ~ '^Q[1-4][[:space:]]+[0-9]{4}$'
),
normalized_cycles AS (
  SELECT
    id,
    format('Q%s %s', quarter_number, cycle_year) AS normalized_name,
    make_date(cycle_year, ((quarter_number - 1) * 3) + 1, 1) AS normalized_start_date,
    (make_date(cycle_year, ((quarter_number - 1) * 3) + 4, 1) - INTERVAL '1 day')::date AS normalized_end_date
  FROM quarter_named_cycles
)
UPDATE public.review_cycles AS rc
SET
  name = nc.normalized_name,
  start_date = nc.normalized_start_date,
  end_date = nc.normalized_end_date,
  updated_at = now()
FROM normalized_cycles AS nc
WHERE rc.id = nc.id
  AND (
    rc.name IS DISTINCT FROM nc.normalized_name
    OR rc.start_date IS DISTINCT FROM nc.normalized_start_date
    OR rc.end_date IS DISTINCT FROM nc.normalized_end_date
  );

-- Keep a single active cycle to avoid ambiguous cadence resolution.
WITH ranked_active AS (
  SELECT
    id,
    row_number() OVER (
      ORDER BY start_date DESC, updated_at DESC, created_at DESC
    ) AS rn
  FROM public.review_cycles
  WHERE status = 'active'
)
UPDATE public.review_cycles AS rc
SET
  status = 'completed',
  updated_at = now()
FROM ranked_active AS ra
WHERE rc.id = ra.id
  AND ra.rn > 1
  AND rc.status = 'active';

-- Ensure current-year Q2 exists for continuity if it was never created.
INSERT INTO public.review_cycles (
  name,
  description,
  start_date,
  end_date,
  status,
  created_at,
  updated_at,
  created_by
)
SELECT
  format('Q2 %s', extract(year FROM now())::integer),
  NULL,
  make_date(extract(year FROM now())::integer, 4, 1),
  make_date(extract(year FROM now())::integer, 6, 30),
  'draft',
  now(),
  now(),
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.review_cycles
  WHERE start_date = make_date(extract(year FROM now())::integer, 4, 1)
    AND end_date = make_date(extract(year FROM now())::integer, 6, 30)
);

-- Enforce exactly one active cycle at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS uq_review_cycles_single_active
  ON public.review_cycles ((1))
  WHERE status = 'active';

COMMIT;
