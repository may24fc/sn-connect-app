BEGIN;

CREATE TABLE IF NOT EXISTS public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_divisions_name ON public.divisions(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_divisions_deleted_at ON public.divisions(deleted_at);

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS divisions_select_policy ON public.divisions;
CREATE POLICY divisions_select_policy ON public.divisions
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS divisions_insert_policy ON public.divisions;
CREATE POLICY divisions_insert_policy ON public.divisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS divisions_update_policy ON public.divisions;
CREATE POLICY divisions_update_policy ON public.divisions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS divisions_delete_policy ON public.divisions;
CREATE POLICY divisions_delete_policy ON public.divisions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON TABLE public.divisions IS 'Organizational divisions or business units used for employee placement.';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_division_id ON public.users(division_id) WHERE deleted_at IS NULL;

ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_division_id
  ON public.onboarding_profiles(division_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS division text;

CREATE INDEX IF NOT EXISTS idx_employees_division ON public.employees(division) WHERE deleted_at IS NULL;

ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS division text;

CREATE INDEX IF NOT EXISTS idx_internships_division ON public.internships(division) WHERE deleted_at IS NULL;

UPDATE public.departments
SET name = 'HR',
    description = 'Human resources and people operations',
    updated_at = now(),
    deleted_at = NULL
WHERE lower(name) = lower('Human Resources')
  AND NOT EXISTS (
    SELECT 1
    FROM public.departments d2
    WHERE lower(d2.name) = lower('HR')
      AND d2.id <> public.departments.id
  );

INSERT INTO public.departments (name, description)
VALUES
  ('Admin', 'Administrative support and executive operations'),
  ('EA/PA', 'Executive and personal assistant support'),
  ('HR', 'Human resources and people operations'),
  ('Marketing', 'Brand, growth, and communications'),
  ('AI Interns', 'AI internship and assistant programs'),
  ('Project Management', 'Project delivery and coordination'),
  ('Operations', 'Business operations and execution')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    deleted_at = NULL,
    updated_at = now();

INSERT INTO public.divisions (name, description)
VALUES
  ('SFO', 'SN Food Operations'),
  ('UHP', 'Universal Healthcare Products'),
  ('Property Development', 'Property development and construction initiatives'),
  ('SN International Group', 'Shared support across all SN business units'),
  ('Property Investment', 'Property investment and asset portfolio management'),
  ('Others', 'Other or uncategorized business division')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    deleted_at = NULL,
    updated_at = now();

UPDATE public.users u
SET division_id = dv.id,
    updated_at = now()
FROM public.departments d
JOIN public.divisions dv
  ON lower(dv.name) = lower(d.name)
  AND dv.deleted_at IS NULL
WHERE u.department_id = d.id
  AND u.division_id IS NULL;

UPDATE public.onboarding_profiles op
SET division_id = dv.id,
    updated_at = now()
FROM public.departments d
JOIN public.divisions dv
  ON lower(dv.name) = lower(d.name)
  AND dv.deleted_at IS NULL
WHERE op.department_id = d.id
  AND op.division_id IS NULL;

UPDATE public.employees e
SET division = e.department,
    updated_at = now()
WHERE e.deleted_at IS NULL
  AND e.division IS NULL
  AND e.department IN (
    'SFO',
    'UHP',
    'Property Development',
    'SN International Group',
    'Property Investment',
    'Others'
  );

UPDATE public.employees e
SET division = dv.name,
    updated_at = now()
FROM public.users u
JOIN public.divisions dv ON dv.id = u.division_id
WHERE e.user_id = u.id
  AND e.deleted_at IS NULL
  AND (e.division IS NULL OR btrim(e.division) = '');

UPDATE public.internships i
SET division = i.department,
    updated_at = now()
WHERE i.deleted_at IS NULL
  AND i.division IS NULL
  AND i.department IN (
    'SFO',
    'UHP',
    'Property Development',
    'SN International Group',
    'Property Investment',
    'Others'
  );

UPDATE public.internships i
SET division = dv.name,
    updated_at = now()
FROM public.employees e
JOIN public.users u ON u.id = e.user_id
JOIN public.divisions dv ON dv.id = u.division_id
WHERE i.employee_id = e.id
  AND i.deleted_at IS NULL
  AND (i.division IS NULL OR btrim(i.division) = '');

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

COMMENT ON VIEW public.employee_directory IS 'Unified employee directory view with normalized department and division placement, pending change request counts, and avatar URL.';

COMMIT;