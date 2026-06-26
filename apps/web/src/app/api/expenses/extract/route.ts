import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { extractReceiptFromImage, extractReceiptFromText } from '@hr-portal/ai';
import { type NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';

const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

type DraftAccountSuggestion = {
  debitAccount: string;
  creditAccount: string;
  confidence: number;
  source: 'historical_vendor_match' | 'fallback_default';
};

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

function getRoleFromUser(user: { app_metadata?: Record<string, unknown> }): string | null {
  const dbRole = user.app_metadata?.db_role;
  return typeof dbRole === 'string' ? dbRole : null;
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

  if (uploadError) {
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

  if (message.includes('no extractable text')) {
    return 422;
  }

  return 500;
}

async function resolveUserRole(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  appRole: string | null
): Promise<string | null> {
  if (appRole) {
    return appRole;
  }

  const { data: roleData, error: roleError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (roleError) {
    throw new Error(`Failed to resolve user role: ${roleError.message}`);
  }

  return roleData?.role ?? null;
}

function isSubmitterRoleAllowed(role: string | null): boolean {
  return (
    role === 'employee' ||
    role === 'intern' ||
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'hr' ||
    role === 'cos' ||
    role === 'ceo'
  );
}

async function resolveEmployeeId(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<string> {
  const { data: employeeData, error: employeeError } = await adminClient
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (employeeError) {
    throw new Error(`Failed to resolve employee profile: ${employeeError.message}`);
  }

  if (!employeeData?.id) {
    throw new Error('No employee profile found for current user');
  }

  return employeeData.id;
}

async function suggestDraftAccounts(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  vendorName: string
): Promise<DraftAccountSuggestion> {
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

  if (error) {
    console.error('Failed to load historical expense mappings:', error);
  }

  if (!data || data.length === 0) {
    return {
      debitAccount: 'Operating Expenses',
      creditAccount: 'Company Credit Card',
      confidence: 0.35,
      source: 'fallback_default',
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
    source: 'historical_vendor_match',
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
  };
  model: string;
}> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  await pdf.destroy();

  if (!text || text.trim().length < 20) {
    throw new Error('PDF has no extractable text. Upload a text-based PDF or image receipt.');
  }

  return extractReceiptFromText(text);
}

/**
 * POST /api/expenses/extract
 * Uploads a receipt, extracts key fields with AI, suggests draft debit/credit accounts,
 * and creates an expense queue entry for intern verification.
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

    const employeeId = await resolveEmployeeId(adminClient, user.id);
    const fileBuffer = await file.arrayBuffer();

    // Store original receipt first so the review queue can render split-screen receipt + draft.
    const { filePath, documentId } = await persistReceiptDocument(
      adminClient,
      fileBuffer,
      file,
      employeeId,
      user.id
    );

    uploadedFilePath = filePath;
    createdDocumentId = documentId;

    const extraction =
      file.type === 'application/pdf'
        ? await extractFromPdf(fileBuffer)
        : await extractReceiptFromImage(Buffer.from(fileBuffer).toString('base64'), file.type);

    const suggestion = await suggestDraftAccounts(adminClient, extraction.vendorName);

    const extractionConfidenceAverage =
      (extraction.fieldConfidence.vendorName +
        extraction.fieldConfidence.transactionDate +
        extraction.fieldConfidence.totalAmount +
        extraction.fieldConfidence.taxAmount) /
      4;

    const combinedAiConfidence = Math.min(
      0.99,
      (extractionConfidenceAverage + suggestion.confidence) / 2
    );

    const { data: expenseEntry, error: expenseError } = await adminClient
      .from('expense_entries')
      .insert({
        employee_id: employeeId,
        submitted_by: user.id,
        receipt_document_id: documentId,
        vendor_name: extraction.vendorName,
        transaction_date: extraction.transactionDate,
        total_amount: extraction.totalAmount,
        tax_amount: extraction.taxAmount,
        currency: extraction.currency,
        ai_debit_account: suggestion.debitAccount,
        ai_credit_account: suggestion.creditAccount,
        ai_confidence: combinedAiConfidence,
        risk_bucket: 'pending',
        processing_status: 'awaiting_intern_review',
        business_justification: businessJustification,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (expenseError || !expenseEntry) {
      return NextResponse.json({ error: 'Failed to create expense entry' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'submit_expense_receipt_for_review',
      tableName: 'expense_entries',
      recordId: expenseEntry.id,
      metadata: {
        vendorName: extraction.vendorName,
        totalAmount: extraction.totalAmount,
        currency: extraction.currency,
        suggestionSource: suggestion.source,
      },
    });

    return NextResponse.json(
      {
        data: {
          expenseEntry,
          extraction,
          aiSuggestion: suggestion,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Best-effort rollback for partially created receipt records.
    await rollbackReceiptArtifacts(uploadedFilePath, createdDocumentId);

    const status = getErrorStatusCode(message);

    return NextResponse.json({ error: message }, { status });
  }
}
