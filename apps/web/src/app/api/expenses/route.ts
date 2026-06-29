import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts';

type EmployeeIdentityRow = {
  first_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
};

type ReceiptDocumentRow = {
  file_path: string | null;
  mime_type?: string | null;
};

type ExpenseListRow = {
  employee: EmployeeIdentityRow | null;
  receipt_document: ReceiptDocumentRow | null;
  receipt_document_id?: string | null;
  receipt_path?: string | null;
  receipt_preview_url?: string | null;
  receipt_mime_type?: string | null;
} & Record<string, unknown>;

function stripBucketPrefix(path: string, bucket: string): string {
  const normalized = path.trim();
  const withSlash = `${bucket}/`;

  if (normalized.startsWith(withSlash)) {
    return normalized.slice(withSlash.length);
  }

  return normalized;
}

async function resolveDbRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  appRole: string | null
): Promise<string | null> {
  if (appRole) {
    return appRole;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    // Fail closed: treat as non-leadership if role lookup is temporarily unavailable.
    console.warn('Role lookup failed in GET /api/expenses, defaulting to app role only:', error.message);
    return null;
  }

  return data?.role ?? null;
}

function getRoleFromUser(user: { app_metadata?: Record<string, unknown> }): string | null {
  const dbRole = user.app_metadata?.db_role;
  return typeof dbRole === 'string' ? dbRole : null;
}

/**
 * GET /api/expenses
 * Lists expense entries with optional filtering by status and submission ownership.
 * Uses the Supabase server client, naturally inheriting PostgreSQL Row Level Security (RLS) constraints.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolveDbRole(supabase, user.id, getRoleFromUser(user));
    const isLeadership = role === 'admin' || role === 'super_admin';

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const departmentId = searchParams.get('departmentId');
    const expenseType = searchParams.get('expenseType');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (userId && userId !== user.id && !isLeadership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if ((departmentId || expenseType) && !isLeadership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase
      .from('expense_entries')
      .select(
        '*, employee:employees!expense_entries_employee_id_fkey(first_name, last_name, company_email, personal_email), receipt_document:documents!expense_entries_receipt_document_id_fkey(file_path, mime_type)'
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

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    if (expenseType) {
      query = query.eq('expense_type', expenseType);
    }

    if (search) {
      query = query.ilike('vendor_name', `%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Failed to retrieve expense entries:', error);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    // Map database results with joined employee record to match the client-side ExpenseEntry type
    const rows = (entries ?? []) as ExpenseListRow[];

    const receiptDocumentIds = Array.from(
      new Set(
        rows
          .map((entry) =>
            typeof entry.receipt_document_id === 'string' && entry.receipt_document_id.length > 0
              ? entry.receipt_document_id
              : null
          )
          .filter((id): id is string => Boolean(id))
      )
    );

    const documentPathById = new Map<string, string>();
    const documentMimeTypeById = new Map<string, string>();
    if (receiptDocumentIds.length > 0) {
      const { data: documentRows, error: documentsError } = await adminClient
        .from('documents')
        .select('id, file_path, mime_type')
        .in('id', receiptDocumentIds)
        .is('deleted_at', null);

      if (documentsError) {
        console.warn('Failed to resolve expense receipt document paths:', documentsError.message);
      } else {
        for (const row of documentRows ?? []) {
          if (typeof row.id === 'string' && typeof row.file_path === 'string' && row.file_path.length > 0) {
            documentPathById.set(row.id, row.file_path);
          }

          if (typeof row.id === 'string' && typeof row.mime_type === 'string' && row.mime_type.length > 0) {
            documentMimeTypeById.set(row.id, row.mime_type);
          }
        }
      }
    }

    const mappedEntries: Array<
      Record<string, unknown> & {
        id: string;
        receipt_path: string | null;
        receipt_preview_url: string | null;
        receipt_mime_type: string | null;
        submitted_by_user: {
          display_name: string;
          email: string;
        };
      }
    > = rows.map((entry) => {
      const { employee, receipt_document, ...rest } = entry;
      const entryId = typeof entry.id === 'string' ? entry.id : String(entry.id ?? '');
      const firstName = employee?.first_name || '';
      const lastName = employee?.last_name || '';
      const display_name = [firstName, lastName].filter(Boolean).join(' ') || 'Staff member';
      const email = employee?.company_email || employee?.personal_email || '';

      const legacyReceiptPath = typeof entry.receipt_path === 'string' ? entry.receipt_path : null;
      const documentPathFromJoin =
        typeof receipt_document?.file_path === 'string' ? receipt_document.file_path : null;
      const documentPathFromAdminLookup =
        typeof entry.receipt_document_id === 'string'
          ? (documentPathById.get(entry.receipt_document_id) ?? null)
          : null;
      const mimeTypeFromJoin =
        typeof receipt_document?.mime_type === 'string' ? receipt_document.mime_type : null;
      const mimeTypeFromAdminLookup =
        typeof entry.receipt_document_id === 'string'
          ? (documentMimeTypeById.get(entry.receipt_document_id) ?? null)
          : null;

      const normalizedReceiptPath = legacyReceiptPath ||
        (documentPathFromJoin
          ? `expense-receipts/${documentPathFromJoin}`
          : documentPathFromAdminLookup
            ? `expense-receipts/${documentPathFromAdminLookup}`
          : null);

      return {
        ...rest,
        id: entryId,
        receipt_path: normalizedReceiptPath,
        receipt_preview_url: null as string | null,
        receipt_mime_type: mimeTypeFromJoin || mimeTypeFromAdminLookup,
        submitted_by_user: {
          display_name,
          email,
        },
      };
    });

    const previewCandidates = mappedEntries
      .map((entry) => {
        const path = typeof entry.receipt_path === 'string' ? entry.receipt_path : null;
        if (!path) return null;

        return {
          id: String(entry.id),
          objectPath: stripBucketPrefix(path, EXPENSE_RECEIPTS_BUCKET),
        };
      })
      .filter((candidate): candidate is { id: string; objectPath: string } =>
        Boolean(candidate?.id && candidate.objectPath)
      );

    if (previewCandidates.length > 0) {
      const { data: signedUrls, error: signedUrlError } = await adminClient.storage
        .from(EXPENSE_RECEIPTS_BUCKET)
        .createSignedUrls(
          previewCandidates.map((candidate) => candidate.objectPath),
          60 * 30
        );

      if (signedUrlError) {
        console.warn('Failed to generate expense receipt signed preview URLs:', signedUrlError.message);
      } else if (signedUrls?.length) {
        const urlByEntryId = new Map<string, string>();

        signedUrls.forEach((result, index) => {
          if (!result?.signedUrl) {
            return;
          }

          const candidate = previewCandidates[index];
          if (!candidate) {
            return;
          }

          urlByEntryId.set(candidate.id, result.signedUrl);
        });

        mappedEntries.forEach((entry) => {
          const signedUrl = urlByEntryId.get(String(entry.id));
          if (signedUrl) {
            entry.receipt_preview_url = signedUrl;
          }
        });
      }
    }

    return NextResponse.json({ data: mappedEntries });
  } catch (err) {
    console.error('Unexpected error in GET /api/expenses:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
