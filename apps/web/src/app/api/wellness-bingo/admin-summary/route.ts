import { NextResponse } from 'next/server';
import {
  buildBingoAdminCycleSnapshot,
  getAuthedSupabase,
  getBingoAdminClient,
} from '../_lib';

export async function GET(request: Request) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');
    const data = await buildBingoAdminCycleSnapshot(getBingoAdminClient(), cycleId);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/wellness-bingo/admin-summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
