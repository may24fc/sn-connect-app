import { NextResponse } from 'next/server';
import { fetchPartnerOptions, getAuthedSupabase, getBingoAdminClient, resolveActiveCycle } from '../_lib';

export async function GET() {
  try {
    const { user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = getBingoAdminClient();
    const cycle = await resolveActiveCycle(adminClient);

    if (!cycle) {
      return NextResponse.json({ error: 'No active wellness bingo cycle is configured' }, { status: 404 });
    }

    const data = await fetchPartnerOptions(adminClient, cycle.id, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/wellness-bingo/partners:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}