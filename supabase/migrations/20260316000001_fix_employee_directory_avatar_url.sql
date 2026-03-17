-- Migration: Fix employee_directory view to include avatar_url from auth user metadata
-- The avatar_url is stored in auth.users.raw_user_meta_data->>'avatar_url' when a user
-- uploads a profile picture via /api/profile/avatar. The previous view definition
-- joined auth.users but never selected the avatar_url field, causing admin/super-admin
-- pages to always show initials fallback instead of the actual profile picture.

-- Add avatar_url column to public.users if not already present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Recreate the employee_directory view with avatar_url
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
  ) AS pending_changes_count,
  -- Avatar URL: prefer public.users column (kept in sync on upload), fall back to auth metadata
  COALESCE(u.avatar_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
LEFT JOIN public.employees e ON e.user_id = u.id
LEFT JOIN public.internships i ON i.employee_id = e.id AND i.status = 'active'
WHERE u.deleted_at IS NULL AND (e.deleted_at IS NULL OR e.id IS NULL);

GRANT SELECT ON public.employee_directory TO authenticated;

COMMENT ON VIEW public.employee_directory IS 'Unified employee directory view with all profile details, pending change request counts, and avatar URL from auth metadata';

-- Backfill public.users.avatar_url from existing auth user metadata
-- so existing uploaded avatars are immediately visible
UPDATE public.users u
SET avatar_url = au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE au.id = u.id
  AND au.raw_user_meta_data->>'avatar_url' IS NOT NULL
  AND u.avatar_url IS NULL;
