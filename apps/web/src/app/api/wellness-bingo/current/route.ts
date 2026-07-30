import { NextResponse } from 'next/server';
import { buildWellnessBingoSnapshot, getAuthedSupabase, getBingoAdminClient } from '../_lib';

export async function GET() {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await buildWellnessBingoSnapshot(getBingoAdminClient(), user.id, role);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/wellness-bingo/current:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}