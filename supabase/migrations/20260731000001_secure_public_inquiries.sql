-- Secure the public website inquiry intake.
-- All writes must pass through apps/www /api/inquiries using the service role.

DROP POLICY IF EXISTS public_inquiries_public_insert_policy
  ON public.public_inquiries;

REVOKE INSERT ON TABLE public.public_inquiries FROM anon, authenticated;

ALTER TABLE public.public_inquiries
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'www_quick_brief',
  ADD COLUMN IF NOT EXISTS internal_email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS internal_email_resend_id text,
  ADD COLUMN IF NOT EXISTS internal_email_error text,
  ADD COLUMN IF NOT EXISTS confirmation_email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmation_email_resend_id text,
  ADD COLUMN IF NOT EXISTS confirmation_email_error text;

ALTER TABLE public.public_inquiries
  ADD CONSTRAINT public_inquiries_name_quality_check
    CHECK (name = btrim(name) AND char_length(name) BETWEEN 2 AND 200) NOT VALID,
  ADD CONSTRAINT public_inquiries_email_quality_check
    CHECK (email = btrim(email) AND char_length(email) BETWEEN 3 AND 320) NOT VALID,
  ADD CONSTRAINT public_inquiries_phone_e164_check
    CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$') NOT VALID,
  ADD CONSTRAINT public_inquiries_subject_quality_check
    CHECK (subject = btrim(subject) AND char_length(subject) BETWEEN 3 AND 300) NOT VALID,
  ADD CONSTRAINT public_inquiries_message_quality_check
    CHECK (message = btrim(message) AND char_length(message) BETWEEN 10 AND 5000) NOT VALID,
  ADD CONSTRAINT public_inquiries_source_length_check
    CHECK (char_length(source) BETWEEN 1 AND 80),
  ADD CONSTRAINT public_inquiries_internal_email_status_check
    CHECK (internal_email_status IN ('pending', 'sent', 'failed', 'skipped')),
  ADD CONSTRAINT public_inquiries_confirmation_email_status_check
    CHECK (confirmation_email_status IN ('pending', 'sent', 'failed', 'skipped')),
  ADD CONSTRAINT public_inquiries_internal_email_error_length_check
    CHECK (internal_email_error IS NULL OR char_length(internal_email_error) <= 500),
  ADD CONSTRAINT public_inquiries_confirmation_email_error_length_check
    CHECK (confirmation_email_error IS NULL OR char_length(confirmation_email_error) <= 500);

CREATE TABLE public.inquiry_rate_limit_buckets (
  scope text NOT NULL,
  identifier_hash text NOT NULL,
  tokens double precision NOT NULL,
  last_refill_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope, identifier_hash),
  CONSTRAINT inquiry_rate_limit_scope_check
    CHECK (scope IN ('ip_short', 'ip_daily', 'email_short', 'email_daily')),
  CONSTRAINT inquiry_rate_limit_hash_check
    CHECK (char_length(identifier_hash) = 64),
  CONSTRAINT inquiry_rate_limit_tokens_check
    CHECK (tokens >= 0)
);

CREATE INDEX inquiry_rate_limit_buckets_expires_at_idx
  ON public.inquiry_rate_limit_buckets (expires_at);

ALTER TABLE public.inquiry_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_rate_limit_buckets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.inquiry_rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.inquiry_rate_limit_buckets TO service_role;

CREATE TABLE public.inquiry_deduplication_keys (
  fingerprint text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  CONSTRAINT inquiry_deduplication_fingerprint_check
    CHECK (char_length(fingerprint) = 64)
);

CREATE INDEX inquiry_deduplication_keys_expires_at_idx
  ON public.inquiry_deduplication_keys (expires_at);

ALTER TABLE public.inquiry_deduplication_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_deduplication_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.inquiry_deduplication_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.inquiry_deduplication_keys TO service_role;

CREATE OR REPLACE FUNCTION public.consume_inquiry_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_capacity integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_tokens double precision;
  v_last_refill_at timestamptz;
  v_refill_rate double precision;
BEGIN
  IF p_scope NOT IN ('ip_short', 'ip_daily', 'email_short', 'email_daily')
     OR p_identifier_hash !~ '^[a-f0-9]{64}$'
     OR p_capacity <= 0
     OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid inquiry rate-limit arguments';
  END IF;

  DELETE FROM public.inquiry_rate_limit_buckets
  WHERE expires_at < v_now;

  INSERT INTO public.inquiry_rate_limit_buckets (
    scope,
    identifier_hash,
    tokens,
    last_refill_at,
    expires_at
  )
  VALUES (
    p_scope,
    p_identifier_hash,
    p_capacity::double precision,
    v_now,
    v_now + interval '48 hours'
  )
  ON CONFLICT (scope, identifier_hash) DO NOTHING;

  SELECT bucket.tokens, bucket.last_refill_at
  INTO v_tokens, v_last_refill_at
  FROM public.inquiry_rate_limit_buckets AS bucket
  WHERE bucket.scope = p_scope
    AND bucket.identifier_hash = p_identifier_hash
  FOR UPDATE;

  v_refill_rate := p_capacity::double precision / p_window_seconds::double precision;
  v_tokens := LEAST(
    p_capacity::double precision,
    v_tokens + GREATEST(EXTRACT(EPOCH FROM (v_now - v_last_refill_at)), 0) * v_refill_rate
  );

  IF v_tokens >= 1 THEN
    UPDATE public.inquiry_rate_limit_buckets
    SET tokens = v_tokens - 1,
        last_refill_at = v_now,
        expires_at = v_now + interval '48 hours'
    WHERE scope = p_scope
      AND identifier_hash = p_identifier_hash;

    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  UPDATE public.inquiry_rate_limit_buckets
  SET tokens = v_tokens,
      last_refill_at = v_now,
      expires_at = v_now + interval '48 hours'
  WHERE scope = p_scope
    AND identifier_hash = p_identifier_hash;

  RETURN QUERY
  SELECT false, GREATEST(1, CEIL((1 - v_tokens) / v_refill_rate)::integer);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_inquiry_deduplication_key(
  p_fingerprint text,
  p_ttl_seconds integer DEFAULT 1800
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claimed boolean;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_fingerprint !~ '^[a-f0-9]{64}$'
     OR p_ttl_seconds < 1
     OR p_ttl_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid inquiry deduplication arguments';
  END IF;

  DELETE FROM public.inquiry_deduplication_keys
  WHERE expires_at < v_now;

  INSERT INTO public.inquiry_deduplication_keys (fingerprint, expires_at)
  VALUES (p_fingerprint, v_now + make_interval(secs => p_ttl_seconds))
  ON CONFLICT (fingerprint) DO NOTHING
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_inquiry_deduplication_key(
  p_fingerprint text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.inquiry_deduplication_keys
  WHERE fingerprint = p_fingerprint;
$$;

REVOKE ALL ON FUNCTION public.consume_inquiry_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_inquiry_deduplication_key(text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_inquiry_deduplication_key(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_inquiry_rate_limit(text, text, integer, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_inquiry_deduplication_key(text, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_inquiry_deduplication_key(text)
  TO service_role;
