import { christmasWishUpsertSchema } from '@/lib/schemas/christmas-tree.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ChristmasTreeRequestError,
  buildChristmasTreeSnapshot,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
  upsertChristmasWish,
} from '../_lib';

export async function PUT(request: NextRequest) {
  try {
    const { user } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasWishUpsertSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );

    const adminClient = getChristmasTreeAdminClient();
    await upsertChristmasWish(
      adminClient,
      user.id,
      parsed.data.category,
      parsed.data.itemNumber,
      parsed.data.content
    );
    return NextResponse.json({ data: await buildChristmasTreeSnapshot(adminClient, user.id) });
  } catch (error) {
    const status = error instanceof ChristmasTreeRequestError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status }
    );
  }
}
