BEGIN;

ALTER TABLE public.intern_daily_logs
  ADD COLUMN IF NOT EXISTS project_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.intern_daily_logs.project_entries IS 'Structured EOD project/focus entries with action taken and outcome';
COMMENT ON COLUMN public.intern_daily_logs.attachments IS 'Uploaded proof files metadata for an associate daily log';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'associate-daily-log-attachments',
  'associate-daily-log-attachments',
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

COMMIT;