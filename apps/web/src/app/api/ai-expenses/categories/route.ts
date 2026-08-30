import { requireAiSpendingAccess } from '@/app/api/ai-expenses/_lib';
import {
  aiProviderCreateSchema,
  aiProviderDeleteSchema,
  aiProviderUpdateSchema,
} from '@/lib/schemas/ai-expense.schema';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth;

    const { data: providers, error } = await supabase
      .from('ai_expense_providers')
      .select('id, name, is_active, created_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      providers: providers ?? [],
    });
  } catch (error) {
    console.error('Failed to fetch AI providers:', error);
    return NextResponse.json({ error: 'Failed to fetch AI providers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth;
    const body = await request.json();
    const payload = aiProviderCreateSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid provider payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_expense_providers')
      .insert({ name: payload.data.name })
      .select('id, name, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This provider already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Failed to create AI provider:', error);
    return NextResponse.json({ error: 'Failed to create AI provider' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth;
    const body = await request.json();
    const payload = aiProviderUpdateSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid provider update payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_expense_providers')
      .update({ name: payload.data.name })
      .eq('id', payload.data.id)
      .eq('is_active', true)
      .select('id, name, is_active, created_at')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This provider already exists' }, { status: 409 });
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Provider was not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Failed to update AI provider:', error);
    return NextResponse.json({ error: 'Failed to update AI provider' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAiSpendingAccess();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth;
    const body = await request.json().catch(() => ({}));
    const payload = aiProviderDeleteSchema.safeParse(body);

    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid provider delete payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_expense_providers')
      .delete()
      .eq('id', payload.data.id)
      .eq('is_active', true)
      .select('id')
      .maybeSingle();

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'This provider cannot be deleted because it is used by existing expense entries' },
          { status: 409 }
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: 'Provider was not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete AI provider:', error);
    return NextResponse.json({ error: 'Failed to delete AI provider' }, { status: 500 });
  }
}
