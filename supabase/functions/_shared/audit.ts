import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Audit log utility for Edge Functions.
 *
 * Writes to the `audit_logs` table via service-role client (bypasses RLS).
 * Uses the normalized `action` + `metadata` columns for Edge Function entries,
 * while preserving backward compatibility with the legacy `operation`/`old_values`/`new_values` columns.
 */

interface AuditLogParams {
  tableName: string;
  recordId: string;
  action: string;
  metadata?: Record<string, unknown>;
  performedBy?: string;
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      table_name: params.tableName,
      record_id: params.recordId,
      // Map `action` to the legacy `operation` column for schema compatibility
      operation: params.action,
      // Store structured metadata in `new_values` (jsonb) for legacy column compatibility
      new_values: params.metadata ?? {},
      performed_by: params.performedBy ?? null,
      performed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[audit] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error(
      '[audit] Unexpected error:',
      err instanceof Error ? err.message : String(err)
    );
  }
}
