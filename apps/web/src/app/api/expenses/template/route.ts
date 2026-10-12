import {
  EXPENSE_IMPORT_TEMPLATE_HEADERS,
  EXPENSE_IMPORT_TEMPLATE_SAMPLE_ROWS,
} from '@/lib/import/expense-template';
import { getActiveUserRole } from '@/lib/auth/active-role';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { escapeCsvValue } from '@/lib/csv';
import ExcelJS from 'exceljs';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['admin', 'super_admin', 'associate']);

function toCsv(): string {
  const rows = [
    EXPENSE_IMPORT_TEMPLATE_HEADERS.join(','),
    ...EXPENSE_IMPORT_TEMPLATE_SAMPLE_ROWS.map((row) =>
      EXPENSE_IMPORT_TEMPLATE_HEADERS.map((header) => escapeCsvValue(row[header])).join(',')
    ),
  ];

  return rows.join('\n');
}

async function toXlsxBuffer(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Expense Import Template');

  worksheet.columns = EXPENSE_IMPORT_TEMPLATE_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 4, 22),
  }));

  for (const row of EXPENSE_IMPORT_TEMPLATE_SAMPLE_ROWS) {
    worksheet.addRow(row);
  }

  return workbook.xlsx.writeBuffer();
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

    const role = await getActiveUserRole(user.id);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const format = request.nextUrl.searchParams.get('format') || 'xlsx';
    const datePart = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return new NextResponse(toCsv(), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="expense-import-template-${datePart}.csv"`,
        },
      });
    }

    const buffer = await toXlsxBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="expense-import-template-${datePart}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('GET /api/expenses/template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
