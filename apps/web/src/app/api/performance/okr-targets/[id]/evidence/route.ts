import { createOKRTargetEvidenceSchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getAuthedPerformanceContext,
  isPerformanceAdmin,
  resolveEmployeeIdForUser,
} from '../../../_lib';

const OKR_TARGET_EVIDENCE_BUCKET = 'okr-target-evidence';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

type SupabaseAdminClient = Awaited<ReturnType<typeof getAuthedPerformanceContext>>['supabaseAdmin'];
type EvidenceInsertPayload = Record<string, unknown>;
type CreateEvidencePayloadResult =
  | { insertPayload: EvidenceInsertPayload; uploadedFilePath: string | null }
  | { response: NextResponse };

async function getTarget(
  supabaseAdmin: SupabaseAdminClient,
  targetId: string
): Promise<{ id: string; employee_id: string } | null> {
  const { data } = await supabaseAdmin
    .from('okr_targets')
    .select('id, employee_id')
    .eq('id', targetId)
    .maybeSingle();

  return data;
}

async function canReadTargetEvidence(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  role: string | null,
  targetEmployeeId: string
): Promise<boolean> {
  if (isPerformanceAdmin(role)) {
    return true;
  }

  const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, userId);
  return ownEmployeeId === targetEmployeeId;
}

async function canCreateTargetEvidence(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
  targetEmployeeId: string
): Promise<boolean> {
  const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, userId);
  return ownEmployeeId === targetEmployeeId;
}

async function removeUploadedEvidenceFile(
  supabaseAdmin: SupabaseAdminClient,
  uploadedFilePath: string | null
): Promise<void> {
  if (!uploadedFilePath) {
    return;
  }

  await supabaseAdmin.storage.from(OKR_TARGET_EVIDENCE_BUCKET).remove([uploadedFilePath]);
}

function createBaseInsertPayload(okrTargetId: string, userId: string): EvidenceInsertPayload {
  return {
    okr_target_id: okrTargetId,
    submitted_by: userId,
  };
}

function getValidatedFile(
  formData: FormData
): { file: File; label: string } | { response: NextResponse } {
  const file = formData.get('file');
  const labelValue = formData.get('label');
  const label = typeof labelValue === 'string' ? labelValue.trim() : '';

  if (!(file instanceof File)) {
    return { response: NextResponse.json({ error: 'No file provided' }, { status: 400 }) };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      response: NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 }),
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { response: NextResponse.json({ error: 'File type not allowed' }, { status: 400 }) };
  }

  return { file, label };
}

async function createMultipartEvidencePayload(params: {
  request: NextRequest;
  supabaseAdmin: SupabaseAdminClient;
  okrTargetId: string;
  userId: string;
}): Promise<CreateEvidencePayloadResult> {
  const formData = await params.request.formData();
  const fileResult = getValidatedFile(formData);
  if ('response' in fileResult) {
    return fileResult;
  }

  const timestamp = Date.now();
  const filePath = `${params.userId}/${params.okrTargetId}/${timestamp}_${sanitizeFileName(fileResult.file.name)}`;
  const fileBuffer = await fileResult.file.arrayBuffer();

  const { error: uploadError } = await params.supabaseAdmin.storage
    .from(OKR_TARGET_EVIDENCE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: fileResult.file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Failed to upload OKR target evidence file:', uploadError);
    return {
      response: NextResponse.json({ error: 'Failed to upload evidence file' }, { status: 500 }),
    };
  }

  const parsed = createOKRTargetEvidenceSchema.safeParse({
    evidenceType: 'file',
    content: filePath,
    label: fileResult.label || null,
  });

  if (!parsed.success) {
    await removeUploadedEvidenceFile(params.supabaseAdmin, filePath);
    return {
      response: NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      ),
    };
  }

  return {
    insertPayload: {
      ...createBaseInsertPayload(params.okrTargetId, params.userId),
      evidence_type: parsed.data.evidenceType,
      content: parsed.data.content,
      label: parsed.data.label || null,
      file_name: fileResult.file.name,
      file_size: fileResult.file.size,
      mime_type: fileResult.file.type,
    },
    uploadedFilePath: filePath,
  };
}

async function createJsonEvidencePayload(params: {
  request: NextRequest;
  okrTargetId: string;
  userId: string;
}): Promise<CreateEvidencePayloadResult> {
  const body = await params.request.json();
  const parsed = createOKRTargetEvidenceSchema.safeParse(body);

  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      ),
    };
  }

  return {
    insertPayload: {
      ...createBaseInsertPayload(params.okrTargetId, params.userId),
      evidence_type: parsed.data.evidenceType,
      content: parsed.data.content,
      label: parsed.data.label || null,
      ...(parsed.data.evidenceType === 'file'
        ? {
            file_name: typeof body.fileName === 'string' ? body.fileName : null,
            file_size: typeof body.fileSize === 'number' ? body.fileSize : null,
            mime_type: typeof body.mimeType === 'string' ? body.mimeType : null,
          }
        : {}),
    },
    uploadedFilePath: null,
  };
}

async function createEvidencePayload(params: {
  request: NextRequest;
  supabaseAdmin: SupabaseAdminClient;
  okrTargetId: string;
  userId: string;
}): Promise<CreateEvidencePayloadResult> {
  const contentType = params.request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    return createMultipartEvidencePayload(params);
  }

  return createJsonEvidencePayload(params);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: okrTargetId } = await params;
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const target = await getTarget(supabaseAdmin, okrTargetId);
    if (!target) {
      return NextResponse.json({ error: 'OKR target not found' }, { status: 404 });
    }

    const canRead = await canReadTargetEvidence(supabaseAdmin, user.id, role, target.employee_id);
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: evidence, error: fetchError } = await supabaseAdmin
      .from('okr_target_evidence')
      .select('*')
      .eq('okr_target_id', okrTargetId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
    }

    const submitterIds = [...new Set((evidence || []).map((item) => item.submitted_by))];
    const namesMap = new Map<string, string>();

    if (submitterIds.length > 0) {
      const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', submitterIds)
        .is('deleted_at', null);

      for (const employee of employees || []) {
        namesMap.set(employee.user_id, `${employee.first_name} ${employee.last_name}`);
      }
    }

    const enriched = await Promise.all(
      (evidence || []).map(async (item) => {
        let downloadUrl: string | null = null;

        if (item.evidence_type === 'file' && item.content) {
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from(OKR_TARGET_EVIDENCE_BUCKET)
            .createSignedUrl(item.content, 60 * 10);

          downloadUrl = signedUrlData?.signedUrl ?? null;
        }

        return {
          ...item,
          submitted_by_name: namesMap.get(item.submitted_by) || 'Unknown',
          download_url: downloadUrl,
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('GET /api/performance/okr-targets/[id]/evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let uploadedFilePath: string | null = null;
  let supabaseAdmin: SupabaseAdminClient | null = null;

  try {
    const { id: okrTargetId } = await params;
    const context = await getAuthedPerformanceContext();
    supabaseAdmin = context.supabaseAdmin;
    const { user, error } = context;

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const target = await getTarget(supabaseAdmin, okrTargetId);
    if (!target) {
      return NextResponse.json({ error: 'OKR target not found' }, { status: 404 });
    }

    const canCreate = await canCreateTargetEvidence(supabaseAdmin, user.id, target.employee_id);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Only the target owner can submit evidence' },
        { status: 403 }
      );
    }

    const preparedPayload = await createEvidencePayload({
      request,
      supabaseAdmin,
      okrTargetId,
      userId: user.id,
    });
    if ('response' in preparedPayload) {
      return preparedPayload.response;
    }

    uploadedFilePath = preparedPayload.uploadedFilePath;

    const { data: evidence, error: insertError } = await supabaseAdmin
      .from('okr_target_evidence')
      .insert(preparedPayload.insertPayload)
      .select('*')
      .single();

    if (insertError || !evidence) {
      await removeUploadedEvidenceFile(supabaseAdmin, uploadedFilePath);
      console.error('Failed to create OKR target evidence:', insertError);
      return NextResponse.json({ error: 'Failed to submit evidence' }, { status: 500 });
    }

    return NextResponse.json({ data: evidence }, { status: 201 });
  } catch (error) {
    if (supabaseAdmin) {
      await removeUploadedEvidenceFile(supabaseAdmin, uploadedFilePath);
    }
    console.error('POST /api/performance/okr-targets/[id]/evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const evidenceId = request.nextUrl.searchParams.get('evidenceId');
    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }

    const { data: evidence, error: fetchError } = await supabaseAdmin
      .from('okr_target_evidence')
      .select('id, submitted_by, content, evidence_type')
      .eq('id', evidenceId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    if (evidence.submitted_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the submitter can delete evidence' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('okr_target_evidence')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', evidenceId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete evidence' }, { status: 500 });
    }

    if (evidence.evidence_type === 'file' && evidence.content) {
      await supabaseAdmin.storage.from(OKR_TARGET_EVIDENCE_BUCKET).remove([evidence.content]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/performance/okr-targets/[id]/evidence error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
