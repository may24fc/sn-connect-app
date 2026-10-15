-- Controlled reviewer access and first-class account populations.
-- Existing accounts remain workforce accounts unless explicitly reclassified.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reviewer';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_kind') THEN
    CREATE TYPE public.account_kind AS ENUM ('workforce', 'reviewer', 'test', 'service');
  END IF;
END$$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_kind public.account_kind NOT NULL DEFAULT 'workforce',
  ADD COLUMN IF NOT EXISTS account_purpose text,
  ADD COLUMN IF NOT EXISTS sponsor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

UPDATE public.users u
SET
  account_kind = 'test',
  account_purpose = COALESCE(u.account_purpose, 'Automated latency measurement')
FROM auth.users au
WHERE au.id = u.id
  AND lower(au.email) = 'latency-bench@example.com';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_reviewer_identity_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_reviewer_identity_check CHECK (
    (role::text <> 'reviewer' AND account_kind <> 'reviewer')
    OR (
      role::text = 'reviewer'
      AND account_kind = 'reviewer'
      AND sponsor_user_id IS NOT NULL
      AND NULLIF(BTRIM(account_purpose), '') IS NOT NULL
      AND access_expires_at IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_users_account_kind
  ON public.users(account_kind) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_access_expiry
  ON public.users(access_expires_at)
  WHERE account_kind = 'reviewer' AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_workforce_account(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND u.account_kind = 'workforce'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_quarter_workforce_eligible(
  target_user_id uuid,
  period_start date,
  period_end date
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND u.account_kind = 'workforce'
      AND u.created_at < (period_end + 1)::timestamptz
      AND (
        u.deleted_at IS NULL
        OR u.deleted_at::date >= period_start
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = u.id
            AND (
              EXISTS (
                SELECT 1 FROM public.okrs o
                JOIN public.review_cycles c ON c.id = o.cycle_id
                WHERE o.employee_id = e.id
                  AND c.start_date <= period_end
                  AND c.end_date >= period_start
              )
              OR EXISTS (
                SELECT 1 FROM public.kpis k
                WHERE k.employee_id = e.id
                  AND k.period_start <= period_end
                  AND k.period_end >= period_start
              )
            )
        )
      )
  );
$$;

CREATE TABLE IF NOT EXISTS public.review_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  sponsor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (NULLIF(BTRIM(purpose), '') IS NOT NULL),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS review_engagements_one_active_idx
  ON public.review_engagements ((status)) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS review_engagements_expiry_idx
  ON public.review_engagements(expires_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.review_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.review_engagements(id) ON DELETE RESTRICT,
  reviewer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  route text NOT NULL CHECK (route LIKE '/review%'),
  category text NOT NULL CHECK (category IN ('usability', 'content', 'workflow', 'accessibility', 'idea', 'bug')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  suggestion text NOT NULL CHECK (char_length(BTRIM(suggestion)) BETWEEN 10 AND 4000),
  screenshot_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_feedback_engagement_idx
  ON public.review_feedback(engagement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.review_demo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('objective', 'task')),
  title text NOT NULL CHECK (char_length(BTRIM(title)) BETWEEN 2 AND 180),
  description text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.current_user_has_active_review_engagement()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.review_engagements re ON re.reviewer_user_id = u.id
    WHERE u.id = auth.uid()
      AND u.role::text = 'reviewer'
      AND u.account_kind = 'reviewer'
      AND u.deleted_at IS NULL
      AND u.access_expires_at > now()
      AND re.status = 'active'
      AND re.starts_at <= now()
      AND re.expires_at > now()
  );
$$;

ALTER TABLE public.review_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_engagements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.review_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.review_demo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_demo_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS review_engagements_reviewer_select ON public.review_engagements;
CREATE POLICY review_engagements_reviewer_select ON public.review_engagements
  FOR SELECT TO authenticated
  USING (reviewer_user_id = auth.uid() AND public.current_user_has_active_review_engagement());

DROP POLICY IF EXISTS review_feedback_reviewer_insert ON public.review_feedback;
CREATE POLICY review_feedback_reviewer_insert ON public.review_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_user_id = auth.uid()
    AND public.current_user_has_active_review_engagement()
    AND EXISTS (
      SELECT 1 FROM public.review_engagements re
      WHERE re.id = engagement_id AND re.reviewer_user_id = auth.uid() AND re.status = 'active'
    )
  );

DROP POLICY IF EXISTS review_feedback_reviewer_select ON public.review_feedback;
CREATE POLICY review_feedback_reviewer_select ON public.review_feedback
  FOR SELECT TO authenticated
  USING (reviewer_user_id = auth.uid() AND public.current_user_has_active_review_engagement());

DROP POLICY IF EXISTS review_demo_items_reviewer_select ON public.review_demo_items;
CREATE POLICY review_demo_items_reviewer_select ON public.review_demo_items
  FOR SELECT TO authenticated USING (public.current_user_has_active_review_engagement());
DROP POLICY IF EXISTS review_demo_items_reviewer_insert ON public.review_demo_items;
CREATE POLICY review_demo_items_reviewer_insert ON public.review_demo_items
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.current_user_has_active_review_engagement());
DROP POLICY IF EXISTS review_demo_items_reviewer_update ON public.review_demo_items;
CREATE POLICY review_demo_items_reviewer_update ON public.review_demo_items
  FOR UPDATE TO authenticated
  USING (public.current_user_has_active_review_engagement())
  WITH CHECK (public.current_user_has_active_review_engagement());
DROP POLICY IF EXISTS review_demo_items_reviewer_delete ON public.review_demo_items;
CREATE POLICY review_demo_items_reviewer_delete ON public.review_demo_items
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND public.current_user_has_active_review_engagement());

DROP TRIGGER IF EXISTS trigger_review_engagements_updated_at ON public.review_engagements;
CREATE TRIGGER trigger_review_engagements_updated_at
  BEFORE UPDATE ON public.review_engagements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trigger_review_demo_items_updated_at ON public.review_demo_items;
CREATE TRIGGER trigger_review_demo_items_updated_at
  BEFORE UPDATE ON public.review_demo_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.review_demo_items (id, kind, title, description, status, progress)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'objective', 'Improve the customer onboarding experience', 'A fictional objective for product exploration.', 'in_progress', 45),
  ('22222222-2222-4222-8222-222222222222', 'objective', 'Make weekly reporting easier to understand', 'A fictional objective containing no company information.', 'not_started', 0),
  ('33333333-3333-4333-8333-333333333333', 'task', 'Review the welcome checklist', 'Try updating this safe demonstration task.', 'in_progress', 50),
  ('44444444-4444-4444-8444-444444444444', 'task', 'Suggest one navigation improvement', 'Submit the suggestion through the feedback form.', 'not_started', 0)
ON CONFLICT (id) DO NOTHING;

-- Rebuild the shared people view with account population as a hard boundary.
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
    CASE WHEN dept.name IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL ELSE dept.name END,
    CASE WHEN e.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others', 'Unassigned', 'Assigned Department') THEN NULL ELSE NULLIF(BTRIM(e.department), '') END,
    CASE WHEN i.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others', 'Unassigned', 'Assigned Department') THEN NULL ELSE NULLIF(BTRIM(i.department), '') END
  ) AS department_name,
  CASE WHEN dept.name IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN NULL ELSE u.department_id END AS department_id,
  COALESCE(
    div.name,
    div_from_department.name,
    NULLIF(e.division, ''),
    CASE WHEN e.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN e.department ELSE NULL END,
    NULLIF(i.division, ''),
    CASE WHEN i.department IN ('SFO', 'UHP', 'Property Development', 'SN International Group', 'Property Investment', 'Others') THEN i.department ELSE NULL END
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
  COALESCE(u.avatar_url, au.raw_user_meta_data->>'avatar_url') AS avatar_url,
  u.created_at AS user_created_at,
  u.account_kind
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id
LEFT JOIN public.employees e ON e.user_id = u.id
LEFT JOIN public.internships i ON i.employee_id = e.id AND i.status = 'active'
LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
LEFT JOIN public.divisions div ON div.id = u.division_id AND div.deleted_at IS NULL
LEFT JOIN public.divisions div_from_department ON lower(div_from_department.name) = lower(dept.name) AND div_from_department.deleted_at IS NULL
WHERE u.account_kind = 'workforce'
  AND u.deleted_at IS NULL
  AND (e.deleted_at IS NULL OR e.id IS NULL);

COMMENT ON COLUMN public.users.account_kind IS 'Identity population; only workforce accounts participate in people surfaces.';
COMMENT ON FUNCTION public.is_quarter_workforce_eligible(uuid, date, date) IS 'Quarter membership using account creation, lifecycle overlap, and saved performance evidence.';
COMMENT ON VIEW public.employee_directory IS 'Workforce-only directory with normalized organization placement and historical roster creation time.';
