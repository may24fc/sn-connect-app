import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type EmployeeIdentityRow = {
  first_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
};

type ReceiptDocumentRow = {
  file_path: string | null;
};

type ExpenseListRow = {
  employee: EmployeeIdentityRow | null;
  receipt_document: ReceiptDocumentRow | null;
  receipt_path?: string | null;
} & Record<string, unknown>;

/**
 * GET /api/expenses
 * Lists expense entries with optional filtering by status and submission ownership.
 * Uses the Supabase server client, naturally inheriting PostgreSQL Row Level Security (RLS) constraints.
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let query = supabase
      .from('expense_entries')
      .select(
        '*, employee:employees!expense_entries_employee_id_fkey(first_name, last_name, company_email, personal_email), receipt_document:documents!expense_entries_receipt_document_id_fkey(file_path)'
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status) {
      // Split comma separated list if multiple statuses are requested (e.g. leadership review options)
      const statuses = status.split(',');
      if (statuses.length > 1) {
        query = query.in('processing_status', statuses);
      } else {
        query = query.eq('processing_status', status);
      }
    }

    if (userId) {
      query = query.eq('submitted_by', userId);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Failed to retrieve expense entries:', error);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    // Map database results with joined employee record to match the client-side ExpenseEntry type
    const mappedEntries = ((entries ?? []) as ExpenseListRow[]).map((entry) => {
      const { employee, receipt_document, ...rest } = entry;
      const firstName = employee?.first_name || '';
      const lastName = employee?.last_name || '';
      const display_name = [firstName, lastName].filter(Boolean).join(' ') || 'Staff member';
      const email = employee?.company_email || employee?.personal_email || '';

      const legacyReceiptPath = typeof entry.receipt_path === 'string' ? entry.receipt_path : null;
      const normalizedReceiptPath = legacyReceiptPath ||
        (typeof receipt_document?.file_path === 'string'
          ? `expense-receipts/${receipt_document.file_path}`
          : null);

      return {
        ...rest,
        receipt_path: normalizedReceiptPath,
        submitted_by_user: {
          display_name,
          email,
        },
      };
    });

    return NextResponse.json({ data: mappedEntries });
  } catch (err) {
    console.error('Unexpected error in GET /api/expenses:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
