import { logActivity } from '@/lib/audit';
import { invoiceCreateSchema } from '@/lib/schemas/invoice.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { extractReceiptFromImage, extractReceiptFromText } from '@hr-portal/ai';
import { type NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';

export const runtime = 'nodejs';

const EMPLOYEE_DOCUMENTS_BUCKET = 'employee-documents';
const OCR_SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function computeExchangeRate(rates: Record<string, number>, from: string, to: string): number {
  if (from === to) return 1;

  const fromRate = from === 'USD' ? 1 : rates[from];
  const toRate = to === 'USD' ? 1 : rates[to];

  if (!fromRate || !toRate) {
    throw new Error(`Exchange rate not available for ${from}/${to}`);
  }

  return toRate / fromRate;
}

async function extractFromPdf(fileBuffer: ArrayBuffer): Promise<{
  totalAmount: number;
  currency: string;
}> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  await pdf.destroy();

  if (text && text.trim().length >= 20) {
    const extracted = await extractReceiptFromText(text);
    return {
      totalAmount: extracted.totalAmount,
      currency: extracted.currency,
    };
  }

  const extracted = await extractReceiptFromImage(
    Buffer.from(fileBuffer).toString('base64'),
    'application/pdf'
  );
  return {
    totalAmount: extracted.totalAmount,
    currency: extracted.currency,
  };
}

async function extractAmountFromInvoiceDocument(params: {
  adminClient: ReturnType<typeof createSupabaseAdminClient>;
  documentId: string;
  employeeId: string;
}): Promise<{ amount: number | null; currency: string | null; reason?: string }> {
  const { adminClient, documentId, employeeId } = params;

  const { data: document, error: documentError } = await adminClient
    .from('documents')
    .select('id, employee_id, file_path, mime_type')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (documentError || !document) {
    return { amount: null, currency: null, reason: 'Document not found for OCR extraction' };
  }

  if (document.employee_id !== employeeId) {
    return { amount: null, currency: null, reason: 'Document does not belong to invoice employee' };
  }

  if (!document.mime_type || !OCR_SUPPORTED_MIME_TYPES.has(document.mime_type)) {
    return { amount: null, currency: null, reason: 'Unsupported file type for OCR extraction' };
  }

  const { data: fileBlob, error: downloadError } = await adminClient.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .download(document.file_path);

  if (downloadError || !fileBlob) {
    return { amount: null, currency: null, reason: 'Failed to download invoice document for OCR' };
  }

  const fileBuffer = await fileBlob.arrayBuffer();
  if (fileBuffer.byteLength === 0) {
    return { amount: null, currency: null, reason: 'Invoice document is empty' };
  }

  try {
    const extracted =
      document.mime_type === 'application/pdf'
        ? await extractFromPdf(fileBuffer)
        : await extractReceiptFromImage(Buffer.from(fileBuffer).toString('base64'), document.mime_type);

    const parsedAmount = Number(extracted.totalAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return { amount: null, currency: null, reason: 'OCR amount could not be determined' };
    }

    const normalizedCurrency =
      typeof extracted.currency === 'string' && extracted.currency.trim().length === 3
        ? extracted.currency.trim().toUpperCase()
        : null;

    return {
      amount: Math.round(parsedAmount * 100) / 100,
      currency: normalizedCurrency,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OCR extraction error';
    return { amount: null, currency: null, reason: `OCR extraction failed: ${message}` };
  }
}

/**
 * GET /api/invoices
 * List invoices with pagination and filters.
 *
 * Role-based scoping:
 * - Employees (Tier 1): only see their own invoices (RLS + employee_id filter)
 * - Admin / Super Admin (Tier 2-3): see all invoices (RLS admin policy)
 *
 * The employees relation uses a LEFT JOIN (no `!inner`) so that admin users
 * who may not own the employee record can still see the invoice row.
 * RLS on the employees table may hide the joined employee data for non-admin
 * users who are not the owner, but the invoice row itself will still be returned.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    // Use admin client to bypass RLS for the main data query.
    // RLS cross-table subqueries on the employees table silently return 0 rows
    // due to nested RLS evaluation, preventing employees from seeing their own
    // invoices. Security is enforced at the application layer via JWT validation
    // and role-based employee_id scoping below.
    let query = supabaseAdmin
      .from('invoices')
      .select(
        '*, employees(id, user_id, first_name, last_name, department), invoice_line_items(*)',
        {
          count: 'exact',
        }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    // Resolve user role for authorization scoping
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const adminRoles = ['admin', 'super_admin'];
    const isAdmin = adminRoles.includes(role ?? '');

    const selfOnly = searchParams.get('selfOnly') === 'true';

    if (!isAdmin || selfOnly) {
      // Non-admin users always scope to their own invoices.
      // Admin/super-admin users scope to their own when selfOnly=true (self-service page).
      // Use admin client for employee lookup to avoid RLS issues.
      const { data: empData } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (empData?.id) {
        query = query.eq('employee_id', empData.id);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/invoices
 * Create invoice with line items
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const toOptionalNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsedNumber = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsedNumber) ? parsedNumber : null;
    };

    const today = new Date().toISOString().slice(0, 10);
    const normalizedBaseAmount = toOptionalNumber(body?.grossAmount) ?? 0;
    const normalizedDeductions = toOptionalNumber(body?.deductions) ?? 0;
    const normalizedPayableAmount =
      toOptionalNumber(body?.netAmount) ??
      Math.max(0, Math.round((normalizedBaseAmount - normalizedDeductions) * 100) / 100);

    const normalizedBody = {
      ...body,
      periodStart:
        typeof body?.periodStart === 'string' && body.periodStart.length > 0 ? body.periodStart : today,
      periodEnd:
        typeof body?.periodEnd === 'string' && body.periodEnd.length > 0 ? body.periodEnd : today,
      grossAmount: normalizedBaseAmount,
      deductions: normalizedDeductions,
      netAmount: normalizedPayableAmount,
      hourlyRate: toOptionalNumber(body?.hourlyRate),
      hoursWorked: toOptionalNumber(body?.hoursWorked),
      lineItems: Array.isArray(body?.lineItems) ? body.lineItems : [],
      status:
        typeof body?.status === 'string' && body.status.length > 0 ? body.status : 'draft',
      sourceCurrency:
        typeof body?.sourceCurrency === 'string' && body.sourceCurrency.length === 3
          ? body.sourceCurrency.toUpperCase()
          : 'PHP',
      targetCurrency:
        typeof body?.targetCurrency === 'string' && body.targetCurrency.length === 3
          ? body.targetCurrency.toUpperCase()
          : typeof body?.sourceCurrency === 'string' && body.sourceCurrency.length === 3
            ? body.sourceCurrency.toUpperCase()
            : 'PHP',
      exchangeRate: toOptionalNumber(body?.exchangeRate),
      convertedAmount: toOptionalNumber(body?.convertedAmount),
    };

    const parsed = invoiceCreateSchema.safeParse(normalizedBody);

    if (!parsed.success) {
      console.error('POST /api/invoices validation error:', JSON.stringify(parsed.error.flatten()));
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Use admin client for employee lookup — regular client may fail due to RLS
    const supabaseAdmin = createSupabaseAdminClient();

    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    const resolvedEmployeeId =
      parsed.data.employeeId && parsed.data.employeeId.length > 0
        ? parsed.data.employeeId
        : employeeData?.id;

    if (employeeError) {
      console.error('Error loading employee profile for invoice:', employeeError);
      return NextResponse.json({ error: 'Failed to resolve employee profile' }, { status: 500 });
    }

    if (!resolvedEmployeeId) {
      return NextResponse.json(
        { error: 'No employee profile found for current user' },
        { status: 400 }
      );
    }

    // Verify the employee actually belongs to the authenticated user (unless admin)
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin'].includes(role ?? '');

    if (!isAdmin && resolvedEmployeeId !== employeeData?.id) {
      return NextResponse.json(
        { error: 'Cannot create invoices for other employees' },
        { status: 403 }
      );
    }

    // Auto-generate invoice number: INV-YYYYMMDD-XXXX
    let invoiceNumber = parsed.data.invoiceNumber;
    if (!invoiceNumber) {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const { count } = await supabaseAdmin
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString().slice(0, 10));
      const seq = String((count ?? 0) + 1).padStart(4, '0');
      invoiceNumber = `INV-${dateStr}-${seq}`;
    }

    let exchangeRate = parsed.data.exchangeRate ?? null;
    let convertedAmount = parsed.data.convertedAmount ?? null;
    let baseAmount = parsed.data.grossAmount;
    const deductions = parsed.data.deductions;
    let payableAmount = parsed.data.netAmount;
    let sourceCurrency = parsed.data.sourceCurrency;
    let targetCurrency = parsed.data.targetCurrency;

    if (parsed.data.documentId) {
      const extraction = await extractAmountFromInvoiceDocument({
        adminClient: supabaseAdmin,
        documentId: parsed.data.documentId,
        employeeId: resolvedEmployeeId,
      });

      if (typeof extraction.amount === 'number') {
        baseAmount = extraction.amount;
        payableAmount = Math.max(0, Math.round((baseAmount - deductions) * 100) / 100);
      }

      if (extraction.currency) {
        sourceCurrency = extraction.currency;
        if (parsed.data.targetCurrency === parsed.data.sourceCurrency) {
          targetCurrency = extraction.currency;
        }
      }
    }

    if (sourceCurrency !== targetCurrency) {
      if (exchangeRate === null || convertedAmount === null) {
        const { data: latestRates, error: ratesError } = await supabaseAdmin
          .from('fx_rates')
          .select('rates')
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single();

        if (ratesError || !latestRates) {
          return NextResponse.json(
            { error: 'Exchange rates unavailable for selected currencies' },
            { status: 400 }
          );
        }

        exchangeRate = computeExchangeRate(
          latestRates.rates as Record<string, number>,
          sourceCurrency,
          targetCurrency
        );
        convertedAmount = Math.round(payableAmount * exchangeRate * 100) / 100;
      }
    } else {
      exchangeRate = 1;
      convertedAmount = payableAmount;
    }

    // Use the same admin client for the insert to bypass RLS. Security is enforced
    // at the application layer above (auth check + employee ownership check).
    // This matches the established pattern used in other API routes (invite,
    // assign-associate, approve-onboarding, resources/upload).

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        employee_id: resolvedEmployeeId,
        invoice_number: invoiceNumber,
        period_start: parsed.data.periodStart,
        period_end: parsed.data.periodEnd,
        hourly_rate: parsed.data.hourlyRate ?? null,
        hours_worked: parsed.data.hoursWorked ?? null,
        gross_amount: baseAmount,
        deductions,
        net_amount: payableAmount,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        exchange_rate: exchangeRate,
        converted_amount: convertedAmount,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        document_id: parsed.data.documentId ?? null,
        submitted_at: parsed.data.status === 'submitted' ? new Date().toISOString() : null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    if (parsed.data.lineItems.length > 0) {
      const lineItemRows = parsed.data.lineItems.map((lineItem) => ({
        invoice_id: invoice.id,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unit_price: lineItem.unitPrice,
        total: lineItem.total,
      }));

      const { error: lineItemsError } = await supabaseAdmin
        .from('invoice_line_items')
        .insert(lineItemRows);

      if (lineItemsError) {
        console.error('Error creating invoice line items:', lineItemsError);
        return NextResponse.json(
          { error: 'Invoice created but failed to save line items' },
          { status: 500 }
        );
      }
    }

    const { data: fullInvoice } = await supabaseAdmin
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', invoice.id)
      .single();

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_invoice',
      tableName: 'invoices',
      recordId: invoice.id,
      metadata: { invoiceNumber, employeeId: resolvedEmployeeId },
    });

    return NextResponse.json({ data: fullInvoice || invoice }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
