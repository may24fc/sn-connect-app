import { logActivity } from '@/lib/audit';
import { getActiveUserRole } from '@/lib/auth/active-role';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    const parsedId = z.string().uuid().safeParse((await params).id);
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const id = parsedId.data;
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
    const role = await getActiveUserRole(user.id);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin'].includes(role) && document.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete documents you uploaded' },
        { status: 403 }
      );
    }

    // Invoices and expense entries read their file from this document; deleting it here
    // would break their previews, so it has to be changed from that record instead.
    const [invoiceLink, expenseLink] = await Promise.all([
      supabaseAdmin
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', id)
        .is('deleted_at', null),
      supabaseAdmin
        .from('expense_entries')
        .select('id', { count: 'exact', head: true })
        .eq('receipt_document_id', id)
        .is('deleted_at', null),
    ]);
    if (invoiceLink.error || expenseLink.error) {
      console.error('Error checking document links:', invoiceLink.error ?? expenseLink.error);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
    if ((invoiceLink.count ?? 0) > 0 || (expenseLink.count ?? 0) > 0) {
      const usedBy = (invoiceLink.count ?? 0) > 0 ? 'an invoice' : 'an expense';
      return NextResponse.json(
        { error: `This document is attached to ${usedBy}. Remove it from there instead.` },
        { status: 409 }
      );
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

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_document',
      tableName: 'documents',
      recordId: id,
      metadata: { employeeId: document.employee_id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/documents/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
