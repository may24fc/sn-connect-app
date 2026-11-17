import { NextResponse } from 'next/server';
import {
  ChristmasTreeRequestError,
  buildChristmasTreeSnapshot,
  drawChristmasExchangeGiftPartner,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
} from '../_lib';

export async function POST() {
  try {
    const { user, role } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = getChristmasTreeAdminClient();
    await drawChristmasExchangeGiftPartner(adminClient, user.id);
    const data = await buildChristmasTreeSnapshot(adminClient, user.id, role);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof ChristmasTreeRequestError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status }
    );
  }
}
