import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logActivity } from '@/lib/audit';
import { getMarketingAuthedContext, isMarketingAdmin } from '@/app/api/marketing/_lib';

const entryParamsSchema = z.object({
  entryId: z.string().uuid('Entry id must be a valid UUID'),
});

const invoiceUrlSchema = z
  .string()
  .trim()
  .max(500, 'Invoice link is too long')
  .url('Invoice link must be a valid URL')
  .refine((value) => /^https?:\/\//i.test(value), 'Invoice link must start with http:// or https://');

const updateEntrySchema = z
  .object({
    entryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date must use YYYY-MM-DD format')
      .optional(),
    amount: z.coerce.number().positive('Amount must be greater than zero').optional(),
    transactionId: z.string().trim().min(1, 'Transaction ID is required').max(120).optional(),
    paymentMethod: z.string().trim().min(1, 'Payment method is required').max(80).optional(),
    invoiceReference: invoiceUrlSchema.optional(),
    invoiceFileName: z.string().trim().min(1, 'Invoice file name is required').max(255).optional(),
    notes: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === null ? null : value.length > 0 ? value : null
      ),
    currency: z.string().trim().length(3).optional(),
  })
  .refine(
    (value) =>
      value.entryDate !== undefined ||
      value.amount !== undefined ||
      value.transactionId !== undefined ||
      value.paymentMethod !== undefined ||
      value.invoiceReference !== undefined ||
      value.invoiceFileName !== undefined ||
      value.notes !== undefined ||
      value.currency !== undefined,
    { message: 'At least one field is required' }
  );

function isMissingInvoiceFileNameColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === '42703' ||
    (typeof message === 'string' && message.toLowerCase().includes('invoice_file_name'))
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const auth = await getMarketingAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsedParams = entryParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 });
    }

    const parsedBody = updateEntrySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const entryId = parsedParams.data.entryId;
    const admin = auth.supabaseAdmin;
    const isAdmin = isMarketingAdmin(auth.role);

    const { data: existingEntry, error: existingEntryError } = await admin
      .from('marketing_entries')
      .select('id, submitted_by, platform_id')
      .eq('id', entryId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingEntryError) {
      console.error('Failed to load marketing entry for update:', existingEntryError);
      return NextResponse.json({ error: 'Failed to load ad spend entry' }, { status: 500 });
    }

    if (!existingEntry) {
      return NextResponse.json({ error: 'Ad spend entry not found' }, { status: 404 });
    }

    if (!isAdmin && existingEntry.submitted_by !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = parsedBody.data;
    const updates: Record<string, string | number | null> = {};

    if (payload.entryDate !== undefined) updates.entry_date = payload.entryDate;
    if (payload.amount !== undefined) updates.amount = payload.amount;
    if (payload.transactionId !== undefined) updates.transaction_id = payload.transactionId;
    if (payload.paymentMethod !== undefined) updates.payment_method = payload.paymentMethod;
    if (payload.invoiceReference !== undefined) updates.invoice_reference = payload.invoiceReference;
    if (payload.invoiceFileName !== undefined) updates.invoice_file_name = payload.invoiceFileName;
    if (payload.notes !== undefined) updates.notes = payload.notes;
    if (payload.currency !== undefined) updates.currency = payload.currency.toUpperCase();

    let { data: updatedEntry, error: updateError } = await admin
      .from('marketing_entries')
      .update(updates)
      .eq('id', entryId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (updateError && isMissingInvoiceFileNameColumnError(updateError)) {
      const fallbackUpdates = { ...updates };
      delete (fallbackUpdates as { invoice_file_name?: string | null }).invoice_file_name;

      ({ data: updatedEntry, error: updateError } = await admin
        .from('marketing_entries')
        .update(fallbackUpdates)
        .eq('id', entryId)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle());
    }

    if (updateError || !updatedEntry) {
      console.error('Failed to update marketing entry:', updateError);
      return NextResponse.json({ error: 'Failed to update ad spend entry' }, { status: 500 });
    }

    logActivity(admin, {
      userId: auth.user.id,
      action: 'update_marketing_entry',
      tableName: 'marketing_entries',
      recordId: entryId,
      metadata: {
        platformId: existingEntry.platform_id,
        updatedFields: Object.keys(updates),
      },
    });

    return NextResponse.json({ data: { id: updatedEntry.id, ok: true } });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/marketing/ad-spend/[entryId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const auth = await getMarketingAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsedParams = entryParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 });
    }

    const entryId = parsedParams.data.entryId;
    const admin = auth.supabaseAdmin;
    const isAdmin = isMarketingAdmin(auth.role);

    const { data: existingEntry, error: existingEntryError } = await admin
      .from('marketing_entries')
      .select('id, submitted_by, platform_id, amount, entry_date')
      .eq('id', entryId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingEntryError) {
      console.error('Failed to load marketing entry for delete:', existingEntryError);
      return NextResponse.json({ error: 'Failed to load ad spend entry' }, { status: 500 });
    }

    if (!existingEntry) {
      return NextResponse.json({ error: 'Ad spend entry not found' }, { status: 404 });
    }

    if (!isAdmin && existingEntry.submitted_by !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: deletedEntry, error: deleteError } = await admin
      .from('marketing_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (deleteError || !deletedEntry) {
      console.error('Failed to delete marketing entry:', deleteError);
      return NextResponse.json({ error: 'Failed to delete ad spend entry' }, { status: 500 });
    }

    logActivity(admin, {
      userId: auth.user.id,
      action: 'delete_marketing_entry',
      tableName: 'marketing_entries',
      recordId: entryId,
      metadata: {
        platformId: existingEntry.platform_id,
        amount: existingEntry.amount,
        entryDate: existingEntry.entry_date,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/marketing/ad-spend/[entryId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
