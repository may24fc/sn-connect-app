import { logActivity } from '@/lib/audit';
import { inngest } from '@/lib/inngest/client';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { extractReceiptFromImage, extractReceiptFromText } from '@hr-portal/ai';
import { type NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';

export const runtime = 'nodejs';

const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

function getRoleFromUser(user: { app_metadata?: Record<string, unknown> }): string | null {
  const dbRole = user.app_metadata?.db_role;
  return typeof dbRole === 'string' ? dbRole : null;
}

async function resolveUserRole(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  appRole: string | null
): Promise<string | null> {
  if (appRole) {
    return appRole;
  }

  const { data: roleData, error } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve user role: ${error.message}`);
  }

  return roleData?.role ?? null;
}

function isSubmitterRoleAllowed(role: string | null): boolean {
  return role === 'employee' || role === 'intern';
}

function parseExpenseUploadFormData(formData: FormData): {
  file: File;
  businessJustification: string | null;
} {
  const file = formData.get('file');
  const businessJustificationRaw = formData.get('businessJustification');

  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 10MB limit');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Allowed: PDF, JPG, PNG, WEBP');
  }

  const businessJustification =
    typeof businessJustificationRaw === 'string' && businessJustificationRaw.trim().length > 0
      ? businessJustificationRaw.trim()
      : null;

  return { file, businessJustification };
}

async function resolveEmployeeProfile(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<{ employeeId: string; departmentId: string | null }> {
  const { data, error } = await adminClient
    .from('employees')
    .select('id, user:users!employees_user_id_fkey(department_id)')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve employee profile: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error('No employee profile found for current user');
  }

  const userRow = Array.isArray(data.user) ? data.user[0] : data.user;

  return {
    employeeId: data.id,
    departmentId: userRow?.department_id ?? null,
  };
}

async function persistReceiptDocument(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  fileBuffer: ArrayBuffer,
  file: File,
  employeeId: string,
  userId: string
): Promise<{ filePath: string; documentId: string }> {
  const filePath = `${employeeId}/other/${Date.now()}_${sanitizeFileName(file.name)}`;

  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(EXPENSE_RECEIPTS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError || !uploadData?.path) {
    throw new Error('Failed to upload receipt file');
  }

  const { data: documentData, error: documentError } = await adminClient
    .from('documents')
    .insert({
      employee_id: employeeId,
      document_type: 'other',
      file_path: uploadData.path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      is_confidential: false,
      notes: 'expense_receipt',
      uploaded_by: userId,
      created_by: userId,
    })
    .select('id')
    .single();

  if (documentError || !documentData?.id) {
    throw new Error('Failed to create receipt document record');
  }

  return { filePath: uploadData.path, documentId: documentData.id };
}

async function rollbackReceiptArtifacts(
  filePath: string | null,
  documentId: string | null
): Promise<void> {
  if (!(filePath || documentId)) {
    return;
  }

  const adminClient = createSupabaseAdminClient();

  if (documentId) {
    await adminClient.from('documents').delete().eq('id', documentId);
  }

  if (filePath) {
    await adminClient.storage.from(EXPENSE_RECEIPTS_BUCKET).remove([filePath]);
  }
}

function getErrorStatusCode(message: string): number {
  if (
    message.includes('No file provided') ||
    message.includes('File size exceeds') ||
    message.includes('Unsupported file type') ||
    message.includes('No employee profile found')
  ) {
    return 400;
  }

  if (message.includes('Forbidden')) {
    return 403;
  }

  return 500;
}

function inferExpenseType(vendorName: string):
  | 'office_supplies'
  | 'travel'
  | 'meals'
  | 'software'
  | 'equipment'
  | 'utilities'
  | 'maintenance'
  | 'other' {
  const normalized = vendorName.trim().toLowerCase();

  if (/microsoft|google|aws|openai|anthropic|figma|notion|slack|github/.test(normalized)) {
    return 'software';
  }

  if (/uber|grab|lyft|airlines|hotel|booking|expedia|transport/.test(normalized)) {
    return 'travel';
  }

  if (/starbucks|restaurant|cafe|coffee|food|meal/.test(normalized)) {
    return 'meals';
  }

  if (/office|depot|staples|paper|stationery/.test(normalized)) {
    return 'office_supplies';
  }

  if (/electric|water|internet|telecom|utility/.test(normalized)) {
    return 'utilities';
  }

  if (/repair|maintenance|service center|mechanic/.test(normalized)) {
    return 'maintenance';
  }

  if (/laptop|monitor|printer|hardware|device|equipment/.test(normalized)) {
    return 'equipment';
  }

  return 'other';
}

async function suggestDraftAccounts(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  vendorName: string
): Promise<{
  debitAccount: string;
  creditAccount: string;
  confidence: number;
}> {
  const vendorPrefix = `${vendorName.trim()}%`;

  const { data, error } = await adminClient
    .from('expense_entries')
    .select('verified_debit_account, verified_credit_account')
    .ilike('vendor_name', vendorPrefix)
    .not('verified_debit_account', 'is', null)
    .not('verified_credit_account', 'is', null)
    .is('deleted_at', null)
    .order('reviewed_at', { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return {
      debitAccount: 'Operating Expenses',
      creditAccount: 'Company Credit Card',
      confidence: 0.35,
    };
  }

  const frequencyMap = new Map<string, number>();
  for (const row of data) {
    const key = `${row.verified_debit_account}|${row.verified_credit_account}`;
    frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1);
  }

  let topKey = '';
  let topCount = 0;
  for (const [key, count] of frequencyMap.entries()) {
    if (count > topCount) {
      topKey = key;
      topCount = count;
    }
  }

  const [debitAccount, creditAccount] = topKey.split('|');
  const confidence = Math.min(0.95, 0.5 + topCount / (data.length * 2));

  return {
    debitAccount: debitAccount ?? 'Operating Expenses',
    creditAccount: creditAccount ?? 'Company Credit Card',
    confidence,
  };
}

async function extractFromPdf(fileBuffer: ArrayBuffer): Promise<{
  vendorName: string;
  transactionDate: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  fieldConfidence: {
    vendorName: number;
    transactionDate: number;
    totalAmount: number;
    taxAmount: number;
    currency: number;
  };
}> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  await pdf.destroy();

  if (text && text.trim().length >= 20) {
    return extractReceiptFromText(text);
  }

  // Fallback for scanned/image-based PDFs that do not expose selectable text.
  try {
    return await extractReceiptFromImage(Buffer.from(fileBuffer).toString('base64'), 'application/pdf');
  } catch (imageFallbackError) {
    const message =
      imageFallbackError instanceof Error ? imageFallbackError.message : 'Unknown PDF image extraction error';
    throw new Error(`PDF has no extractable text and image fallback failed: ${message}`);
  }
}

async function processReceiptInlineFallback(params: {
  adminClient: ReturnType<typeof createSupabaseAdminClient>;
  expenseEntryId: string;
  fileBuffer: ArrayBuffer;
  mimeType: string;
}): Promise<{ applied: boolean; reason?: string; error?: string }> {
  const { adminClient, expenseEntryId, fileBuffer, mimeType } = params;

  const { data: currentEntry, error: currentEntryError } = await adminClient
    .from('expense_entries')
    .select('id, processing_status')
    .eq('id', expenseEntryId)
    .is('deleted_at', null)
    .maybeSingle();

  if (currentEntryError || !currentEntry?.id) {
    return {
      applied: false,
      error: currentEntryError?.message ?? 'Queued entry not found for inline fallback',
    };
  }

  if (currentEntry.processing_status !== 'draft_extracted') {
    return { applied: false, reason: 'entry_already_processed' };
  }

  try {
    const extraction =
      mimeType === 'application/pdf'
        ? await extractFromPdf(fileBuffer)
        : await extractReceiptFromImage(Buffer.from(fileBuffer).toString('base64'), mimeType);

    const suggestion = await suggestDraftAccounts(adminClient, extraction.vendorName);
    const extractionConfidenceAverage =
      (extraction.fieldConfidence.vendorName +
        extraction.fieldConfidence.transactionDate +
        extraction.fieldConfidence.totalAmount +
        extraction.fieldConfidence.taxAmount +
        extraction.fieldConfidence.currency) /
      5;

    const combinedAiConfidence = Math.min(
      0.99,
      (extractionConfidenceAverage + suggestion.confidence) / 2
    );

    const inferredExpenseType = inferExpenseType(extraction.vendorName);

    const { error: updateError } = await adminClient
      .from('expense_entries')
      .update({
        vendor_name: extraction.vendorName,
        transaction_date: extraction.transactionDate,
        total_amount: extraction.totalAmount,
        tax_amount: extraction.taxAmount,
        currency: extraction.currency,
        draft_debit_account: suggestion.debitAccount,
        draft_credit_account: suggestion.creditAccount,
        ai_debit_account: suggestion.debitAccount,
        ai_credit_account: suggestion.creditAccount,
        ai_confidence: combinedAiConfidence,
        expense_type: inferredExpenseType,
        processing_status: 'awaiting_intern_review',
      })
      .eq('id', expenseEntryId)
      .is('deleted_at', null)
      .eq('processing_status', 'draft_extracted');

    if (updateError) {
      return { applied: false, error: updateError.message };
    }

    return { applied: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown extraction error';

    await adminClient
      .from('expense_entries')
      .update({
        processing_status: 'awaiting_intern_review',
        reviewer_notes: `Receipt extraction failed: ${message}`,
      })
      .eq('id', expenseEntryId)
      .is('deleted_at', null)
      .eq('processing_status', 'draft_extracted');

    return { applied: false, error: message };
  }
}

/**
 * POST /api/expenses/ingest
 * Queues receipt processing via background workers. This endpoint is non-blocking
 * and returns immediately once storage + queue entry are created.
 */
export async function POST(request: NextRequest) {
  let uploadedFilePath: string | null = null;
  let createdDocumentId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolveUserRole(adminClient, user.id, getRoleFromUser(user));
    if (!isSubmitterRoleAllowed(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const { file, businessJustification } = parseExpenseUploadFormData(formData);
    const { employeeId, departmentId } = await resolveEmployeeProfile(adminClient, user.id);

    const fileBuffer = await file.arrayBuffer();
    const { filePath, documentId } = await persistReceiptDocument(
      adminClient,
      fileBuffer,
      file,
      employeeId,
      user.id
    );

    uploadedFilePath = filePath;
    createdDocumentId = documentId;

    const { data: expenseEntry, error: expenseError } = await adminClient
      .from('expense_entries')
      .insert({
        employee_id: employeeId,
        submitted_by: user.id,
        receipt_document_id: documentId,
        vendor_name: 'Processing receipt',
        transaction_date: new Date().toISOString().slice(0, 10),
        total_amount: 0,
        tax_amount: 0,
        currency: 'USD',
        risk_bucket: 'pending',
        processing_status: 'draft_extracted',
        business_justification: businessJustification,
        expense_type: 'other',
        department_id: departmentId,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (expenseError || !expenseEntry) {
      return NextResponse.json({ error: 'Failed to create queued expense entry' }, { status: 500 });
    }

    let queueDispatchFailed = false;
    let queueDispatchErrorMessage: string | null = null;
    let inlineFallbackApplied = false;
    let inlineFallbackReason: string | null = null;
    let inlineFallbackError: string | null = null;

    try {
      await inngest.send({
        name: 'expenses/receipt.uploaded',
        data: {
          expenseEntryId: expenseEntry.id,
          receiptDocumentId: documentId,
          filePath,
          mimeType: file.type,
          submittedBy: user.id,
        },
      });

      const shouldRunInlineFallback =
        process.env.EXPENSE_OCR_INLINE_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';

      if (shouldRunInlineFallback) {
        const fallbackResult = await processReceiptInlineFallback({
          adminClient,
          expenseEntryId: expenseEntry.id,
          fileBuffer,
          mimeType: file.type,
        });

        inlineFallbackApplied = fallbackResult.applied;
        inlineFallbackReason = fallbackResult.reason ?? null;
        inlineFallbackError = fallbackResult.error ?? null;
      }
    } catch (dispatchError) {
      queueDispatchFailed = true;
      queueDispatchErrorMessage =
        dispatchError instanceof Error ? dispatchError.message : 'Failed to dispatch OCR queue event';

      // Degrade gracefully so upload succeeds even if the background event bus is unavailable.
      await adminClient
        .from('expense_entries')
        .update({
          processing_status: 'awaiting_intern_review',
          reviewer_notes: `OCR queue dispatch failed: ${queueDispatchErrorMessage}. Proceeding with manual review path.`,
        })
        .eq('id', expenseEntry.id)
        .is('deleted_at', null);
    }

    logActivity(supabase, {
      userId: user.id,
      action: queueDispatchFailed ? 'queue_expense_receipt_ingestion_degraded' : 'queue_expense_receipt_ingestion',
      tableName: 'expense_entries',
      recordId: expenseEntry.id,
      metadata: {
        filePath,
        mimeType: file.type,
        businessJustificationProvided: Boolean(businessJustification),
        queueDispatchFailed,
        queueDispatchErrorMessage,
        inlineFallbackApplied,
        inlineFallbackReason,
        inlineFallbackError,
      },
    });

    if (queueDispatchFailed) {
      return NextResponse.json(
        {
          data: {
            expenseEntry,
            warning:
              'Receipt uploaded, but OCR queue dispatch failed. Entry was moved to manual review to avoid queue lock.',
          },
        },
        { status: 202 }
      );
    }

    return NextResponse.json({ data: { expenseEntry } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    await rollbackReceiptArtifacts(uploadedFilePath, createdDocumentId);

    return NextResponse.json({ error: message }, { status: getErrorStatusCode(message) });
  }
}
