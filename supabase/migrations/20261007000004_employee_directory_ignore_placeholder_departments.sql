-- Migration: Treat placeholder department text as "no department" in employee_directory
-- Purpose: employees.department is NOT NULL, so invite, onboarding approval and the employee
--          update route store 'Unassigned' (older rows: 'Assigned Department') when a person has no
--          department. The view previously surfaced that text as a real department_name and preferred
--          it over the active internship's department. Placeholders and blank text now fall through.
-- Uses CREATE OR REPLACE (same columns, same order) because intern digest views depend on this view.

BEGIN;

CREATE OR REPLACE VIEW public.employee_directory AS
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
      WHEN e.department IN ('Unassigned', 'Assigned Department') THEN NULL
      ELSE NULLIF(BTRIM(e.department), '')
    END,
    CASE
      WHEN i.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL
      WHEN i.department IN ('Unassigned', 'Assigned Department') THEN NULL
      ELSE NULLIF(BTRIM(i.department), '')
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

COMMENT ON VIEW public.employee_directory IS 'Unified employee directory view with normalized department and division placement (placeholder department text such as ''Unassigned'' is treated as no department), pending change request counts, avatar URL, and termination date.';

COMMIT;
