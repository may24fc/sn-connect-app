import {
  getRevenueForecastAuthedContext,
  hasRevenueForecastAccess,
  isRevenueForecastAdmin,
} from '@/app/api/revenue-forecast/_lib';
import { revenueForecastEntryUpdateSchema } from '@/lib/schemas/revenue-forecast.schema';
import { type NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!hasRevenueForecastAccess(auth.context.role, auth.context.hasGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = revenueForecastEntryUpdateSchema.safeParse(
      await request.json().catch(() => ({}))
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.actualRevenueAud === undefined && payload.notes === undefined) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const { id } = await params;

    const { error } = await auth.context.supabaseAdmin
      .from('sfo_revenue_entries')
      .update({
        ...(payload.actualRevenueAud !== undefined
          ? { actual_revenue_aud: payload.actualRevenueAud }
          : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes ?? null } : {}),
        updated_by: auth.context.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to update revenue entry:', error);
      return NextResponse.json({ error: 'Failed to update revenue entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/revenue-forecast/entries/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isRevenueForecastAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const deletedAt = new Date().toISOString();

    const { error } = await auth.context.supabaseAdmin
      .from('sfo_revenue_entries')
      .update({ deleted_at: deletedAt, updated_at: deletedAt, updated_by: auth.context.user.id })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to delete revenue entry:', error);
      return NextResponse.json({ error: 'Failed to delete revenue entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/revenue-forecast/entries/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
