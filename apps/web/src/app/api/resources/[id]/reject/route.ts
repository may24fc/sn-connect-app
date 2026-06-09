import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const notes = typeof body?.notes === 'string' ? body.notes : null;

    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('id, pending_changes, approval_status, title, author_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (resource.approval_status === 'pending_approval') {
      const { data, error: rejectError } = await supabase
        .from('resources')
        .update({ approval_status: 'rejected', reviewer_notes: notes, reviewed_by: user.id, reviewed_at: now })
        .eq('id', id)
        .select('*')
        .single();

      if (rejectError || !data) {
        console.error('Error rejecting submission:', rejectError);
        return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'reject_resource_submission',
        tableName: 'resources',
        recordId: id,
      });

      // Notify author of rejection
      try {
        if (resource.author_id) {
          const notif = {
            user_id: resource.author_id,
            type: 'resource_rejected',
            title: 'Resource rejected',
            message: `Your submission \"${resource.title}\" was rejected${notes ? `: ${notes}` : ''}`,
            link: `/resources/${id}`,
            metadata: { resourceId: id, reviewerId: user.id },
          };
          const { error: notifError } = await supabase.from('notifications').insert(notif);
          if (notifError) console.error('Failed to insert rejection notification:', notifError);
        }
      } catch (err) {
        console.error('Notification error (reject submission):', err);
      }

      return NextResponse.json({ data });
    }

    if (resource.approval_status === 'pending_update') {
      // Clear pending changes and keep original approved resource state
      const { data, error: rejectError } = await supabase
        .from('resources')
        .update({ pending_changes: null, approval_status: 'approved', reviewer_notes: notes, reviewed_by: user.id, reviewed_at: now })
        .eq('id', id)
        .select('*')
        .single();

      if (rejectError || !data) {
        console.error('Error rejecting update:', rejectError);
        return NextResponse.json({ error: 'Failed to reject update' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'reject_resource_update',
        tableName: 'resources',
        recordId: id,
      });

      // Notify author that the update was rejected
      try {
        if (resource.author_id) {
          const notif = {
            user_id: resource.author_id,
            type: 'resource_rejected',
            title: 'Resource update rejected',
            message: `An update to \"${resource.title}\" was rejected${notes ? `: ${notes}` : ''}`,
            link: `/resources/${id}`,
            metadata: { resourceId: id, reviewerId: user.id },
          };
          const { error: notifError } = await supabase.from('notifications').insert(notif);
          if (notifError) console.error('Failed to insert rejection notification (update):', notifError);
        }
      } catch (err) {
        console.error('Notification error (reject update):', err);
      }

      return NextResponse.json({ data });
    }

    if (resource.approval_status === 'pending_deletion') {
      // Cancel deletion request
      const { data, error: rejectError } = await supabase
        .from('resources')
        .update({ approval_status: 'approved', reviewer_notes: notes, reviewed_by: user.id, reviewed_at: now })
        .eq('id', id)
        .select('*')
        .single();

      if (rejectError || !data) {
        console.error('Error rejecting deletion request:', rejectError);
        return NextResponse.json({ error: 'Failed to reject deletion request' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'reject_resource_deletion',
        tableName: 'resources',
        recordId: id,
      });

      // Notify author that deletion request was rejected
      try {
        if (resource.author_id) {
          const notif = {
            user_id: resource.author_id,
            type: 'resource_rejected',
            title: 'Deletion request rejected',
            message: `Your deletion request for \"${resource.title}\" was rejected${notes ? `: ${notes}` : ''}`,
            link: `/resources/${id}`,
            metadata: { resourceId: id, reviewerId: user.id },
          };
          const { error: notifError } = await supabase.from('notifications').insert(notif);
          if (notifError) console.error('Failed to insert rejection notification (deletion):', notifError);
        }
      } catch (err) {
        console.error('Notification error (reject deletion):', err);
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'No pending action for this resource' }, { status: 400 });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/[id]/reject:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
