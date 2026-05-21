import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuthFlexible } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createBulkInAppNotifications } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResourceRow {
  id: string;
  title: string;
  access_level: string | null;
  category_id: string | null;
  created_by: string | null;
}

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
    const now = new Date().toISOString();
    let publishedCount = 0;
    let expiredCount = 0;

    // ----- Step 1: Auto-publish scheduled resources -----
    const { data: toPublish, error: publishError } = await supabase
      .from('resources')
      .select('id, title, access_level, category_id, created_by')
      .lte('published_at', now)
      .eq('status', 'draft')
      .is('deleted_at', null);

    if (publishError) {
      console.error('[resources-lifecycle] Publish query error:', publishError.message);
    }

    if (toPublish && toPublish.length > 0) {
      const ids = toPublish.map((r: ResourceRow) => r.id);

      const { error: updateError } = await supabase
        .from('resources')
        .update({ status: 'published' })
        .in('id', ids);

      if (updateError) {
        console.error('[resources-lifecycle] Publish update error:', updateError.message);
      } else {
        publishedCount = ids.length;

        // Send notifications for each newly published resource
        for (const resource of toPublish as ResourceRow[]) {
          await notifyResourcePublished(supabase, resource);
        }

        await writeAuditLog(supabase, {
          tableName: 'resources',
          recordId: ids.join(','),
          action: 'resources_auto_published',
          metadata: { count: publishedCount, ids },
        });
      }
    }

    // ----- Step 2: Auto-expire expired resources -----
    const { data: toExpire, error: expireQueryError } = await supabase
      .from('resources')
      .select('id')
      .lte('expires_at', now)
      .neq('status', 'expired')
      .not('expires_at', 'is', null)
      .is('deleted_at', null);

    if (expireQueryError) {
      console.error('[resources-lifecycle] Expire query error:', expireQueryError.message);
    }

    if (toExpire && toExpire.length > 0) {
      const ids = toExpire.map((r: { id: string }) => r.id);

      const { error: updateError } = await supabase
        .from('resources')
        .update({ status: 'expired' })
        .in('id', ids);

      if (updateError) {
        console.error('[resources-lifecycle] Expire update error:', updateError.message);
      } else {
        expiredCount = ids.length;

        await writeAuditLog(supabase, {
          tableName: 'resources',
          recordId: ids.join(','),
          action: 'resources_auto_expired',
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
    console.error('[resources-lifecycle] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function notifyResourcePublished(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  resource: ResourceRow
): Promise<void> {
  // Determine target users based on access_level
  let query = supabase.from('users').select('id').is('deleted_at', null);

  // If access_level restricts to certain roles, filter
  if (resource.access_level && resource.access_level !== 'all') {
    // Map access levels to roles
    const roleMap: Record<string, string[]> = {
      admin: ['admin', 'super_admin'],
      hr: ['hr', 'admin', 'super_admin'],
      management: ['hr', 'cos', 'ceo', 'admin', 'super_admin'],
      employee: ['employee', 'intern', 'hr', 'cos', 'ceo', 'admin', 'super_admin'],
    };
    const roles = roleMap[resource.access_level];
    if (roles) {
      query = query.in('role', roles);
    }
  }

  const { data: users, error } = await query;

  if (error) {
    console.error('[resources-lifecycle] User query error:', error.message);
    return;
  }

  if (users && users.length > 0) {
    const userIds = users.map((u: { id: string }) => u.id);
    await createBulkInAppNotifications(supabase, userIds, {
      type: 'resource_new',
      title: `New Resource: ${resource.title}`,
      message: resource.title,
      link: `/resources`,
      metadata: { resourceId: resource.id },
    });
  }
}
