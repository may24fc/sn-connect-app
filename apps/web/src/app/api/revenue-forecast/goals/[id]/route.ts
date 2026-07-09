import {
  getRevenueForecastAuthedContext,
  isRevenueForecastAdmin,
} from '@/app/api/revenue-forecast/_lib';
import { type NextRequest, NextResponse } from 'next/server';

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
      .from('sfo_revenue_goals')
      .update({ deleted_at: deletedAt, updated_at: deletedAt, updated_by: auth.context.user.id })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to delete revenue goal:', error);
      return NextResponse.json({ error: 'Failed to delete revenue goal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/revenue-forecast/goals/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
