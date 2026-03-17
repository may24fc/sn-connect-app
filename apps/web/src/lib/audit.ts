import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Logs an admin activity to the audit_logs table.
 * Fire-and-forget — errors are caught and logged, never thrown.
 */
export function logActivity(
  supabase: SupabaseClient,
  params: {
    userId: string;
    action: string;
    tableName: string;
    recordId: string;
    metadata?: Record<string, unknown>;
  }
): void {
  supabase
    .from('audit_logs')
    .insert({
      table_name: params.tableName,
      record_id: params.recordId,
      operation: params.action.toUpperCase().includes('DELETE')
        ? 'DELETE'
        : params.action.toUpperCase().includes('CREATE') ||
            params.action.toUpperCase().includes('INSERT')
          ? 'INSERT'
          : 'UPDATE',
      performed_by: params.userId,
      action: params.action,
      metadata: params.metadata ?? {},
    })
    .then(({ error }) => {
      if (error) {
        console.error('Failed to write audit log:', error.message);
      }
    });
}
