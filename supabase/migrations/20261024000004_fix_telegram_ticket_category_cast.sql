BEGIN;

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
  VALUES (
    left(p_title,200),left(p_description,5000),'it'::public.ticket_team,
    p_category::public.ticket_category,'other'::public.ticket_feature_area,
    'medium'::public.ticket_priority,'new'::public.ticket_status,
    p_submitted_by,p_converted_by
  )
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

COMMIT;
