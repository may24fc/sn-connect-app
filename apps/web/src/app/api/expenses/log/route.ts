import { logActivity } from '@/lib/audit';
import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { expenseLogRequestSchema } from '@/lib/schemas/expense.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type DbErrorShape = {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
};

function classifyLogRequestInsertError(error: DbErrorShape): {
  message: string;
  status: number;
} {
  const normalizedMessage = error.message.toLowerCase();

  const isMissingMatchingColumns =
    error.code === '42703' ||
    normalizedMessage.includes('source_type') ||
    normalizedMessage.includes('match_status');

  const isLegacyReceiptConstraint =
    (error.code === '23502' && normalizedMessage.includes('receipt_document_id')) ||
    normalizedMessage.includes('null value in column "receipt_document_id"');

  if (isMissingMatchingColumns || isLegacyReceiptConstraint) {
    return {
      status: 500,
      message:
        'Expense schema is out of date for request logging. Apply the latest Supabase migrations, including 20260704000001_add_expense_request_payment_matching.sql.',
    };
  }

  return {
    status: 500,
    message: `Failed to log expense request: ${error.message}`,
  };
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

/**
 * POST /api/expenses/log
 * Manual spend REQUEST logging (no receipt required). Available to every
 * authenticated staff member/intern per the Control Hub matching proposal:
 * "type it into the tracker manually" to stay accountable for requested spend.
 */
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

    const capabilities = await resolveExpenseCapabilities(adminClient, user.id);
    if (!capabilities.canLogRequest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = expenseLogRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { employeeId, departmentId } = await resolveEmployeeProfile(adminClient, user.id);

    const { data: expenseEntry, error: insertError } = await adminClient
      .from('expense_entries')
      .insert({
        employee_id: employeeId,
        submitted_by: user.id,
        receipt_document_id: null,
        source_type: 'staff_request',
        match_status: 'unmatched',
        vendor_name: parsed.data.vendorName,
        transaction_date: parsed.data.transactionDate,
        total_amount: parsed.data.totalAmount,
        tax_amount: parsed.data.taxAmount ?? 0,
        currency: parsed.data.currency,
        expense_type: parsed.data.expenseType,
        business_justification: parsed.data.businessJustification || null,
        risk_bucket: 'pending',
        processing_status: 'awaiting_intern_review',
        department_id: departmentId,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError || !expenseEntry) {
      if (insertError) {
        console.error('Failed to insert expense request entry:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });

        const classifiedError = classifyLogRequestInsertError(insertError as DbErrorShape);
        return NextResponse.json({ error: classifiedError.message }, { status: classifiedError.status });
      }

      return NextResponse.json({ error: 'Failed to log expense request' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'log_expense_request',
      tableName: 'expense_entries',
      recordId: expenseEntry.id,
      metadata: {
        vendorName: parsed.data.vendorName,
        totalAmount: parsed.data.totalAmount,
        currency: parsed.data.currency,
      },
    });

    return NextResponse.json({ data: { expenseEntry } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('No employee profile found') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
