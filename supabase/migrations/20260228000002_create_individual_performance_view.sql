-- V2-2.2: Individual Performance Summary View
-- Aggregates KPI, OKR, and review data per employee for performance dashboards.

CREATE OR REPLACE VIEW public.individual_performance_summary AS
SELECT
  e.id AS employee_id,
  u.id AS user_id,
  COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') AS full_name,
  e.position,
  d.name AS department_name,
  e.department_id,
  u.avatar_url,
  -- KPI Summary
  COUNT(DISTINCT k.id) AS total_kpis,
  AVG(CASE WHEN k.target_value > 0
      THEN (k.current_value / k.target_value) * 100
      ELSE 0 END) AS avg_kpi_progress,
  COUNT(DISTINCT CASE WHEN k.status = 'completed' THEN k.id END) AS completed_kpis,
  -- OKR Summary
  COUNT(DISTINCT o.id) AS total_okrs,
  AVG(o.progress) AS avg_okr_progress,
  COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_okrs,
  -- Review Summary
  MAX(pr.final_rating) AS latest_review_rating,
  MAX(pr.completed_at) AS latest_review_date,
  COUNT(DISTINCT pr.id) AS total_reviews
FROM public.employees e
JOIN public.users u ON e.user_id = u.id
LEFT JOIN public.departments d ON e.department_id = d.id
LEFT JOIN public.kpis k ON k.employee_id = e.id
LEFT JOIN public.okrs o ON o.employee_id = e.id
LEFT JOIN public.performance_reviews pr ON pr.employee_id = e.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, u.id, e.first_name, e.last_name, e.position, d.name, e.department_id, u.avatar_url;

-- Grant access to authenticated users
GRANT SELECT ON public.individual_performance_summary TO authenticated;

COMMENT ON VIEW public.individual_performance_summary IS 'Per-employee performance summary aggregating KPIs, OKRs, and reviews';
