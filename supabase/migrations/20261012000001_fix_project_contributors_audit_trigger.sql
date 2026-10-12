-- Migration: Fix the project_contributors audit trigger and backfill project leads
-- Problem: handle_audit_log() read NEW.id / OLD.id directly. project_contributors has a composite key
--          (project_id, user_id) and no id column, so every insert, update and delete on it raised
--          `record "new" has no field "id"` and rolled back. Adding contributors always failed, and the
--          automatic "lead becomes a contributor" step in POST /api/projects failed silently, so no
--          project ever had contributor rows.
-- Fix:     The function now reads the record id through JSON from the column named by the trigger's
--          first argument (default 'id'), so tables without an id column can be audited. Every existing
--          trigger passes no argument and keeps its exact previous behaviour.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  id_column text := COALESCE(NULLIF(TG_ARGV[0], ''), 'id');
  old_data jsonb;
  new_data jsonb;
  audited_record_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_data := to_jsonb(OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_data := to_jsonb(NEW);
  END IF;

  audited_record_id := (COALESCE(new_data, old_data) ->> id_column)::uuid;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    operation,
    old_values,
    new_values,
    performed_by
  ) VALUES (
    TG_TABLE_NAME,
    audited_record_id,
    TG_OP,
    old_data,
    new_data,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_audit_log() IS
  'Logs row changes to audit_logs. The optional trigger argument names the uuid column used as record_id (default: id).';

-- Contributor changes are recorded against the project they belong to.
DROP TRIGGER IF EXISTS trigger_project_contributors_audit ON public.project_contributors;
CREATE TRIGGER trigger_project_contributors_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_contributors
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log('project_id');

-- Restore the lead contributor row that project creation was meant to add.
INSERT INTO public.project_contributors (project_id, user_id, role)
SELECT p.id, p.lead_user_id, 'lead'
FROM public.projects p
WHERE p.deleted_at IS NULL
  AND p.lead_user_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

COMMIT;
