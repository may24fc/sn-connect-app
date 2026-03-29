BEGIN;

CREATE TYPE public.ticket_team AS ENUM ('hr', 'it');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_status AS ENUM (
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_on_user',
  'resolved',
  'closed'
);

CREATE TABLE public.ticket_handlers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team public.ticket_team NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team)
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  team public.ticket_team NOT NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'new',
  submitted_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.users(id),
  assigned_by uuid REFERENCES public.users(id),
  triaged_by uuid REFERENCES public.users(id),
  triaged_at timestamptz,
  resolution_summary text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_handlers_team_active
  ON public.ticket_handlers(team, is_active)
  WHERE is_active = true;
CREATE INDEX idx_ticket_handlers_user_id
  ON public.ticket_handlers(user_id);

CREATE INDEX idx_tickets_submitted_by
  ON public.tickets(submitted_by)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_assigned_to
  ON public.tickets(assigned_to)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_team_status
  ON public.tickets(team, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_priority
  ON public.tickets(priority)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_created_at
  ON public.tickets(created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_ticket_comments_ticket_id
  ON public.ticket_comments(ticket_id);

ALTER TABLE public.ticket_handlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_handlers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY ticket_handlers_select_policy ON public.ticket_handlers
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  );

CREATE POLICY ticket_handlers_insert_policy ON public.ticket_handlers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  );

CREATE POLICY ticket_handlers_update_policy ON public.ticket_handlers
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  );

CREATE POLICY ticket_handlers_delete_policy ON public.ticket_handlers
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  );

CREATE POLICY tickets_select_policy ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      submitted_by = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
      OR (
        team = 'hr'::public.ticket_team
        AND assigned_to = auth.uid()
        AND user_has_any_role(auth.uid(), ARRAY['admin']::public.user_role[])
      )
      OR (
        team = 'it'::public.ticket_team
        AND assigned_to = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.ticket_handlers th
          WHERE th.user_id = auth.uid()
            AND th.team = 'it'::public.ticket_team
            AND th.is_active = true
        )
      )
    )
  );

CREATE POLICY tickets_insert_policy ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND created_by = auth.uid()
  );

CREATE POLICY tickets_update_policy ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
      OR (
        team = 'hr'::public.ticket_team
        AND assigned_to = auth.uid()
        AND user_has_any_role(auth.uid(), ARRAY['admin']::public.user_role[])
      )
      OR (
        team = 'it'::public.ticket_team
        AND assigned_to = auth.uid()
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
  WITH CHECK (
    deleted_at IS NULL
    AND (
      user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
      OR (
        team = 'hr'::public.ticket_team
        AND assigned_to = auth.uid()
        AND user_has_any_role(auth.uid(), ARRAY['admin']::public.user_role[])
      )
      OR (
        team = 'it'::public.ticket_team
        AND assigned_to = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.ticket_handlers th
          WHERE th.user_id = auth.uid()
            AND th.team = 'it'::public.ticket_team
            AND th.is_active = true
        )
      )
    )
  );

CREATE POLICY tickets_delete_policy ON public.tickets
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['super_admin']::public.user_role[])
  );

CREATE POLICY ticket_comments_select_policy ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
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

CREATE POLICY ticket_comments_insert_policy ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
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

CREATE TRIGGER trigger_ticket_handlers_updated_at
  BEFORE UPDATE ON public.ticket_handlers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_tickets_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.ticket_handlers IS 'Explicit registry of employees allowed to handle IT support tickets';
COMMENT ON TABLE public.tickets IS 'Employee-submitted HR and IT support tickets with super-admin triage';
COMMENT ON TABLE public.ticket_comments IS 'Conversation thread for support tickets';

COMMIT;