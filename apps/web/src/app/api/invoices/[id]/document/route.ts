import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/invoices/[id]/document
 *
 * Returns a short-lived signed URL for the invoice's attached document.
 * Access rules:
 *   - admin / super_admin: may view any invoice's document.
 *   - employee: may only view documents attached to their own invoices.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Fetch the invoice and its owner using the admin client (bypasses RLS).
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('id, document_id, employees(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.document_id) {
      return NextResponse.json({ error: 'Invoice has no attached document' }, { status: 404 });
    }

    // Permission check.
    const role =
      typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin'].includes(role ?? '');

    if (!isAdmin) {
      const employees = invoice.employees;
      const ownerUserId = Array.isArray(employees)
        ? employees[0]?.user_id
        : (employees as { user_id?: string } | null)?.user_id;

      if (ownerUserId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch document metadata.
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('file_path, file_name, mime_type')
      .eq('id', invoice.document_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generate a signed URL valid for 10 minutes — long enough for the browser to
    // start loading the inline preview without a race condition.
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('employee-documents')
      .createSignedUrl(document.file_path, 600);

    if (signedUrlError || !signedUrlData) {
      console.error('Error generating invoice document signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      fileName: document.file_name,
      mimeType: document.mime_type,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/invoices/[id]/document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
