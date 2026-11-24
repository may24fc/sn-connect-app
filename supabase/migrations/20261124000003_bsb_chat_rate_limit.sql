-- One atomic, per-account limit across all server instances.
CREATE TABLE public.bsb_chat_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count BETWEEN 1 AND 20),
  PRIMARY KEY (user_id, window_started_at)
);

ALTER TABLE public.bsb_chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsb_chat_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.bsb_chat_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bsb_chat_rate_limits TO service_role;

CREATE FUNCTION public.consume_bsb_chat_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window timestamptz := date_trunc('hour', clock_timestamp());
  v_count integer;
BEGIN
  DELETE FROM public.bsb_chat_rate_limits
  WHERE window_started_at < v_window - interval '24 hours';

  INSERT INTO public.bsb_chat_rate_limits (user_id, window_started_at, request_count)
  VALUES (p_user_id, v_window, 1)
  ON CONFLICT (user_id, window_started_at)
  DO UPDATE SET request_count = bsb_chat_rate_limits.request_count + 1
    WHERE bsb_chat_rate_limits.request_count < 20
  RETURNING request_count INTO v_count;

  RETURN v_count IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_bsb_chat_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_bsb_chat_limit(uuid) TO service_role;
