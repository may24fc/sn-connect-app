import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Configuration
// - Read notifications: purge after 90 days
// - Unread notifications: purge after 180 days (safety net for truly abandoned)
// ---------------------------------------------------------------------------

const READ_RETENTION_DAYS = 90;
const UNREAD_RETENTION_DAYS = 180;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = validateAdminAuth(req);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();

    const readCutoff = new Date();
    readCutoff.setDate(readCutoff.getDate() - READ_RETENTION_DAYS);
    const readCutoffISO = readCutoff.toISOString();

    const unreadCutoff = new Date();
    unreadCutoff.setDate(unreadCutoff.getDate() - UNREAD_RETENTION_DAYS);
    const unreadCutoffISO = unreadCutoff.toISOString();

    // ----- Step 1: Delete old read notifications -----
    const { count: readCount, error: readCountError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', true)
      .lt('created_at', readCutoffISO);

    if (readCountError) {
      console.error('[cleanup-old-notifications] Read count error:', readCountError.message);
    }

    let readPurged = 0;
    if ((readCount ?? 0) > 0) {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true)
        .lt('created_at', readCutoffISO);

      if (deleteError) {
        console.error('[cleanup-old-notifications] Read delete error:', deleteError.message);
      } else {
        readPurged = readCount ?? 0;
      }
    }

    // ----- Step 2: Delete very old unread notifications -----
    const { count: unreadCount, error: unreadCountError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .lt('created_at', unreadCutoffISO);

    if (unreadCountError) {
      console.error('[cleanup-old-notifications] Unread count error:', unreadCountError.message);
    }

    let unreadPurged = 0;
    if ((unreadCount ?? 0) > 0) {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', false)
        .lt('created_at', unreadCutoffISO);

      if (deleteError) {
        console.error('[cleanup-old-notifications] Unread delete error:', deleteError.message);
      } else {
        unreadPurged = unreadCount ?? 0;
      }
    }

    const totalPurged = readPurged + unreadPurged;

    if (totalPurged > 0) {
      await writeAuditLog(supabase, {
        tableName: 'notifications',
        recordId: 'cleanup-old-notifications',
        action: 'old_notifications_purged',
        metadata: {
          readRetentionDays: READ_RETENTION_DAYS,
          unreadRetentionDays: UNREAD_RETENTION_DAYS,
          readPurged,
          unreadPurged,
          totalPurged,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          readRetentionDays: READ_RETENTION_DAYS,
          unreadRetentionDays: UNREAD_RETENTION_DAYS,
          readPurged,
          unreadPurged,
          totalPurged,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cleanup-old-notifications] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
