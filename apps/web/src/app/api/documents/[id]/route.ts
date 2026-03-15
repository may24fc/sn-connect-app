import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/documents/[id]
 * Soft-delete a document (sets deleted_at, retains for 30 days).
 * Only the uploader or an admin/super_admin can delete.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the document to check ownership
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, uploaded_by, employee_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check permission: uploader or admin
    const role =
      typeof user.app_metadata?.db_role === 'string'
        ? user.app_metadata.db_role
        : null;

    if (!role) {
      const { data: roleData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (roleData?.role) {
        // use resolved role below
        const resolvedRole = roleData.role;
        const isAdmin = ['admin', 'super_admin'].includes(resolvedRole);
        const isUploader = document.uploaded_by === user.id;

        if (!isAdmin && !isUploader) {
          return NextResponse.json(
            { error: 'You can only delete documents you uploaded' },
            { status: 403 }
          );
        }
      }
    } else {
      const isAdmin = ['admin', 'super_admin'].includes(role);
      const isUploader = document.uploaded_by === user.id;

      if (!isAdmin && !isUploader) {
        return NextResponse.json(
          { error: 'You can only delete documents you uploaded' },
          { status: 403 }
        );
      }
    }

    // Soft-delete: set deleted_at
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error soft-deleting document:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/documents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
