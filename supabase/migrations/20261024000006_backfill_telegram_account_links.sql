BEGIN;

INSERT INTO public.telegram_account_links (
  user_id, telegram_user_id, private_chat_id, telegram_username, linked_at, updated_at
)
SELECT
  metadata_row.user_id,
  (metadata_row.metadata->>'telegramChatId')::bigint,
  (metadata_row.metadata->>'telegramChatId')::bigint,
  NULLIF(metadata_row.metadata->>'telegramUsername', ''),
  COALESCE((metadata_row.metadata->>'telegramLinkedAt')::timestamptz, metadata_row.updated_at, now()),
  COALESCE(metadata_row.updated_at, now())
FROM public.user_role_metadata metadata_row
WHERE metadata_row.role_type = 'notification_preferences'
  AND COALESCE(metadata_row.metadata->>'telegramChatId', '') ~ '^-?[0-9]+$'
ON CONFLICT DO NOTHING;

COMMIT;
