import { NextResponse } from 'next/server';
import {
  buildChristmasTreeSnapshot,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
} from '../_lib';

export async function GET() {
  try {
    const { user } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await buildChristmasTreeSnapshot(getChristmasTreeAdminClient(), user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
