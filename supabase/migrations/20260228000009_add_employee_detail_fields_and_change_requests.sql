-- Migration: Add missing employee detail fields + profile change requests table
-- Fields requested: nationality, education, linkedin, emergency_contact_relationship,
-- payment/allowance details (account_name, account_number, email, phone, address with zipcode)

-- =============================================================================
-- 1) Add missing columns to employees table
-- =============================================================================

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS education text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS linkedin_profile_url text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

-- Payment / allowance columns (mirroring onboarding_profiles naming)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_account_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_account_number text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_email text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_phone_number text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_address text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_city text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_province text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS payment_zipcode text;

-- =============================================================================
-- 2) Create profile_change_requests table
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_change_status') THEN
    CREATE TYPE public.profile_change_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  status public.profile_change_status DEFAULT 'pending' NOT NULL,
  changes jsonb NOT NULL,          -- { field_name: { old: "...", new: "..." } }
  review_note text,
  requested_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_employee_id ON public.profile_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status ON public.profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_requested_by ON public.profile_change_requests(requested_by);

-- RLS
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_change_requests FORCE ROW LEVEL SECURITY;

-- Employees can view their own change requests
DROP POLICY IF EXISTS profile_change_requests_select_own_policy ON public.profile_change_requests;
CREATE POLICY profile_change_requests_select_own_policy ON public.profile_change_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- Employees can create change requests for themselves
DROP POLICY IF EXISTS profile_change_requests_insert_own_policy ON public.profile_change_requests;
CREATE POLICY profile_change_requests_insert_own_policy ON public.profile_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Only admins can update (approve/reject) change requests
DROP POLICY IF EXISTS profile_change_requests_update_admin_policy ON public.profile_change_requests;
CREATE POLICY profile_change_requests_update_admin_policy ON public.profile_change_requests
  FOR UPDATE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[]));

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_profile_change_requests_updated_at ON public.profile_change_requests;
CREATE TRIGGER set_profile_change_requests_updated_at
  BEFORE UPDATE ON public.profile_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grants
GRANT ALL ON public.profile_change_requests TO authenticated;

-- =============================================================================
-- 3) Recreate employee_directory view with new fields
-- =============================================================================

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
  e.department AS department_name,
  u.department_id,
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
  -- Payment / allowance fields
  e.payment_account_name,
  e.payment_account_number,
  e.payment_email,
  e.payment_phone_number,
  e.payment_address,
  e.payment_city,
  e.payment_province,
  e.payment_zipcode,
  -- Existing internship fields
  i.id AS internship_id,
  i.status AS internship_status,
  i.completed_hours,
  i.required_hours,
  i.school,
  i.program,
  -- Pending change requests count
  (
    SELECT count(*)::int FROM public.profile_change_requests pcr
    WHERE pcr.employee_id = e.id AND pcr.status = 'pending' AND pcr.deleted_at IS NULL
  ) AS pending_changes_count
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
LEFT JOIN public.employees e ON e.user_id = u.id
LEFT JOIN public.internships i ON i.employee_id = e.id AND i.status = 'active'
WHERE u.deleted_at IS NULL AND (e.deleted_at IS NULL OR e.id IS NULL);

GRANT SELECT ON public.employee_directory TO authenticated;

COMMENT ON VIEW public.employee_directory IS 'Unified employee directory view with all profile details and pending change request counts';

COMMENT ON TABLE public.profile_change_requests IS 'Tracks employee-initiated profile edit requests pending admin approval';
