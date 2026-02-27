-- V2-2.1: Master Employee Directory View
-- This view provides a unified view of all employees and interns for the directory.

CREATE OR REPLACE VIEW public.employee_directory AS
SELECT
  u.id AS user_id,
  e.id AS employee_id,
  u.avatar_url,
  COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') AS full_name,
  e.first_name,
  e.last_name,
  u.role,
  d.name AS department_name,
  e.department_id,
  e.position,
  e.status,
  e.employment_type,
  e.date_hired AS start_date,
  u.email,
  e.contact_number,
  e.birthday,
  i.id AS internship_id,
  i.status AS internship_status,
  i.completed_hours,
  i.required_hours,
  i.school,
  i.program
FROM public.users u
LEFT JOIN public.employees e ON e.user_id = u.id
LEFT JOIN public.departments d ON e.department_id = d.id
LEFT JOIN public.internships i ON i.employee_id = e.id AND i.status = 'active'
WHERE u.deleted_at IS NULL AND (e.deleted_at IS NULL OR e.id IS NULL);

-- Grant access to authenticated users (RLS on underlying tables still applies)
GRANT SELECT ON public.employee_directory TO authenticated;

COMMENT ON VIEW public.employee_directory IS 'Unified employee directory view joining users, employees, departments, and active internships';
