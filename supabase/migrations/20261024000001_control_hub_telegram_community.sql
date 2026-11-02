BEGIN;

CREATE TABLE public.telegram_account_links (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE,
  private_chat_id bigint NOT NULL UNIQUE,
  telegram_username text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_telegram_origins (
  ticket_id uuid PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL,
  topic_id bigint NOT NULL,
  source_message_id bigint NOT NULL,
  converted_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, source_message_id)
);

CREATE TABLE public.telegram_ticket_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','assigned','in_progress','waiting_on_user','resolved','closed')),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  telegram_message_id bigint,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, event_type)
);

CREATE TABLE public.recognition_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('weekly','monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','published','skipped','failed')),
  public_intro text,
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  published_by uuid REFERENCES public.users(id),
  published_at timestamptz,
  telegram_message_id bigint,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE (period_type, period_start, period_end)
);

CREATE TABLE public.recognition_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nominator_user_id uuid NOT NULL REFERENCES public.users(id),
  nominee_user_id uuid NOT NULL REFERENCES public.users(id),
  category text NOT NULL CHECK (category IN ('impact_delivery','accountability_timeliness','collaboration_initiative')),
  result_summary text NOT NULL CHECK (char_length(result_summary) BETWEEN 10 AND 1000),
  work_period_start date NOT NULL,
  work_period_end date NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (nominator_user_id <> nominee_user_id),
  CHECK (work_period_end >= work_period_start)
);

CREATE TABLE public.recognition_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.recognition_periods(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.users(id),
  category text CHECK (category IS NULL OR category IN ('impact_delivery','accountability_timeliness','collaboration_initiative')),
  public_reason text NOT NULL CHECK (char_length(public_reason) BETWEEN 10 AND 1000),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, recipient_user_id, category)
);

CREATE UNIQUE INDEX recognition_monthly_category_unique
  ON public.recognition_selections(period_id, category)
  WHERE category IS NOT NULL;
CREATE INDEX recognition_nominations_period_idx ON public.recognition_nominations(work_period_start, work_period_end, status);
CREATE INDEX recognition_periods_recent_idx ON public.recognition_periods(period_end DESC, status);
CREATE INDEX telegram_ticket_delivery_pending_idx ON public.telegram_ticket_delivery_events(status, created_at);

ALTER TABLE public.telegram_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_account_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_telegram_origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_telegram_origins FORCE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_ticket_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_ticket_delivery_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_nominations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_selections FORCE ROW LEVEL SECURITY;

CREATE POLICY telegram_account_links_own_read ON public.telegram_account_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY recognition_periods_admin_read ON public.recognition_periods FOR SELECT TO authenticated USING (public.user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::public.user_role[]));
CREATE POLICY recognition_selections_admin_read ON public.recognition_selections FOR SELECT TO authenticated USING (public.user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::public.user_role[]));
CREATE POLICY recognition_nominations_own_read ON public.recognition_nominations FOR SELECT TO authenticated
  USING (nominator_user_id = auth.uid() OR public.user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::public.user_role[]));

CREATE OR REPLACE FUNCTION public.enqueue_it_ticket_telegram_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.team <> 'it'::public.ticket_team THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR (OLD.team IS DISTINCT FROM NEW.team) THEN
    v_event := 'created';
  ELSIF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  ELSE
    v_event := CASE NEW.status::text
      WHEN 'assigned' THEN 'assigned'
      WHEN 'in_progress' THEN 'in_progress'
      WHEN 'waiting_on_user' THEN 'waiting_on_user'
      WHEN 'resolved' THEN 'resolved'
      WHEN 'closed' THEN 'closed'
      ELSE NULL END;
  END IF;
  IF v_event IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.telegram_ticket_delivery_events(ticket_id,event_type,payload)
  VALUES (NEW.id,v_event,jsonb_build_object(
    'ticketId',NEW.id,'reference',upper(substr(replace(NEW.id::text,'-',''),1,8)),
    'title',NEW.title,'category',COALESCE(NEW.category::text,'other_it'),
    'featureArea',NEW.feature_area,'status',NEW.status::text,'occurredAt',now()))
  ON CONFLICT (ticket_id,event_type) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER tickets_telegram_outbox_trg
AFTER INSERT OR UPDATE OF team,status,deleted_at ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enqueue_it_ticket_telegram_event();

CREATE OR REPLACE FUNCTION public.create_ticket_from_telegram(
  p_submitted_by uuid, p_converted_by uuid, p_title text, p_description text,
  p_category text, p_chat_id bigint, p_topic_id bigint, p_source_message_id bigint
) RETURNS TABLE(ticket_id uuid, created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ticket_id uuid;
BEGIN
  SELECT origin.ticket_id INTO v_ticket_id FROM public.ticket_telegram_origins origin
  WHERE origin.chat_id=p_chat_id AND origin.source_message_id=p_source_message_id;
  IF v_ticket_id IS NOT NULL THEN RETURN QUERY SELECT v_ticket_id,false; RETURN; END IF;
  INSERT INTO public.tickets(title,description,team,category,feature_area,priority,status,submitted_by,created_by)
  VALUES (left(p_title,200),left(p_description,5000),'it',p_category,'other','medium','new',p_submitted_by,p_converted_by)
  RETURNING id INTO v_ticket_id;
  INSERT INTO public.ticket_telegram_origins(ticket_id,chat_id,topic_id,source_message_id,converted_by)
  VALUES(v_ticket_id,p_chat_id,p_topic_id,p_source_message_id,p_converted_by);
  RETURN QUERY SELECT v_ticket_id,true;
EXCEPTION WHEN unique_violation THEN
  SELECT origin.ticket_id INTO v_ticket_id FROM public.ticket_telegram_origins origin
  WHERE origin.chat_id=p_chat_id AND origin.source_message_id=p_source_message_id;
  RETURN QUERY SELECT v_ticket_id,false;
END $$;

REVOKE ALL ON FUNCTION public.create_ticket_from_telegram(uuid,uuid,text,text,text,bigint,bigint,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ticket_from_telegram(uuid,uuid,text,text,text,bigint,bigint,bigint) TO service_role;

CREATE TRIGGER telegram_account_links_updated_at BEFORE UPDATE ON public.telegram_account_links FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER telegram_ticket_delivery_events_updated_at BEFORE UPDATE ON public.telegram_ticket_delivery_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER recognition_periods_updated_at BEFORE UPDATE ON public.recognition_periods FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER recognition_nominations_updated_at BEFORE UPDATE ON public.recognition_nominations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER recognition_selections_updated_at BEFORE UPDATE ON public.recognition_selections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.recognition_nominations IS 'Positive evidence submitted by one active employee for another; private review data.';
COMMENT ON TABLE public.recognition_periods IS 'Auditable Manila-calendar weekly and monthly recognition drafts and publications.';
COMMENT ON TABLE public.telegram_ticket_delivery_events IS 'Idempotent public-safe IT ticket milestone delivery outbox.';

COMMIT;
