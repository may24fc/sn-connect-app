import { invoiceLineItemSchema, invoiceUpdateSchema } from '@/lib/schemas/invoice.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/invoices/[id]
 * Get single invoice details
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(
        '*, employees!inner(id, user_id, first_name, last_name, department), invoice_line_items(*)'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/invoices/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update invoice and optionally replace line items
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const parsed = invoiceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, string | number | null> = {};

    if (parsed.data.invoiceNumber !== undefined) updates.invoice_number = parsed.data.invoiceNumber;
    if (parsed.data.periodStart !== undefined) updates.period_start = parsed.data.periodStart;
    if (parsed.data.periodEnd !== undefined) updates.period_end = parsed.data.periodEnd;
    if (parsed.data.grossAmount !== undefined) updates.gross_amount = parsed.data.grossAmount;
    if (parsed.data.deductions !== undefined) updates.deductions = parsed.data.deductions;
    if (parsed.data.netAmount !== undefined) updates.net_amount = parsed.data.netAmount;
    if (parsed.data.sourceCurrency !== undefined) updates.source_currency = parsed.data.sourceCurrency;
    if (parsed.data.targetCurrency !== undefined) updates.target_currency = parsed.data.targetCurrency;
    if (parsed.data.exchangeRate !== undefined) updates.exchange_rate = parsed.data.exchangeRate;
    if (parsed.data.convertedAmount !== undefined) updates.converted_amount = parsed.data.convertedAmount;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes || null;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null);

      if (updateError) {
        console.error('Error updating invoice:', updateError);
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
      }
    }

    if (Array.isArray(body.lineItems)) {
      const validation = (body.lineItems as Array<unknown>).map((item: unknown) =>
        invoiceLineItemSchema.safeParse(item)
      );
      const invalid = validation.find((result) => !result.success);

      if (invalid && !invalid.success) {
        return NextResponse.json(
          { error: 'Invalid line items payload', details: invalid.error.flatten() },
          { status: 400 }
        );
      }

      const { error: deleteError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteError) {
        console.error('Error replacing line items:', deleteError);
        return NextResponse.json({ error: 'Failed to update invoice line items' }, { status: 500 });
      }

      if (body.lineItems.length > 0) {
        const rows = validation.map((item) => {
          const line = item.success ? item.data : null;
          return {
            invoice_id: id,
            description: line?.description || '',
            quantity: line?.quantity || 1,
            unit_price: line?.unitPrice || 0,
            total: line?.total || 0,
          };
        });

        const { error: insertError } = await supabase.from('invoice_line_items').insert(rows);

        if (insertError) {
          console.error('Error inserting line items:', insertError);
          return NextResponse.json(
            { error: 'Failed to update invoice line items' },
            { status: 500 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/invoices/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
