import { requireAiSpendingAccess } from '@/app/api/ai-expenses/_lib';
import { aiExpenseCreateSchema } from '@/lib/schemas/ai-expense.schema';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, userId } = auth;

    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    let query = supabase
      .from('ai_expenses')
      .select('*, provider:ai_expense_providers(id, name)')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('transaction_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Failed to fetch AI expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch AI expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, userId } = auth;

    const body = await request.json();
    const parsed = aiExpenseCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid expense payload' },
        { status: 400 }
      );
    }

    const { data: provider, error: providerError } = await supabase
      .from('ai_expense_providers')
      .select('id, name')
      .eq('id', parsed.data.providerId)
      .eq('is_active', true)
      .maybeSingle();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Selected AI provider is invalid or inactive' }, { status: 400 });
    }

    const payload = {
      user_id: userId,
      provider_id: parsed.data.providerId,
      spend_type: parsed.data.spendType,
      transaction_date: parsed.data.transactionDate,
      amount_cents: parsed.data.amountCents,
      currency: parsed.data.currency,
      account_email: parsed.data.accountEmail,
      transaction_id: parsed.data.transactionId,
      reason: parsed.data.reason,
    };

    const { data, error } = await supabase
      .from('ai_expenses')
      .insert(payload)
      .select('*, provider:ai_expense_providers(id, name)')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI expense:', error);
    return NextResponse.json({ error: 'Failed to create AI expense' }, { status: 500 });
  }
}
