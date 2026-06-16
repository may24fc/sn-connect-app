import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load resource
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('id, pending_changes, approval_status, author_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (resource.approval_status === 'pending_approval') {
      const { data, error: approveError } = await supabase
        .from('resources')
        .update({ status: 'published', approval_status: 'approved', published_at: now, reviewed_by: user.id, reviewed_at: now, reviewer_notes: null })
        .eq('id', id)
        .select('*')
        .single();

      if (approveError || !data) {
        console.error('Error approving resource:', approveError);
        return NextResponse.json({ error: 'Failed to approve resource' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'approve_resource',
        tableName: 'resources',
        recordId: id,
      });

      // Notify author that resource was approved
      try {
        const { data: resourceRow } = await supabase.from('resources').select('author_id, title').eq('id', id).single();
        if (resourceRow && resourceRow.author_id) {
          const notif = {
            user_id: resourceRow.author_id,
            type: 'resource_approved',
            title: 'Resource approved',
            message: `Your resource "${resourceRow.title}" was approved by ${user.email || user.id}`,
            link: `/information-hub/resources/${id}`,
            metadata: { resourceId: id },
          };
          const { error: notifError } = await supabase.from('notifications').insert(notif);
          if (notifError) console.error('Failed to insert approval notification:', notifError);
        }
      } catch (err) {
        console.error('Notification error (approve):', err);
      }

      return NextResponse.json({ data });
    }

    if (resource.approval_status === 'pending_update' && resource.pending_changes) {
      const apply = { ...resource.pending_changes, pending_changes: null, approval_status: 'approved', reviewed_by: user.id, reviewed_at: now, reviewer_notes: null };
      const { data, error: applyError } = await supabase.from('resources').update(apply).eq('id', id).select('*').single();

      if (applyError || !data) {
        console.error('Error applying pending update:', applyError);
        return NextResponse.json({ error: 'Failed to apply update' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'approve_resource_update',
        tableName: 'resources',
        recordId: id,
      });

      // Notify author that update was approved
      try {
        const { data: resourceRow } = await supabase.from('resources').select('author_id, title').eq('id', id).single();
        if (resourceRow && resourceRow.author_id) {
          const notif = {
            user_id: resourceRow.author_id,
            type: 'resource_approved',
            title: 'Resource update approved',
            message: `An update to your resource "${resourceRow.title}" was approved by ${user.email || user.id}`,
            link: `/information-hub/resources/${id}`,
            metadata: { resourceId: id },
          };
          const { error: notifError } = await supabase.from('notifications').insert(notif);
          if (notifError) console.error('Failed to insert approval notification (update):', notifError);
        }
      } catch (err) {
        console.error('Notification error (approve update):', err);
      }

      return NextResponse.json({ data });
    }

    if (resource.approval_status === 'pending_deletion') {
      const { error: deleteError } = await supabase
        .from('resources')
        .update({ deleted_at: now, approval_status: 'approved', reviewed_by: user.id, reviewed_at: now })
        .eq('id', id);

      if (deleteError) {
        console.error('Error approving deletion:', deleteError);
        return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'approve_resource_deletion',
        tableName: 'resources',
        recordId: id,
      });

      // Notify author that deletion request was approved
      try {
        const { data: resourceRow } = await supabase.from('resources').select('author_id, title').eq('id', id).single();
        if (resourceRow && resourceRow.author_id) {
          const notif = {
            user_id: resourceRow.author_id,
            type: 'resource_approved',
            title: 'Deletion approved',
            message: `Your deletion request for "${resourceRow.title}" was approved by ${user.email || user.id}`,
            link: '/information-hub',
            metadata: { resourceId: id },
          };
          const { error: notifError } = await supabase.from('notifications').insert(notif);
          if (notifError) console.error('Failed to insert approval notification (deletion):', notifError);
        }
      } catch (err) {
        console.error('Notification error (approve deletion):', err);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No pending action for this resource' }, { status: 400 });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
