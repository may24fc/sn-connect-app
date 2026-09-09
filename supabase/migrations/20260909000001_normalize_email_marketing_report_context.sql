BEGIN;

WITH extracted_reports AS (
  SELECT
    id,
    notes,
    regexp_match(notes, '\[marketing_context\]\s*(\{.*?\})\s*\[/marketing_context\]', 's') AS context_match
  FROM public.reports
  WHERE report_type = 'marketing'
    AND notes IS NOT NULL
    AND notes LIKE '%[marketing_context]%'
),
legacy_email_reports AS (
  SELECT
    id,
    notes,
    context_match[1]::jsonb AS marketing_context
  FROM extracted_reports
  WHERE context_match IS NOT NULL
    AND coalesce(context_match[1]::jsonb ->> 'marketingReportType', '') <> 'Email Marketing'
    AND (
      lower(trim(coalesce(context_match[1]::jsonb ->> 'marketingReportType', ''))) IN (
        'email',
        'email marketing'
      )
      OR lower(trim(coalesce(context_match[1]::jsonb ->> 'campaignName', ''))) IN (
        'email',
        'email marketing'
      )
      OR lower(trim(coalesce(context_match[1]::jsonb ->> 'primaryChannel', ''))) IN (
        'email',
        'email marketing'
      )
    )
)
UPDATE public.reports AS reports
SET
  notes = regexp_replace(
    legacy_email_reports.notes,
    '\[marketing_context\]\s*\{.*?\}\s*\[/marketing_context\]',
    '[marketing_context]' || E'\n' || jsonb_set(
      legacy_email_reports.marketing_context,
      '{marketingReportType}',
      to_jsonb('Email Marketing'::text),
      true
    )::text || E'\n[/marketing_context]',
    's'
  ),
  updated_at = now()
FROM legacy_email_reports
WHERE reports.id = legacy_email_reports.id;

COMMIT;