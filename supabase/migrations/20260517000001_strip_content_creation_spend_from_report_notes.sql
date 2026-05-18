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
content_creation_reports AS (
  SELECT
    id,
    notes,
    context_match[1]::jsonb AS marketing_context
  FROM extracted_reports
  WHERE context_match IS NOT NULL
    AND coalesce(context_match[1]::jsonb ->> 'marketingReportType', '') = 'Content Creation'
    AND context_match[1]::jsonb ? 'totalSpend'
)
UPDATE public.reports AS reports
SET notes = regexp_replace(
      content_creation_reports.notes,
      '\[marketing_context\]\s*\{.*?\}\s*\[/marketing_context\]',
      '[marketing_context]' || E'\n' || (content_creation_reports.marketing_context - 'totalSpend')::text || E'\n[/marketing_context]',
      's'
    ),
    updated_at = now()
FROM content_creation_reports
WHERE reports.id = content_creation_reports.id;

COMMIT;