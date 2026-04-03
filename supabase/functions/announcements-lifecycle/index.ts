import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createBulkInAppNotifications } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnnouncementRow {
  id: string;
  title: string;
  target_roles: string[] | null;
  target_departments: string[] | null;
  created_by: string | null;
}

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
    const now = new Date().toISOString();
    let publishedCount = 0;
    let expiredCount = 0;

    // ----- Step 1: Auto-publish scheduled announcements -----
    // Find announcements where published_at has passed but status is still 'draft'
    const { data: toPublish, error: publishError } = await supabase
      .from('announcements')
      .select('id, title, target_roles, target_departments, created_by')
      .lte('published_at', now)
      .eq('status', 'draft')
      .is('deleted_at', null);

    if (publishError) {
      console.error('[announcements-lifecycle] Publish query error:', publishError.message);
    }

    if (toPublish && toPublish.length > 0) {
      const ids = toPublish.map((a: AnnouncementRow) => a.id);

      const { error: updateError } = await supabase
        .from('announcements')
        .update({ status: 'published' })
        .in('id', ids);

      if (updateError) {
        console.error('[announcements-lifecycle] Publish update error:', updateError.message);
      } else {
        publishedCount = ids.length;

        // Send notifications for each newly published announcement
        for (const announcement of toPublish as AnnouncementRow[]) {
          await notifyAnnouncementPublished(supabase, announcement);
        }

        await writeAuditLog(supabase, {
          tableName: 'announcements',
          recordId: ids.join(','),
          action: 'announcements_auto_published',
          metadata: { count: publishedCount, ids },
        });
      }
    }

    // ----- Step 2: Auto-expire expired announcements -----
    const { data: toExpire, error: expireQueryError } = await supabase
      .from('announcements')
      .select('id')
      .lte('expires_at', now)
      .neq('status', 'expired')
      .not('expires_at', 'is', null)
      .is('deleted_at', null);

    if (expireQueryError) {
      console.error('[announcements-lifecycle] Expire query error:', expireQueryError.message);
    }

    if (toExpire && toExpire.length > 0) {
      const ids = toExpire.map((a: { id: string }) => a.id);

      const { error: updateError } = await supabase
        .from('announcements')
        .update({ status: 'expired' })
        .in('id', ids);

      if (updateError) {
        console.error('[announcements-lifecycle] Expire update error:', updateError.message);
      } else {
        expiredCount = ids.length;

        await writeAuditLog(supabase, {
          tableName: 'announcements',
          recordId: ids.join(','),
          action: 'announcements_auto_expired',
          metadata: { count: expiredCount, ids },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { publishedCount, expiredCount, timestamp: now },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[announcements-lifecycle] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function notifyAnnouncementPublished(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  announcement: AnnouncementRow
): Promise<void> {
  // Determine target user IDs based on roles/departments targeting
  let query = supabase.from('users').select('id').is('deleted_at', null);

  if (announcement.target_roles && announcement.target_roles.length > 0) {
    query = query.in('role', announcement.target_roles);
  }

  if (announcement.target_departments && announcement.target_departments.length > 0) {
    query = query.in('department_id', announcement.target_departments);
  }

  const { data: users, error } = await query;

  if (error) {
    console.error('[announcements-lifecycle] User query error:', error.message);
    return;
  }

  if (users && users.length > 0) {
    const userIds = users.map((u: { id: string }) => u.id);
    await createBulkInAppNotifications(supabase, userIds, {
      type: 'announcement_new',
      title: `New Announcement: ${announcement.title}`,
      message: announcement.title,
      link: `/announcements`,
      metadata: { announcementId: announcement.id },
    });
  }
}
