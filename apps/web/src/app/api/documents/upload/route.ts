import { logActivity } from '@/lib/audit';
import { getActiveUserRole } from '@/lib/auth/active-role';
import { resolveStagedFormData } from '@/lib/storage/upload-staging.server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const ALLOWED_DOCUMENT_TYPES = [
  'contract',
  'id',
  'certificate',
  'performance_review',
  'resume',
  'medical_record',
  'tax_document',
  'nda',
  'handbook_acknowledgment',
  'other',
];

function validateUploadInput(
  file: File | null,
  employeeId: string | null,
  documentType: string | null
): NextResponse | null {
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }
  if (!(employeeId && documentType)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  }
  return null;
}

function storageUploadErrorResponse(message: string): NextResponse {
  const normalizedMessage = message.toLowerCase();
  const isRejectedFile = normalizedMessage.includes('mime') || normalizedMessage.includes('size');
  return NextResponse.json(
    {
      error: isRejectedFile
        ? 'File does not meet the storage requirements'
        : 'Failed to upload file',
    },
    { status: isRejectedFile ? 400 : 500 }
  );
}

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
    const formData = await resolveStagedFormData(await request.formData());
    const fileEntry = formData.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;
    const employeeId = formData.get('employeeId') as string | null;
    const documentType = formData.get('documentType') as string | null;
    const isConfidential = formData.get('isConfidential') === 'true';
    const notes = formData.get('notes') as string | null;

    const validationError = validateUploadInput(file, employeeId, documentType);
    if (validationError) return validationError;

    // The validator above narrows the runtime values; keep the non-null aliases
    // explicit for the database and path contracts below.
    const validatedFile = file as File;
    const validatedEmployeeId = employeeId as string;
    const validatedDocumentType = documentType as string;

    // Authorize the target explicitly before using the service-role client below.
    // Privileged admin accounts are intentionally not workforce identities, but
    // their admin role still permits production QA uploads for an employee owner.
    const role = await getActiveUserRole(user.id);
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: targetEmployee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, user_id')
      .eq('id', validatedEmployeeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (employeeError) {
      console.error('Error resolving document employee:', employeeError);
      return NextResponse.json({ error: 'Failed to resolve employee profile' }, { status: 500 });
    }

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!isAdmin && targetEmployee.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Cannot upload documents for another employee' },
        { status: 403 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = validatedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${validatedEmployeeId}/${validatedDocumentType}/${timestamp}_${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await validatedFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('employee-documents')
      .upload(filePath, fileBuffer, {
        contentType: validatedFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return storageUploadErrorResponse(uploadError.message);
    }

    // Create document record in database
    const { data: documentData, error: documentError } = await supabaseAdmin
      .from('documents')
      .insert({
        employee_id: validatedEmployeeId,
        document_type: validatedDocumentType,
        file_path: uploadData.path,
        file_name: validatedFile.name,
        file_size: validatedFile.size,
        mime_type: validatedFile.type,
        is_confidential: isConfidential,
        notes,
        uploaded_by: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (documentError) {
      // Rollback: delete uploaded file
      await supabaseAdmin.storage.from('employee-documents').remove([filePath]);

      console.error('Error creating document record:', documentError);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'upload_document',
      tableName: 'documents',
      recordId: documentData.id,
      metadata: { employeeId: validatedEmployeeId, documentType: validatedDocumentType },
    });

    return NextResponse.json({ data: documentData }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/documents/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
