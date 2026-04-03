BEGIN;

CREATE TYPE public.ticket_category AS ENUM (
  'payroll_benefits',
  'leave_attendance',
  'employee_records',
  'onboarding_offboarding',
  'policy_clarification',
  'workplace_support',
  'other_hr',
  'access_permissions',
  'bug_report',
  'performance_issue',
  'data_issue',
  'integration_notifications',
  'hardware_software',
  'feature_request',
  'other_it'
);

CREATE TYPE public.ticket_feature_area AS ENUM (
  'authentication',
  'dashboard',
  'profile',
  'tasks',
  'reports',
  'tickets',
  'documents',
  'announcements',
  'resources',
  'performance',
  'payroll',
  'onboarding',
  'employee_management',
  'recruitment',
  'ai_knowledge',
  'company_pulse',
  'mobile_app',
  'hardware_software',
  'other'
);

ALTER TABLE public.tickets
  ADD COLUMN category public.ticket_category,
  ADD COLUMN feature_area public.ticket_feature_area,
  ADD COLUMN steps_to_reproduce text,
  ADD COLUMN expected_behavior text,
  ADD COLUMN has_attachments boolean NOT NULL DEFAULT false;

UPDATE public.tickets
SET category = CASE
  WHEN team = 'hr'::public.ticket_team THEN 'other_hr'::public.ticket_category
  ELSE 'other_it'::public.ticket_category
END;

ALTER TABLE public.tickets
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_category_matches_team CHECK (
    (
      team = 'hr'::public.ticket_team
      AND category = ANY (
        ARRAY[
          'payroll_benefits'::public.ticket_category,
          'leave_attendance'::public.ticket_category,
          'employee_records'::public.ticket_category,
          'onboarding_offboarding'::public.ticket_category,
          'policy_clarification'::public.ticket_category,
          'workplace_support'::public.ticket_category,
          'other_hr'::public.ticket_category
        ]
      )
    ) OR (
      team = 'it'::public.ticket_team
      AND category = ANY (
        ARRAY[
          'access_permissions'::public.ticket_category,
          'bug_report'::public.ticket_category,
          'performance_issue'::public.ticket_category,
          'data_issue'::public.ticket_category,
          'integration_notifications'::public.ticket_category,
          'hardware_software'::public.ticket_category,
          'feature_request'::public.ticket_category,
          'other_it'::public.ticket_category
        ]
      )
    )
  ),
  ADD CONSTRAINT tickets_it_feature_area_required CHECK (
    team <> 'it'::public.ticket_team OR feature_area IS NOT NULL
  );

CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL CHECK (file_size >= 0),
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_attachments_ticket_id
  ON public.ticket_attachments(ticket_id);

CREATE INDEX idx_tickets_category
  ON public.tickets(category)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_tickets_feature_area
  ON public.tickets(feature_area)
  WHERE deleted_at IS NULL;

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments FORCE ROW LEVEL SECURITY;

CREATE POLICY ticket_attachments_select_policy ON public.ticket_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tickets
      WHERE tickets.id = ticket_attachments.ticket_id
        AND tickets.deleted_at IS NULL
        AND (
          tickets.submitted_by = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
          OR (
            tickets.team = 'hr'::public.ticket_team
            AND tickets.assigned_to = auth.uid()
            AND user_has_any_role(auth.uid(), ARRAY['admin']::public.user_role[])
          )
          OR (
            tickets.team = 'it'::public.ticket_team
            AND tickets.assigned_to = auth.uid()
            AND EXISTS (
              SELECT 1
              FROM public.ticket_handlers th
              WHERE th.user_id = auth.uid()
                AND th.team = 'it'::public.ticket_team
                AND th.is_active = true
            )
          )
        )
    )
  );

CREATE POLICY ticket_attachments_insert_policy ON public.ticket_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tickets
      WHERE tickets.id = ticket_attachments.ticket_id
        AND tickets.deleted_at IS NULL
        AND (
          tickets.submitted_by = auth.uid()
          OR user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
          OR (
            tickets.team = 'hr'::public.ticket_team
            AND tickets.assigned_to = auth.uid()
            AND user_has_any_role(auth.uid(), ARRAY['admin']::public.user_role[])
          )
          OR (
            tickets.team = 'it'::public.ticket_team
            AND tickets.assigned_to = auth.uid()
            AND EXISTS (
              SELECT 1
              FROM public.ticket_handlers th
              WHERE th.user_id = auth.uid()
                AND th.team = 'it'::public.ticket_team
                AND th.is_active = true
            )
          )
        )
    )
  );

CREATE POLICY ticket_attachments_delete_policy ON public.ticket_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  );

CREATE TRIGGER trigger_ticket_attachments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ticket_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

COMMENT ON TABLE public.ticket_attachments IS 'Supporting screenshots and files attached to support tickets';

COMMIT;