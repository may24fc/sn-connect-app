-- Migration: Add date_terminated to employees and expose it in employee_directory view
-- Purpose: Track when employees were officially terminated so that "Remove" becomes a
--          "Terminate" action that preserves the record in the Former Employees tab
--          instead of soft-deleting it.

BEGIN;

-- 1. Add date_terminated column to the employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_terminated timestamptz;

-- 2. Rebuild the employee_directory view to include date_terminated
--    (Supabase views must be explicitly recreated when a new column is added to a source table)
DROP VIEW IF EXISTS public.employee_directory;

CREATE VIEW public.employee_directory AS
SELECT
  u.id AS user_id,
  e.id AS employee_id,
  COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') AS full_name,
  e.first_name,
  e.middle_name,
  e.last_name,
  u.role,
  COALESCE(
    CASE
      WHEN dept.name IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL
      ELSE dept.name
    END,
    CASE
      WHEN e.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL
      ELSE e.department
    END,
    CASE
      WHEN i.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL
      ELSE i.department
    END
  ) AS department_name,
  CASE
    WHEN dept.name IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL
    ELSE u.department_id
  END AS department_id,
  COALESCE(
    div.name,
    div_from_department.name,
    NULLIF(e.division, ''),
    CASE
      WHEN e.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN e.department
      ELSE NULL
    END,
    NULLIF(i.division, ''),
    CASE
      WHEN i.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN i.department
      ELSE NULL
    END
  ) AS division_name,
  COALESCE(u.division_id, div_from_department.id) AS division_id,
  e.position,
  u.status,
  e.employment_type,
  e.date_hired AS start_date,
  e.date_terminated,
  COALESCE(e.company_email, au.email) AS email,
  e.phone AS contact_number,
  e.birthday,
  e.nationality,
  e.education,
  e.address,
  e.city,
  e.province,
  e.postal_code,
  e.linkedin_profile_url,
  e.emergency_contact_name,
  e.emergency_contact_number,
  e.emergency_contact_relationship,
  e.personal_email,
  e.payment_account_name,
  e.payment_account_number,
  e.payment_email,
  e.payment_phone_number,
  e.payment_address,
  e.payment_city,
  e.payment_province,
  e.payment_zipcode,
  i.id AS internship_id,
  i.status AS internship_status,
  i.completed_hours,
  i.required_hours,
  i.school,
  i.program,
  (
    SELECT count(*)::int FROM public.profile_change_requests pcr
    WHERE pcr.employee_id = e.id AND pcr.status = 'pending' AND pcr.deleted_at IS NULL
  ) AS pending_changes_count,
  COALESCE(u.avatar_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
LEFT JOIN public.employees e ON e.user_id = u.id
LEFT JOIN public.internships i ON i.employee_id = e.id AND i.status = 'active'
LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
LEFT JOIN public.divisions div ON div.id = u.division_id AND div.deleted_at IS NULL
LEFT JOIN public.divisions div_from_department
  ON lower(div_from_department.name) = lower(dept.name)
  AND div_from_department.deleted_at IS NULL
WHERE u.deleted_at IS NULL AND (e.deleted_at IS NULL OR e.id IS NULL);

GRANT SELECT ON public.employee_directory TO authenticated;

COMMENT ON VIEW public.employee_directory IS 'Unified employee directory view with normalized department and division placement, pending change request counts, avatar URL, and termination date.';

COMMENT ON COLUMN public.employees.date_terminated IS 'Timestamp when the employee was officially terminated. Null for active, inactive, and on_leave statuses.';

COMMIT;
