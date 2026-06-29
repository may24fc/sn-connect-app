import { logActivity } from '@/lib/audit';
import { convertExpenseAmountsToAud, detectExpenseCurrency } from '@/lib/fx/expense-conversion';
import { parseExpenseImportFile } from '@/lib/import/expense-parser';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
]);
const ALLOWED_ROLES = new Set(['admin', 'super_admin', 'intern']);

async function resolveRole(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  user: { id: string; app_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const roleFromMetadata = user.app_metadata?.db_role;
  if (typeof roleFromMetadata === 'string') {
    return roleFromMetadata;
  }

  const { data } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  return data?.role ?? null;
}

async function resolveEmployeeId(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  explicitEmployeeId: string | null,
  role: string
): Promise<string> {
  if (explicitEmployeeId) {
    if (!(role === 'admin' || role === 'super_admin')) {
      throw new Error('Only admins can import on behalf of another employee.');
    }

    const { data, error } = await adminClient
      .from('employees')
      .select('id')
      .eq('id', explicitEmployeeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data?.id) {
      throw new Error('Provided employeeId is invalid.');
    }

    return data.id;
  }

  const { data, error } = await adminClient
    .from('employees')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error('No employee profile found for import owner.');
  }

  return data.id;
}

async function createImportDocument(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  params: {
    employeeId: string;
    uploadedBy: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }
): Promise<string> {
  const timestamp = new Date().toISOString();

  const { data, error } = await adminClient
    .from('documents')
    .insert({
      employee_id: params.employeeId,
      document_type: 'other',
      file_path: `expense-imports/${params.employeeId}/${Date.now()}-${params.fileName}`,
      file_name: params.fileName,
      file_size: params.fileSize,
      mime_type: params.mimeType,
      is_confidential: false,
      uploaded_by: params.uploadedBy,
      notes: `expense_bulk_import:${timestamp}`,
      created_by: params.uploadedBy,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error('Failed to create import source document record.');
  }

  return data.id;
}

export async function POST(request: NextRequest) {
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

    const role = await resolveRole(adminClient, user);
    if (!role || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const employeeIdInput = formData.get('employeeId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Import file is required.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Import file exceeds 10MB limit.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Use XLSX or CSV.' }, { status: 400 });
    }

    const employeeId = await resolveEmployeeId(
      adminClient,
      user.id,
      typeof employeeIdInput === 'string' ? employeeIdInput : null,
      role
    );

    const parsed = await parseExpenseImportFile(file);

    if (parsed.errors.length > 0 && parsed.validRows.length === 0) {
      return NextResponse.json(
        {
          error: 'Import validation failed.',
          details: parsed.errors,
        },
        { status: 422 }
      );
    }

    const sourceDocumentId = await createImportDocument(adminClient, {
      employeeId,
      uploadedBy: user.id,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    const rowErrors: Array<{ rowNumber: number; message: string }> = [...parsed.errors];
    const insertRows: Array<Record<string, unknown>> = [];

    for (let index = 0; index < parsed.validRows.length; index += 1) {
      const rowNumber = index + 2;
      const currentRow = parsed.validRows.at(index);

      if (!currentRow) {
        rowErrors.push({ rowNumber, message: 'Import row is missing.' });
        continue;
      }

      try {
        const detected = detectExpenseCurrency(currentRow.currency);
        const normalized = await convertExpenseAmountsToAud(adminClient, {
          sourceCurrency: detected.currencyCode,
          totalAmount: currentRow.totalAmount,
          taxAmount: currentRow.taxAmount,
        });

        insertRows.push({
          employee_id: employeeId,
          submitted_by: user.id,
          receipt_document_id: sourceDocumentId,
          vendor_name: currentRow.vendorName,
          transaction_date: currentRow.transactionDate,
          total_amount: currentRow.totalAmount,
          tax_amount: currentRow.taxAmount,
          currency: normalized.currency,
          ai_debit_account: currentRow.aiDebitAccount || null,
          ai_credit_account: currentRow.aiCreditAccount || null,
          ai_confidence: 0,
          risk_bucket: 'pending',
          processing_status: 'awaiting_intern_review',
          business_justification: currentRow.businessJustification || null,
          exchange_rate_to_aud: normalized.exchangeRateToAud,
          total_amount_aud: normalized.totalAmountAud,
          tax_amount_aud: normalized.taxAmountAud,
          fx_rates_fetched_at: normalized.fxRatesFetchedAt,
          fx_source: normalized.fxSource,
          created_by: user.id,
        });
      } catch (error) {
        rowErrors.push({
          rowNumber,
          message: error instanceof Error ? error.message : 'Currency conversion failed.',
        });
      }
    }

    let importedCount = 0;
    if (insertRows.length > 0) {
      const { data, error: insertError } = await adminClient
        .from('expense_entries')
        .insert(insertRows)
        .select('id');

      if (insertError) {
        return NextResponse.json(
          {
            error: 'Failed to append imported records.',
            details: insertError.message,
          },
          { status: 500 }
        );
      }

      importedCount = data?.length ?? 0;
    }

    logActivity(adminClient, {
      userId: user.id,
      action: 'bulk_import_expense_entries',
      tableName: 'expense_entries',
      recordId: sourceDocumentId,
      metadata: {
        sourceDocumentId,
        fileName: file.name,
        importedCount,
        failedCount: rowErrors.length,
      },
    });

    return NextResponse.json(
      {
        data: {
          importedCount,
          failedCount: rowErrors.length,
          totalRows: parsed.totalRows,
          errors: rowErrors,
        },
      },
      { status: rowErrors.length > 0 ? 207 : 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
