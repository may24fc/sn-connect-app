import { createSupabaseServerClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['admin', 'super_admin', 'intern']);

type ExpenseExportRow = {
  vendor_name: string;
  transaction_date: string;
  currency: string;
  total_amount: number;
  tax_amount: number;
  total_amount_aud: number | null;
  exchange_rate_to_aud: number | null;
  processing_status: string;
  risk_bucket: string;
  business_justification: string | null;
  employee: {
    first_name: string | null;
    last_name: string | null;
    department: string | null;
  } | null;
};

async function resolveRole(user: { id: string; app_metadata?: Record<string, unknown> }): Promise<string | null> {
  const roleFromMetadata = user.app_metadata?.db_role;
  if (typeof roleFromMetadata === 'string') {
    return roleFromMetadata;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('users').select('role').eq('id', user.id).is('deleted_at', null).maybeSingle();
  return data?.role ?? null;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function mapRecordToRow(record: ExpenseExportRow) {
  const fullName = [record.employee?.first_name, record.employee?.last_name].filter(Boolean).join(' ');

  return {
    transaction_date: record.transaction_date,
    vendor_name: record.vendor_name,
    department: record.employee?.department || '',
    submitted_by: fullName || 'Unknown',
    processing_status: record.processing_status,
    risk_bucket: record.risk_bucket,
    currency: record.currency,
    total_amount: record.total_amount,
    tax_amount: record.tax_amount,
    exchange_rate_to_aud: record.exchange_rate_to_aud ?? '',
    total_amount_aud: record.total_amount_aud ?? '',
    business_justification: record.business_justification || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolveRole(user);
    if (!role || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const processingStatus = searchParams.get('processingStatus') || '';
    const department = searchParams.get('department') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('expense_entries')
      .select(
        'vendor_name, transaction_date, currency, total_amount, tax_amount, total_amount_aud, exchange_rate_to_aud, processing_status, risk_bucket, business_justification, employee:employees!expense_entries_employee_id_fkey(first_name, last_name, department)'
      )
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false });

    if (processingStatus) {
      const processingStatuses = processingStatus
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);

      if (processingStatuses.length > 1) {
        query = query.in('processing_status', processingStatuses);
      } else if (processingStatuses.length === 1 && processingStatuses[0]) {
        query = query.eq('processing_status', processingStatuses[0]);
      }
    }

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    if (search) {
      query = query.ilike('vendor_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to export expenses' }, { status: 500 });
    }

    const records = ((data || []) as ExpenseExportRow[]).filter((record) => {
      if (!department) {
        return true;
      }

      return (record.employee?.department || '').toLowerCase() === department.toLowerCase();
    });

    const mappedRows = records.map(mapRecordToRow);
    const datePart = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Expenses');

      worksheet.columns = [
        { header: 'transactionDate', key: 'transaction_date', width: 16 },
        { header: 'vendorName', key: 'vendor_name', width: 28 },
        { header: 'department', key: 'department', width: 22 },
        { header: 'submittedBy', key: 'submitted_by', width: 28 },
        { header: 'processingStatus', key: 'processing_status', width: 24 },
        { header: 'riskBucket', key: 'risk_bucket', width: 22 },
        { header: 'currency', key: 'currency', width: 10 },
        { header: 'totalAmount', key: 'total_amount', width: 14 },
        { header: 'taxAmount', key: 'tax_amount', width: 14 },
        { header: 'exchangeRateToAud', key: 'exchange_rate_to_aud', width: 18 },
        { header: 'totalAmountAud', key: 'total_amount_aud', width: 16 },
        { header: 'businessJustification', key: 'business_justification', width: 42 },
      ];

      for (const row of mappedRows) {
        worksheet.addRow(row);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="expense-ledger-${datePart}.xlsx"`,
        },
      });
    }

    const headers = [
      'transactionDate',
      'vendorName',
      'department',
      'submittedBy',
      'processingStatus',
      'riskBucket',
      'currency',
      'totalAmount',
      'taxAmount',
      'exchangeRateToAud',
      'totalAmountAud',
      'businessJustification',
    ];

    const rows = mappedRows.map((row) =>
      [
        escapeCsv(row.transaction_date),
        escapeCsv(row.vendor_name),
        escapeCsv(row.department),
        escapeCsv(row.submitted_by),
        escapeCsv(row.processing_status),
        escapeCsv(row.risk_bucket),
        escapeCsv(row.currency),
        escapeCsv(row.total_amount),
        escapeCsv(row.tax_amount),
        escapeCsv(row.exchange_rate_to_aud),
        escapeCsv(row.total_amount_aud),
        escapeCsv(row.business_justification),
      ].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="expense-ledger-${datePart}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/expenses/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
