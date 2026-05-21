import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuthFlexible } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Configuration: tables with soft-delete (deleted_at column)
// Records older than RETENTION_DAYS will be permanently removed.
// ---------------------------------------------------------------------------

const RETENTION_DAYS = 90;

const SOFT_DELETE_TABLES = [
  'announcements',
  'resources',
  'tasks',
  'documents',
  'invoices',
  'standup_recordings',
] as const;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await validateAdminAuthFlexible(req);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoff.toISOString();

    const results: Record<string, number> = {};
    let totalPurged = 0;

    for (const table of SOFT_DELETE_TABLES) {
      try {
        // Count records to be purged (for audit)
        const { count, error: countError } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .not('deleted_at', 'is', null)
          .lt('deleted_at', cutoffISO);

        if (countError) {
          console.error(`[cleanup-soft-deleted] Count error for ${table}:`, countError.message);
          results[table] = -1;
          continue;
        }

        const recordCount = count ?? 0;

        if (recordCount === 0) {
          results[table] = 0;
          continue;
        }

        // Permanently delete records past retention
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .not('deleted_at', 'is', null)
          .lt('deleted_at', cutoffISO);

        if (deleteError) {
          console.error(`[cleanup-soft-deleted] Delete error for ${table}:`, deleteError.message);
          results[table] = -1;
          continue;
        }

        results[table] = recordCount;
        totalPurged += recordCount;
      } catch (err) {
        console.error(
          `[cleanup-soft-deleted] Error processing ${table}:`,
          err instanceof Error ? err.message : String(err)
        );
        results[table] = -1;
      }
    }

    // Write audit log only if records were purged
    if (totalPurged > 0) {
      await writeAuditLog(supabase, {
        tableName: 'system',
        recordId: 'cleanup-soft-deleted',
        action: 'soft_deleted_records_purged',
        metadata: {
          retentionDays: RETENTION_DAYS,
          cutoff: cutoffISO,
          totalPurged,
          perTable: results,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          retentionDays: RETENTION_DAYS,
          cutoff: cutoffISO,
          totalPurged,
          perTable: results,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cleanup-soft-deleted] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
