-- Private staging bucket for browser-direct uploads.
--
-- Portal API routes run as Vercel functions, which reject request bodies over
-- 4.5 MB. Instead of posting files through the function, the browser uploads
-- each file here via a signed upload URL (issued by /api/uploads/staging) and
-- sends only a reference. The receiving route downloads the staged object,
-- runs its normal validation/processing, and deletes the staged copy.
--
-- Objects live under `<auth user id>/...`. There are no RLS policies: signed
-- upload URLs and the service-role client are the only ways in or out.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'upload-staging',
  'upload-staging',
  false,
  52428800, -- 50 MB; each destination route still enforces its own limit
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

COMMIT;
