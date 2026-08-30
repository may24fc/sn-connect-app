import { requireAiSpendingAccess } from '@/app/api/ai-expenses/_lib';
import { aiExpenseUpdateSchema } from '@/lib/schemas/ai-expense.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

async function ensureExpenseOwnership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('ai_expenses')
    .select('id, user_id, provider_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, userId } = auth;

    const row = await ensureExpenseOwnership(supabase, id, userId);

    if (!row) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('ai_expenses')
      .select('*, provider:ai_expense_providers(id, name)')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to fetch AI expense by id:', error);
    return NextResponse.json({ error: 'Failed to fetch AI expense' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, userId } = auth;
    const existingRecord = await ensureExpenseOwnership(supabase, id, userId);

    if (!existingRecord) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = aiExpenseUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid expense update payload' },
        { status: 400 }
      );
    }

    const nextPayload = parsed.data;
    if (!nextPayload || Object.keys(nextPayload).length === 0) {
      return NextResponse.json({ error: 'No update fields were provided' }, { status: 400 });
    }

    const finalProviderId = nextPayload.providerId ?? existingRecord.provider_id;
    const { data: provider, error: providerError } = await supabase
      .from('ai_expense_providers')
      .select('id')
      .eq('id', finalProviderId)
      .eq('is_active', true)
      .maybeSingle();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Selected AI provider is invalid or inactive' }, { status: 400 });
    }

    const nextValues = {
      ...(nextPayload.providerId ? { provider_id: nextPayload.providerId } : {}),
      ...(nextPayload.spendType ? { spend_type: nextPayload.spendType } : {}),
      ...(nextPayload.transactionDate ? { transaction_date: nextPayload.transactionDate } : {}),
      ...(nextPayload.amountCents ? { amount_cents: nextPayload.amountCents } : {}),
      ...(nextPayload.currency ? { currency: nextPayload.currency } : {}),
      ...(nextPayload.accountEmail ? { account_email: nextPayload.accountEmail } : {}),
      ...(nextPayload.transactionId ? { transaction_id: nextPayload.transactionId } : {}),
      ...(nextPayload.reason ? { reason: nextPayload.reason } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ai_expenses')
      .update(nextValues)
      .eq('id', id)
      .select('*, provider:ai_expense_providers(id, name)')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to update AI expense:', error);
    return NextResponse.json({ error: 'Failed to update AI expense' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, userId } = auth;
    const existingRecord = await ensureExpenseOwnership(supabase, id, userId);

    if (!existingRecord) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { error } = await supabase.from('ai_expenses').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI expense:', error);
    return NextResponse.json({ error: 'Failed to delete AI expense' }, { status: 500 });
  }
}
