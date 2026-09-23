BEGIN;

CREATE TABLE public.marketing_deliverables_reminder_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);

ALTER TABLE public.marketing_deliverables_reminder_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_deliverables_reminder_recipients FORCE ROW LEVEL SECURITY;

CREATE POLICY marketing_deliverables_reminder_recipients_super_admin_policy
  ON public.marketing_deliverables_reminder_recipients
  FOR ALL
  TO authenticated
  USING (public.user_has_any_role(auth.uid(), ARRAY['super_admin']::user_role[]))
  WITH CHECK (public.user_has_any_role(auth.uid(), ARRAY['super_admin']::user_role[]));

INSERT INTO public.marketing_deliverables_reminder_recipients (employee_id, included)
SELECT employees.id, true
FROM public.employees AS employees
INNER JOIN public.users AS users ON users.id = employees.user_id
WHERE lower(trim(employees.department)) = 'marketing'
  AND employees.deleted_at IS NULL
  AND users.deleted_at IS NULL
  AND users.status NOT IN ('terminated', 'inactive')
  AND users.role IN ('employee', 'associate')
ON CONFLICT (employee_id) DO NOTHING;

COMMIT;