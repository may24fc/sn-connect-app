import { invoiceCreateSchema } from '@/lib/schemas/invoice.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/invoices
 * List invoices with pagination and filters
 */
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    let query = supabase
      .from('invoices')
      .select(
        '*, employees!inner(id, user_id, first_name, last_name, department), invoice_line_items(*)',
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
    const parsed = invoiceCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: employeeData, error: employeeError } = await supabase
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

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        employee_id: resolvedEmployeeId,
        invoice_number: parsed.data.invoiceNumber,
        period_start: parsed.data.periodStart,
        period_end: parsed.data.periodEnd,
        gross_amount: parsed.data.grossAmount,
        deductions: parsed.data.deductions,
        net_amount: parsed.data.netAmount,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
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

      const { error: lineItemsError } = await supabase
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

    const { data: fullInvoice } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', invoice.id)
      .single();

    return NextResponse.json({ data: fullInvoice || invoice }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
