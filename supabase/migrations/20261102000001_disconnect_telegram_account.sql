BEGIN;

CREATE OR REPLACE FUNCTION public.disconnect_telegram_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_metadata jsonb;
  v_next_metadata jsonb;
  v_removed_links integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Only the account owner can disconnect Telegram'
      USING ERRCODE = '42501';
  END IF;

  SELECT metadata
  INTO v_previous_metadata
  FROM public.user_role_metadata
  WHERE user_id = p_user_id
    AND role_type = 'notification_preferences'
  FOR UPDATE;

  DELETE FROM public.telegram_account_links
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_removed_links = ROW_COUNT;

  v_next_metadata := COALESCE(v_previous_metadata, '{}'::jsonb) || jsonb_build_object(
    'telegram', false,
    'telegramChatId', null,
    'telegramUsername', null,
    'telegramLinkedAt', null,
    'telegramLinkToken', null,
    'telegramLinkTokenExpiresAt', null
  );

  INSERT INTO public.user_role_metadata (user_id, role_type, metadata, updated_at)
  VALUES (p_user_id, 'notification_preferences', v_next_metadata, now())
  ON CONFLICT (user_id, role_type)
  DO UPDATE SET
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    operation,
    performed_by,
    action,
    metadata
  )
  VALUES (
    'telegram_account_links',
    p_user_id,
    'DELETE',
    p_user_id,
    'disconnect_telegram_account',
    jsonb_build_object(
      'self_service', true,
      'normalized_link_removed', v_removed_links > 0
    )
  );

  RETURN v_next_metadata;
END;
$$;

REVOKE ALL ON FUNCTION public.disconnect_telegram_account(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disconnect_telegram_account(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.disconnect_telegram_account(uuid) TO authenticated;

COMMENT ON FUNCTION public.disconnect_telegram_account(uuid) IS
  'Atomically disconnects the caller Telegram identity, disables Telegram delivery, clears pending link tokens, and records an audit event.';

COMMIT;
