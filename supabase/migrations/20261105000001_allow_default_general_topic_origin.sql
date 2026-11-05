BEGIN;

ALTER TABLE public.ticket_telegram_origins
  ALTER COLUMN topic_id DROP NOT NULL;

COMMENT ON COLUMN public.ticket_telegram_origins.topic_id IS
  'Telegram forum topic identifier; null represents the forum default General topic, whose updates omit message_thread_id.';

COMMIT;
