import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/documents/[id]/download
 * Generate signed URL for document download
 * Permissions: Document owner and admins (via RLS)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch document (RLS will ensure user has access)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Generate signed URL (valid for 60 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(document.file_path, 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Error generating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      fileName: document.file_name,
      mimeType: document.mime_type,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/documents/[id]/download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
