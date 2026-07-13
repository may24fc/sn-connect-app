import {
  getRevenueForecastAuthedContext,
  hasRevenueForecastAccess,
} from '@/app/api/revenue-forecast/_lib';
import { revenueForecastEntryUpsertSchema } from '@/lib/schemas/revenue-forecast.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasRevenueForecastAccess(auth.context.role, auth.context.hasGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = yearQuerySchema.safeParse({
      year: request.nextUrl.searchParams.get('year') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid year query parameter' }, { status: 400 });
    }

    const year = parsed.data.year;
    let query = auth.context.supabaseAdmin
      .from('sfo_revenue_entries')
      .select(
        'id, year, month, actual_revenue_aud, notes, created_by, updated_by, created_at, updated_at'
      )
      .is('deleted_at', null)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (typeof year === 'number') {
      query = query.eq('year', year);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch revenue entries:', error);
      return NextResponse.json({ error: 'Failed to fetch revenue entries' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/revenue-forecast/entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasRevenueForecastAccess(auth.context.role, auth.context.hasGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = revenueForecastEntryUpsertSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await auth.context.supabaseAdmin
      .from('sfo_revenue_entries')
      .select('id')
      .eq('year', payload.year)
      .eq('month', payload.month)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingError) {
      console.error('Failed to check existing revenue entry:', existingError);
      return NextResponse.json({ error: 'Failed to upsert revenue entry' }, { status: 500 });
    }

    if (existing?.id) {
      const { error: updateError } = await auth.context.supabaseAdmin
        .from('sfo_revenue_entries')
        .update({
          actual_revenue_aud: payload.actualRevenueAud,
          notes: payload.notes ?? null,
          updated_by: auth.context.user.id,
          updated_at: now,
        })
        .eq('id', existing.id)
        .is('deleted_at', null);

      if (updateError) {
        console.error('Failed to update revenue entry:', updateError);
        return NextResponse.json({ error: 'Failed to update revenue entry' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await auth.context.supabaseAdmin
        .from('sfo_revenue_entries')
        .insert({
          year: payload.year,
          month: payload.month,
          actual_revenue_aud: payload.actualRevenueAud,
          notes: payload.notes ?? null,
          created_by: auth.context.user.id,
          updated_by: auth.context.user.id,
          updated_at: now,
        });

      if (insertError) {
        console.error('Failed to create revenue entry:', insertError);
        return NextResponse.json({ error: 'Failed to create revenue entry' }, { status: 500 });
      }
    }

    const { data: entries, error: listError } = await auth.context.supabaseAdmin
      .from('sfo_revenue_entries')
      .select(
        'id, year, month, actual_revenue_aud, notes, created_by, updated_by, created_at, updated_at'
      )
      .is('deleted_at', null)
      .eq('year', payload.year)
      .order('month', { ascending: true });

    if (listError) {
      console.error('Failed to reload revenue entries:', listError);
      return NextResponse.json({ error: 'Failed to reload revenue entries' }, { status: 500 });
    }

    return NextResponse.json({ data: entries ?? [] });
  } catch (error) {
    console.error('Unexpected error in POST /api/revenue-forecast/entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
