import { logActivity } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * POST /api/documents/upload
 * Upload document file to storage and create database record
 * Permissions: Employees can upload to their own 201 file, admins can upload to any
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const documentType = formData.get('documentType') as string;
    const isConfidential = formData.get('isConfidential') === 'true';
    const notes = formData.get('notes') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Validate required fields
    if (!(employeeId && documentType)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${employeeId}/${documentType}/${timestamp}_${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create document record in database
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        employee_id: employeeId,
        document_type: documentType,
        file_path: uploadData.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        is_confidential: isConfidential,
        notes,
        uploaded_by: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (documentError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('employee-documents').remove([filePath]);

      console.error('Error creating document record:', documentError);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'upload_document',
      tableName: 'documents',
      recordId: documentData.id,
      metadata: { employeeId, documentType },
    });

    return NextResponse.json({ data: documentData }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/documents/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
